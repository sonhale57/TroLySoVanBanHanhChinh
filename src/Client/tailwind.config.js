/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Nunito Sans"', 'sans-serif'],
        serif: ['"Nunito Sans"', 'sans-serif'],
      },
      colors: {
        gov: {
          primary: '#BA1C1D',
          'primary-dark': '#8F1213',
          'primary-light': '#FDE8E8',
          gold: '#C69214',
          'gold-light': '#FEF7E6',
          bg: '#F4F6F9',
          surface: '#FFFFFF',
          border: '#DCE2E8',
          subtle: '#EBEFF3',
          text: '#1C252E',
          'text-secondary': '#516173',
          'text-disabled': '#8E9EAF',
          active: '#137333',
          'active-bg': '#EAF7EE',
          'active-border': '#8CE0A2',
          warning: '#B06000',
          'warning-bg': '#FEF3D6',
          'warning-border': '#F8D072',
          danger: '#C5221F',
          'danger-bg': '#FCE8E6',
          'danger-border': '#F5A39B',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        elevation: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
