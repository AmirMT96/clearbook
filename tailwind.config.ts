import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#001e40',
          50: '#e6ebf0',
          100: '#b3c1d1',
          500: '#1a3558',
          900: '#001e40',
        },
        accent: {
          DEFAULT: '#4ECBA0',
          50: '#e7f8f1',
          100: '#b9ecd6',
          500: '#4ECBA0',
          600: '#3eab86',
        },
        bg: '#f8f9fa',
        surface: '#ffffff',
        muted: '#6b7280',
        border: '#e5e7eb',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,30,64,0.06), 0 1px 2px rgba(0,30,64,0.04)',
        lifted: '0 10px 30px rgba(0,30,64,0.08)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
export default config;
