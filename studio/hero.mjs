import { heroui } from '@heroui/react';

export default heroui({
  themes: {
    dark: {
      colors: {
        primary: { DEFAULT: '#ff0844', foreground: '#ffffff' },
        focus: '#ff0844',
        background: '#0a0a0c',
        foreground: '#e4e4e7',
        content1: '#111113',
        content2: '#18181b',
        content3: '#27272a',
        content4: '#3f3f46',
      },
    },
  },
  defaultTheme: 'dark',
  defaultExtendTheme: 'dark',
  layout: {
    radius: { small: '8px', medium: '10px', large: '12px' },
  },
});
