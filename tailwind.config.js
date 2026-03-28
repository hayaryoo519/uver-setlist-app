/** @type {import('tailwindcss').Config} */
export default {
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
            },
            keyframes: {
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'highlight-pulse': {
                    '0%, 100%': { backgroundColor: 'transparent' },
                    '50%': { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
                }
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
            }
        },
    },
    plugins: [],
}
