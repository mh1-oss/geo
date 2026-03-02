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
                primary: '#0d7ff2',
                'background-light': '#f0f4f8',
                'background-dark': '#0a0f14',
                'surface-dark': '#182634',
            },
            fontFamily: {
                display: ['"Noto Sans"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
