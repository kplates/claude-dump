import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        claude: {
          bg: '#1a1a2e',
          surface: '#16213e',
          accent: '#e94560',
          text: '#eaeaea',
          muted: '#8892b0',
          border: '#2a2a4a',
          user: '#0f3460',
          assistant: '#1a1a3e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
