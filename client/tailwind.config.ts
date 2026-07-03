import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07111F',
          900: '#0B1F36',
          800: '#102A45',
        },
        copper: {
          400: '#D6A04C',
          500: '#B7791F',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        page: '1280px',
        wide: '1440px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06)',
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        popover: '0 12px 32px rgba(15, 23, 42, 0.18)',
      },
      screens: {
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
