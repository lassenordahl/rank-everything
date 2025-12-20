import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-20px) translateX(15px) rotate(5deg)' },
          '50%': { transform: 'translateY(-10px) translateX(-10px) rotate(-3deg)' },
          '75%': { transform: 'translateY(-25px) translateX(5px) rotate(3deg)' },
        },
      },
      animation: {
        float: 'float 20s ease-in-out infinite',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Simple black and white theme
        background: '#ffffff',
        foreground: '#000000',
        border: '#000000',
        muted: '#666666',
      },
    },
  },
  plugins: [],
};

export default config;
