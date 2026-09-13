/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          activity: '#181818',
          sidebar: '#1e1e1e',
          editor: '#1f1f1f',
          tabs: '#181818',
          tabActive: '#1f1f1f',
          panel: '#181818',
          status: '#007acc',
          elevated: '#252526',
          border: '#2b2b2b',
          focus: '#007acc',
          text: '#cccccc',
          muted: '#858585',
          dim: '#5a5a5a',
          blue: '#007acc',
          blueHover: '#0e639c',
          green: '#4ec9b0',
          amber: '#cca700',
          red: '#f14c4c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      fontSize: {
        'ide-xs': ['10px', '14px'],
        'ide-sm': ['11px', '15px'],
        'ide-base': ['12px', '16px'],
        'ide-md': ['13px', '18px'],
        'ide-code': ['14px', '21px'],
      }
    }
  },
  plugins: []
};
