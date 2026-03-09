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
                primary: '#3b82f6', // Rich, vibrant blue
                'primary-dark': '#2563eb',
                'background-light': '#f8fafc',
                'background-dark': '#0f172a', // Deep slate for a rich premium background
                'surface-light': '#ffffff',
                'surface-dark': '#1e293b', // Deep blue slate for cards
            },
            fontFamily: {
                display: ['"Inter"', 'sans-serif'], // Professional, clean font
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'glow-primary': '0 0 20px rgba(59, 130, 246, 0.4)',
                'glow-success': '0 0 20px rgba(34, 197, 94, 0.4)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'dash-move': 'dash 1.5s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                dash: {
                    to: { strokeDashoffset: '-8' }
                }
            }
        },
    },
    plugins: [],
}
