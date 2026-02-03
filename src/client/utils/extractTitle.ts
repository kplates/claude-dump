/**
 * Extracts a clean, readable title from a chat's first prompt.
 *
 * Strategies:
 * 1. If the text starts with a common action verb, extract that phrase
 * 2. Extract the first sentence (up to . ? or newline)
 * 3. Fall back to truncating at word boundary
 */

const ACTION_VERBS = [
  'add', 'fix', 'update', 'implement', 'create', 'remove', 'delete', 'change',
  'refactor', 'improve', 'optimize', 'build', 'make', 'write', 'debug', 'test',
  'check', 'review', 'help', 'explain', 'show', 'find', 'search', 'move',
  'rename', 'convert', 'migrate', 'setup', 'configure', 'install', 'run',
];

const MAX_TITLE_LENGTH = 60;

export function extractTitle(text: string | undefined | null, maxLength = MAX_TITLE_LENGTH): string {
  if (!text) return 'Untitled';

  // Clean up the text - remove leading whitespace and normalize
  let cleaned = text.trim().replace(/\s+/g, ' ');

  // Remove common prefixes like "can you", "please", "I want to", etc.
  cleaned = cleaned
    .replace(/^(can you|could you|please|i want to|i need to|i'd like to|let's|we need to|we should|help me)\s+/i, '')
    .trim();

  // Try to find the first sentence
  const sentenceEnd = cleaned.search(/[.?!\n]/);
  if (sentenceEnd > 0 && sentenceEnd <= maxLength) {
    return capitalize(cleaned.slice(0, sentenceEnd).trim());
  }

  // If starts with action verb, try to extract meaningful phrase
  const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase();
  if (firstWord && ACTION_VERBS.includes(firstWord)) {
    // Extract until we hit a conjunction, preposition phrase, or max length
    const stopPattern = /\s+(so that|because|since|when|if|but|and then|after|before)\s/i;
    const stopMatch = cleaned.search(stopPattern);
    if (stopMatch > 0 && stopMatch <= maxLength) {
      return capitalize(cleaned.slice(0, stopMatch).trim());
    }
  }

  // Truncate at word boundary
  if (cleaned.length <= maxLength) {
    return capitalize(cleaned);
  }

  // Find last space before max length
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return capitalize(truncated.slice(0, lastSpace).trim()) + '…';
  }

  return capitalize(truncated.trim()) + '…';
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
