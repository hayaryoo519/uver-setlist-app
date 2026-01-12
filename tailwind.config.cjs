/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bg-color': '#0c0c0c',
                'text-color': '#f0f0f0',
                'primary-color': '#d4af37',
                'secondary-color': '#b91c1c',
                'accent-color': '#fbbf24',
                'card-bg': '#1a1a1a',
            },
            fontFamily: {
                'oswald': ['Oswald', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
