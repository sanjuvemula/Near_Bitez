/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // We are adding a premium modern font
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // Custom branding colors (Rich Tomato & Saffron)
        brand: {
          50: '#fff5f0',
          100: '#ffe8db',
          500: '#f05a28', // The main NearBites Orange/Red
          600: '#d9491d',
          900: '#7a230c',
        },
        surface: '#fcfbfa', // A very warm, expensive-looking off-white

        /**
         * Semantic theme tokens.
         *
         * Backed by CSS variables defined in index.css, so a single `dark`
         * class on <html> re-themes every surface without each component
         * carrying a parallel set of `dark:` classes.
         *
         * Depth order: page -> surface -> card -> raised
         */
        page: 'rgb(var(--nb-page) / <alpha-value>)',
        card: 'rgb(var(--nb-card) / <alpha-value>)',
        raised: 'rgb(var(--nb-raised) / <alpha-value>)',
        sunken: 'rgb(var(--nb-sunken) / <alpha-value>)',
        line: 'rgb(var(--nb-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--nb-line-strong) / <alpha-value>)',
        heading: 'rgb(var(--nb-heading) / <alpha-value>)',
        body: 'rgb(var(--nb-body) / <alpha-value>)',
        muted: 'rgb(var(--nb-muted) / <alpha-value>)',
        faint: 'rgb(var(--nb-faint) / <alpha-value>)',
        accent: 'rgb(var(--nb-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--nb-accent-soft) / <alpha-value>)',
        'accent-text': 'rgb(var(--nb-accent-text) / <alpha-value>)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
        'glow': '0 10px 40px -10px rgba(240, 90, 40, 0.4)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}