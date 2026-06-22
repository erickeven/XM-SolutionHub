import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07111F',
          900: '#0B1F36',
        },
        copper: {
          500: '#B7791F',
        },
      },
    },
  },
  plugins: [],
};

export default config;