// Tailwind 3.4 mapped to the shared ms-tokens.css v1.0 (padrao-projetos, Appendix A.3).
// Prerequisite: styles/ms-tokens.css is imported first in index.css, before the @tailwind directives.
//
// Colours, weights, radii and shadows REPLACE the defaults, so only system values exist. Tailwind v3
// drops unknown classes silently: after editing, grep for default palette names (slate, amber, cyan...).
// Colours are CSS variables, so opacity modifiers (`bg-accent/20`) do NOT work: use the `*-subtle` tokens.
const v = (name) => `var(--ms-${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      canvas: { DEFAULT: v('bg'), subtle: v('bg-subtle') },
      surface: { DEFAULT: v('surface'), raised: v('surface-raised') },
      fg: {
        DEFAULT: v('text'),
        secondary: v('text-secondary'),
        tertiary: v('text-tertiary'),
        disabled: v('text-disabled'),
        'on-accent': v('text-on-accent'),
        'on-solid': v('text-on-solid')
      },
      line: {
        DEFAULT: v('border'),
        strong: v('border-strong'),
        control: v('border-control'),
        'control-hover': v('border-control-hover')
      },
      accent: {
        DEFAULT: v('accent'),
        hover: v('accent-hover'),
        pressed: v('accent-pressed'),
        subtle: v('accent-subtle')
      },
      positive: { DEFAULT: v('positive'), subtle: v('positive-subtle') },
      warning: { DEFAULT: v('warning'), subtle: v('warning-subtle') },
      danger: { DEFAULT: v('danger'), hover: v('danger-hover'), subtle: v('danger-subtle') },
      info: { DEFAULT: v('info'), subtle: v('info-subtle') }
    },
    fontFamily: {
      sans: v('font-sans'),
      mono: v('font-mono')
    },
    fontWeight: {
      normal: v('weight-regular'),
      medium: v('weight-medium'),
      semibold: v('weight-semibold'),
      bold: v('weight-bold')
    },
    borderRadius: {
      none: '0',
      xs: v('radius-xs'),
      DEFAULT: v('radius-control'),
      control: v('radius-control'),
      card: v('radius-card'),
      feature: v('radius-feature'),
      full: v('radius-pill')
    },
    boxShadow: {
      none: 'none',
      sm: v('shadow-sm'),
      md: v('shadow-md'),
      lg: v('shadow-lg')
    },
    extend: {
      borderColor: { DEFAULT: v('border') },
      ringColor: { DEFAULT: v('focus-color') },
      ringOffsetColor: { DEFAULT: v('bg') },
      fontSize: {
        micro: [v('text-micro'), { lineHeight: v('text-micro--line-height') }],
        fine: [v('text-fine'), { lineHeight: v('text-fine--line-height') }],
        caption: [v('text-caption'), { lineHeight: v('text-caption--line-height') }],
        small: [v('text-small'), { lineHeight: v('text-small--line-height') }],
        body: [v('text-body'), { lineHeight: v('text-body--line-height') }],
        lead: [v('text-lead'), { lineHeight: v('text-lead--line-height') }],
        h4: [
          v('text-h4'),
          { lineHeight: v('text-h4--line-height'), letterSpacing: v('tracking-tight'), fontWeight: '600' }
        ],
        h3: [
          v('text-h3'),
          { lineHeight: v('text-h3--line-height'), letterSpacing: v('tracking-tight'), fontWeight: '600' }
        ],
        h2: [
          v('text-h2'),
          { lineHeight: v('text-h2--line-height'), letterSpacing: v('tracking-heading'), fontWeight: '600' }
        ],
        h1: [
          v('text-h1'),
          { lineHeight: v('text-h1--line-height'), letterSpacing: v('tracking-heading'), fontWeight: '700' }
        ],
        kpi: [
          v('text-kpi'),
          { lineHeight: v('text-kpi--line-height'), letterSpacing: v('tracking-tight'), fontWeight: '600' }
        ],
        display: [
          v('text-display'),
          {
            lineHeight: v('text-display--line-height'),
            letterSpacing: v('tracking-display'),
            fontWeight: '700'
          }
        ]
      },
      letterSpacing: {
        display: v('tracking-display'),
        heading: v('tracking-heading'),
        tight: v('tracking-tight')
      },
      maxWidth: {
        layout: v('layout-max'),
        'layout-wide': v('layout-max-wide'),
        measure: v('measure')
      },
      height: {
        header: v('header-height'),
        control: v('control-height'),
        'control-dense': v('control-height-dense')
      },
      minHeight: {
        control: v('control-height'),
        'control-dense': v('control-height-dense')
      },
      padding: {
        gutter: v('layout-padding')
      },
      transitionTimingFunction: {
        creative: v('ease-creative'),
        exit: v('ease-exit')
      },
      transitionDuration: {
        micro: v('duration-micro'),
        exit: v('duration-exit'),
        reveal: v('duration-reveal')
      },
      zIndex: {
        sticky: v('z-sticky'),
        header: v('z-header'),
        dropdown: v('z-dropdown'),
        modal: v('z-modal')
      },
      outlineOffset: {
        focus: v('focus-offset')
      }
    }
  },
  plugins: []
};
