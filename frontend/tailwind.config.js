/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dw: {
          bg: '#070B13',
          surface: '#0D1525',
          panel: '#131F37',
          border: '#1E2D4A',
          hover: '#24375A',
          cyan: '#00E5FF',
          blue: '#2979FF',
          accent: '#00B0FF',
          green: '#00E676',
          amber: '#FFB300',
          red: '#FF5252'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 229, 255, 0.3)',
        'glow-blue': '0 0 20px -5px rgba(41, 121, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
