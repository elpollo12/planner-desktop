/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Petrolera Moderna
        primary: {
          50: '#EEF4F9',
          100: '#D5E4F0',
          200: '#A8C8E0',
          300: '#7AABD0',
          400: '#4D8FC0',
          500: '#1E3A5F', // Principal
          600: '#1A3252',
          700: '#152A45',
          800: '#112238',
          900: '#0C1A2B',
        },
        secondary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316', // Naranja energía
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        surface: '#FFFFFF',
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
