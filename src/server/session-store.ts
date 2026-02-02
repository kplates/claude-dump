import fs from "fs/promises";
import path from "path";
import { homedir } from "os";
import { parseSessionFile, parseNewLines } from "./parser.js";
import type { ProjectInfo, SessionInfo, Turn } from "../shared/types.js";

const DEFAULT_PROJECTS_DIR = path.join(homedir(), ".claude", "projects");

interface SessionIndex {
  version: number;
  entries: SessionIndexEntry[];
  originalPath?: string;
}

interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

export class SessionStore {
  private projectsDir: string;
  private fileOffsets = new Map<string, number>();
  private cachedTurns = new Map<string, Turn[]>();

  constructor(projectsDir?: string) {
    this.projectsDir = projectsDir || DEFAULT_PROJECTS_DIR;
  }

  async getProjects(): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];

    try {
      const dirs = await fs.readdir(this.projectsDir);
      for (const dir of dirs) {
        const dirPath = path.join(this.projectsDir, dir);
        const stat = await fs.stat(dirPath).catch(() => null);
        if (!stat?.isDirectory()) continue;

        // Read index for metadata (originalPath, etc.)
        let originalPath: string | undefined;
        try {
          const raw = await fs.readFile(
            path.join(dirPath, "sessions-index.json"),
            "utf-8"
          );
          const index: SessionIndex = JSON.parse(raw);
          originalPath = index.originalPath;
        } catch {
          // Index missing or invalid
        }

        // Discover sessions from .jsonl files on disk
        let sessionCount = 0;
        let lastModified = "";
        try {
          const files = await fs.readdir(dirPath);
          for (const file of files) {
            if (!file.endsWith(".jsonl")) continue;
            sessionCount++;
            const fileStat = await fs
              .stat(path.join(dirPath, file))
              .catch(() => null);
            if (fileStat) {
              const mtime = fileStat.mtime.toISOString();
              if (!lastModified || mtime > lastModified) {
                lastModified = mtime;
              }
            }
          }
        } catch {
          // Can't read dir
        }

        if (sessionCount === 0) continue;

        projects.push({
          id: dir,
          path: originalPath || decodeProjectDir(dir),
          sessionCount,
          lastModified,
        });
      }
    } catch {
      // Projects dir doesn't exist
    }

    // Sort newest first
    projects.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    return projects;
  }

  async getSessions(projectId: string): Promise<SessionInfo[]> {
    const projectDir = path.join(this.projectsDir, projectId);

    // Build a lookup from the index for supplemental metadata
    const indexMap = new Map<string, SessionIndexEntry>();
    try {
      const raw = await fs.readFile(
        path.join(projectDir, "sessions-index.json"),
        "utf-8"
      );
      const index: SessionIndex = JSON.parse(raw);
      for (const entry of index.entries) {
        if (!entry.isSidechain) {
          indexMap.set(entry.sessionId, entry);
        }
      }
    } catch {
      // Index missing or invalid, that's fine — we'll discover from disk
    }

    // Discover sessions from .jsonl files on disk
    const sessions: SessionInfo[] = [];
    try {
      const files = await fs.readdir(projectDir);
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const sessionId = file.replace(".jsonl", "");
        const filePath = path.join(projectDir, file);
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat) continue;

        const indexed = indexMap.get(sessionId);
        const fileMtime = stat.mtime.toISOString();
        sessions.push({
          sessionId,
          projectId,
          firstPrompt: indexed?.firstPrompt || "",
          summary: indexed?.summary || "",
          messageCount: indexed?.messageCount || 0,
          created: indexed?.created || stat.birthtime.toISOString(),
          modified: fileMtime,
          gitBranch: indexed?.gitBranch || "",
        });
      }
    } catch {
      return [];
    }

    // Sort newest first
    sessions.sort((a, b) => b.modified.localeCompare(a.modified));
    return sessions;
  }

  async getSessionTurns(projectId: string, sessionId: string): Promise<Turn[]> {
    const filePath = path.join(this.projectsDir, projectId, `${sessionId}.jsonl`);

    try {
      const turns = await parseSessionFile(filePath);
      const stat = await fs.stat(filePath);
      this.fileOffsets.set(filePath, stat.size);
      this.cachedTurns.set(sessionId, turns);
      return turns;
    } catch {
      return [];
    }
  }

  async getNewTurns(projectId: string, sessionId: string): Promise<Turn[]> {
    const filePath = path.join(this.projectsDir, projectId, `${sessionId}.jsonl`);
    const lastOffset = this.fileOffsets.get(filePath) || 0;

    try {
      const stat = await fs.stat(filePath);
      if (stat.size <= lastOffset) return [];

      // Read only new content
      const fd = await fs.open(filePath, "r");
      const buffer = Buffer.alloc(stat.size - lastOffset);
      await fd.read(buffer, 0, buffer.length, lastOffset);
      await fd.close();

      const newContent = buffer.toString("utf-8");
      this.fileOffsets.set(filePath, stat.size);

      const newTurns = parseNewLines(newContent);

      // Update cache
      const cached = this.cachedTurns.get(sessionId) || [];
      this.cachedTurns.set(sessionId, [...cached, ...newTurns]);

      return newTurns;
    } catch {
      return [];
    }
  }

  getCachedTurnCount(sessionId: string): number | null {
    const cached = this.cachedTurns.get(sessionId);
    return cached ? cached.length : null;
  }

  getFilePathForSession(projectId: string, sessionId: string): string {
    return path.join(this.projectsDir, projectId, `${sessionId}.jsonl`);
  }

  getProjectsDir(): string {
    return this.projectsDir;
  }
}

function decodeProjectDir(dirName: string): string {
  return dirName.replace(/^-/, "/").replace(/-/g, "/");
}
