import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      },
      spacing: {
        'density-xs': 'max(0px, calc(var(--spacing) - 0.375rem))',
        'density-sm': 'max(0px, calc(var(--spacing) - 0.25rem))',
        'density-md': 'var(--spacing)',
        'density-lg': 'calc(var(--spacing) + 0.25rem)',
        'density-xl': 'calc(var(--spacing) + 0.75rem)',
      },
      boxShadow: {
        'retool-sm': 'var(--shadow-retool-sm)',
        'retool-lg': 'var(--shadow-retool-lg)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
}
