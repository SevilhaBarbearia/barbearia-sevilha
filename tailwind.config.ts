import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8eb',
          100: '#ffe7bf',
          500: '#c8902f',
          700: '#8a5c14',
          950: '#1c1510'
        }
      },
      boxShadow: {
        premium: '0 20px 80px rgba(0, 0, 0, 0.28)'
      }
    }
  },
  plugins: []
};

export default config;
