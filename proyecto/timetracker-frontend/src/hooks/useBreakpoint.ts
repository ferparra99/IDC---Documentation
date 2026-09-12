import { useEffect, useState } from 'react';
import { BREAKPOINTS, Breakpoint } from '../styles/breakpoints';

function getBP(): Breakpoint {
  const w = window.innerWidth;
  if (w >= BREAKPOINTS.desktop) return 'desktop';
  if (w >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => typeof window !== 'undefined' ? getBP() : 'desktop');
  useEffect(() => {
    const onResize = () => setBp(getBP());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}
