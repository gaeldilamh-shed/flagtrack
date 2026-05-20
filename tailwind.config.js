/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0B0B0D',
        'bg-2': '#111114',
        surface: '#15151A',
        'surface-2': '#1B1B22',
        'surface-3': '#22222B',
        border: '#26262F',
        'border-soft': '#1E1E26',
        'text-main': '#F5F5F7',
        'text-dim': '#A8A8B3',
        'text-mute': '#6F6F7A',
        red: {
          DEFAULT: '#E11D2A',
          hover: '#FF2E3D',
          soft: 'rgba(225, 29, 42, 0.12)',
        },
        green: '#2DD17C',
        amber: '#F5A524',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'lg': '20px',
        'md': '14px',
        'sm': '10px',
      },
    },
  },
  plugins: [],
}
