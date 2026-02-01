import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        claude: {
          bg: 'var(--claude-bg)',
          surface: 'var(--claude-surface)',
          accent: 'var(--claude-accent)',
          text: 'var(--claude-text)',
          muted: 'var(--claude-muted)',
          border: 'var(--claude-border)',
          user: 'var(--claude-user)',
          assistant: 'var(--claude-assistant)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
