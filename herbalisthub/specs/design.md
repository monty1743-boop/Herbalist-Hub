# Design System Specification - HerbalistHub

## Tech Stack
- **Framework:** Next.js 14 + TypeScript
- **Styling:** Tailwind CSS + CSS Variables
- **Components:** shadcn/ui as base
- **Icons:** Lucide React
- **Fonts:** Inter (primary), optional herb-themed accent font

## Design Philosophy
Natural, professional, and herbalist-focused design that feels trustworthy and calming while maintaining modern usability standards.

## Color Palette

### Primary Colors (Earth & Green Tones)
```css
:root {
  /* Primary - Sage Green */
  --primary: 142 69% 58%;           /* #7fb069 */
  --primary-foreground: 0 0% 100%;  /* white text on primary */
  
  /* Secondary - Warm Earth */
  --secondary: 35 25% 85%;          /* #e8dcc0 */
  --secondary-foreground: 20 14% 25%; /* dark brown text */
  
  /* Accent - Deep Forest */
  --accent: 120 25% 35%;            /* #4a6741 */
  --accent-foreground: 0 0% 100%;   /* white text */
}
```

### Neutral Colors
```css
:root {
  /* Background & Surface */
  --background: 45 25% 98%;         /* #faf9f7 - warm white */
  --foreground: 20 14% 15%;         /* #2c251f - dark brown */
  
  --card: 0 0% 100%;                /* pure white cards */
  --card-foreground: 20 14% 15%;    /* dark brown text */
  
  --muted: 35 15% 90%;              /* #e6e0d4 - light beige */
  --muted-foreground: 20 14% 45%;   /* medium brown */
  
  /* Borders & Inputs */
  --border: 35 15% 85%;             /* #ddd4c7 */
  --input: 35 15% 85%;              /* same as border */
  --ring: 142 69% 58%;              /* primary for focus rings */
}
```

### Semantic Colors
```css
:root {
  /* Status Colors */
  --success: 142 76% 36%;           /* #16a34a - forest green */
  --warning: 45 93% 47%;            /* #eab308 - golden yellow */
  --error: 0 84% 60%;               /* #ef4444 - warm red */
  --info: 217 91% 60%;              /* #3b82f6 - soft blue */
  
  /* With foreground variants */
  --success-foreground: 0 0% 100%;
  --warning-foreground: 20 14% 15%;
  --error-foreground: 0 0% 100%;
  --info-foreground: 0 0% 100%;
}
```

### Dark Mode Support
```css
[data-theme="dark"] {
  --background: 20 14% 8%;          /* #1a1512 */
  --foreground: 45 25% 90%;         /* #e6e0d4 */
  
  --card: 20 14% 12%;               /* #241e18 */
  --card-foreground: 45 25% 90%;    /* #e6e0d4 */
  
  --primary: 142 69% 45%;           /* darker sage */
  --secondary: 35 15% 20%;          /* darker earth tone */
  --accent: 120 25% 55%;            /* lighter forest for contrast */
  
  --muted: 20 14% 20%;              /* #332b23 */
  --muted-foreground: 45 15% 60%;   /* #9a8f7e */
  
  --border: 20 14% 25%;             /* #3d342a */
  --input: 20 14% 25%;              /* same as border */
}
```

## Typography Scale

### Font Configuration
```javascript
// tailwind.config.js
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
        display: ["Inter", ...fontFamily.sans], // Could add herb-themed font
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
};
```

### Text Styles
```css
/* Headings */
.text-display {
  @apply text-4xl font-bold tracking-tight text-foreground;
}

.text-headline {
  @apply text-3xl font-semibold tracking-tight text-foreground;
}

.text-title {
  @apply text-xl font-semibold text-foreground;
}

.text-subtitle {
  @apply text-lg font-medium text-foreground;
}

/* Body Text */
.text-body {
  @apply text-base text-foreground leading-relaxed;
}

.text-body-sm {
  @apply text-sm text-muted-foreground leading-relaxed;
}

.text-caption {
  @apply text-xs text-muted-foreground uppercase tracking-wider;
}
```

## Spacing & Layout

### Spacing Scale
```javascript
// tailwind.config.js spacing customization
spacing: {
  '18': '4.5rem',   // 72px
  '88': '22rem',    // 352px
  '100': '25rem',   // 400px
  '112': '28rem',   // 448px
  '128': '32rem',   // 512px
}
```

### Layout Patterns
```css
/* Container Sizes */
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }

/* Grid Templates */
.grid-dashboard {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6;
}

.grid-cards {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4;
}

.grid-form {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}
```

## Component Styling

### Button Variants
```css
/* Primary Button */
.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90 
         px-4 py-2 rounded-md font-medium transition-colors
         focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-secondary text-secondary-foreground hover:bg-secondary/80
         px-4 py-2 rounded-md font-medium transition-colors
         focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2;
}

/* Outline Button */
.btn-outline {
  @apply border border-input bg-background hover:bg-accent hover:text-accent-foreground
         px-4 py-2 rounded-md font-medium transition-colors
         focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2;
}
```

### Card Styles
```css
.card {
  @apply bg-card text-card-foreground rounded-lg border shadow-sm p-6;
}

.card-header {
  @apply flex flex-col space-y-1.5 pb-4;
}

.card-title {
  @apply text-title;
}

.card-description {
  @apply text-sm text-muted-foreground;
}

.card-content {
  @apply pt-0;
}

.card-footer {
  @apply flex items-center pt-4;
}
```

### Form Elements
```css
.form-input {
  @apply flex h-10 w-full rounded-md border border-input bg-background 
         px-3 py-2 text-sm ring-offset-background
         placeholder:text-muted-foreground
         focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
         disabled:cursor-not-allowed disabled:opacity-50;
}

.form-label {
  @apply text-sm font-medium leading-none text-foreground
         peer-disabled:cursor-not-allowed peer-disabled:opacity-70;
}

.form-error {
  @apply text-sm text-error font-medium;
}
```

## Icons & Imagery

### Icon System
- **Library:** Lucide React
- **Size Scale:** 16px, 20px, 24px, 32px, 48px
- **Usage:** Consistent icon usage for actions, status, navigation

### Illustration Style
- **Nature-inspired:** Botanical illustrations, leaf patterns
- **Color palette:** Muted greens and earth tones
- **Style:** Simple, clean line art with minimal detail

## Responsive Breakpoints

```javascript
// tailwind.config.js
screens: {
  'xs': '475px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}
```

## Animation & Transitions

```css
/* Smooth transitions */
.transition-smooth {
  @apply transition-all duration-200 ease-in-out;
}

/* Loading animations */
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Micro-interactions */
.hover-lift {
  @apply transition-transform hover:scale-105;
}

.hover-glow {
  @apply transition-shadow hover:shadow-lg;
}
```

## Accessibility Guidelines

### Color Contrast
- Text contrast ratio: minimum 4.5:1 (WCAG AA)
- Large text contrast ratio: minimum 3:1
- Interactive elements: minimum 3:1 against background

### Focus States
- Visible focus indicators on all interactive elements
- Focus ring color uses primary color
- Focus ring offset for visual separation

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  .transition-smooth {
    transition: none;
  }
  
  .animate-pulse-slow {
    animation: none;
  }
}
```