/** @type {import('tailwindcss').Config} */

/**
 * ReedShield design tokens — Light Premium Enterprise Security theme.
 *
 * Warm-white grounds, charcoal type, hairline warm-gray borders, restrained
 * shadows, one controlled violet brand accent, and a four-level security
 * status palette (green / amber / orange / red) plus an occasional info blue.
 *
 * `gray` is a warm neutral (stone) so surfaces read warm-white, not cold. The
 * legacy token names (white, paper, ink, rule, accent, pencil, tab) are kept
 * so existing class usages keep resolving; only their values changed.
 */
const stone = {
  50:  '#FAFAF9',
  100: '#F5F5F4',
  200: '#E7E5E4',
  300: '#D6D3D1',
  400: '#A8A29E',
  500: '#78716C',
  600: '#57534E',
  700: '#44403C',
  800: '#292524',
  900: '#1C1917',
  950: '#0C0A09',
}

const violet = {
  50:  '#F5F3FF',
  100: '#EDE9FE',
  200: '#DDD6FE',
  300: '#C4B5FD',
  400: '#A78BFA',
  500: '#8B5CF6',
  600: '#7C3AED',   // brand accent
  700: '#6D28D9',
  800: '#5B21B6',
  900: '#4C1D95',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white:  '#FFFFFF',
        gray:   stone,
        accent: violet,
        paper: {
          DEFAULT: '#FAFAF9',   // page ground: warm off-white
          2:       '#F5F5F4',    // sidebar / subtle surface
          sheet:   '#FFFFFF',    // cards
        },
        ink: {
          DEFAULT: '#1C1917',
          2:       '#57534E',
          3:       '#78716C',
        },
        rule: {
          DEFAULT: '#E7E5E4',
          strong:  '#D6D3D1',
        },
        // Security status palette — Low green, Medium amber, High orange, Critical red.
        pencil: {
          green:  '#16A34A',
          amber:  '#D97706',
          orange: '#EA580C',
          red:    '#DC2626',
          blue:   '#0891B2',
        },
        status: {
          low:      '#16A34A',
          medium:   '#D97706',
          high:     '#EA580C',
          critical: '#DC2626',
          info:     '#0891B2',
        },
        // Retained so old references resolve; the new sidebar uses the brand accent instead.
        tab: {
          monitor:  '#7C3AED',
          discover: '#7C3AED',
          protect:  '#7C3AED',
          validate: '#7C3AED',
          comply:   '#7C3AED',
          platform: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'Inter', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"Fragment Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        xs:      '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        sm:      '0 1px 2px 0 rgba(28, 25, 23, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(28, 25, 23, 0.06), 0 1px 2px -1px rgba(28, 25, 23, 0.05)',
        md:      '0 4px 12px -2px rgba(28, 25, 23, 0.08), 0 2px 4px -2px rgba(28, 25, 23, 0.04)',
        lg:      '0 12px 28px -8px rgba(28, 25, 23, 0.12), 0 4px 8px -4px rgba(28, 25, 23, 0.06)',
        xl:      '0 24px 48px -12px rgba(28, 25, 23, 0.16)',
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
}
