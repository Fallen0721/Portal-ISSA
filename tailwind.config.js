/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#005aa7',
                    light: '#337bb9', // Generated light shade
                    dark: '#003f75',  // Generated dark shade
                },
                accent: {
                    DEFAULT: '#de5b14',
                    light: '#e57c43', // Generated light shade
                    dark: '#9b400e',  // Generated dark shade
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
