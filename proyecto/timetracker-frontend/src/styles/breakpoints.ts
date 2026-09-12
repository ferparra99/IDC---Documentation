export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
