import { LifeLinkLogo } from './LifeLinkLogo';                                                 // Base logo component

type LifeLinkMarkProps = {
  size?: 'sm' | 'md' | 'lg';                                                                    // Responsive size tokens
  className?: string;                                                                           // Extra classes
};

// =========================================================================================
// LIFELINK COMPACT BRAND EMBLEM MARK
// Renders the iconographic brand symbol for navigation sidebars, headers, and favicons.
// =========================================================================================
export function LifeLinkMark({ size = 'md', className = '' }: LifeLinkMarkProps) {
  return (
    <LifeLinkLogo variant="symbol" className={`lifelink-mark lifelink-mark-${size} ${className}`} /> // Compact emblem variant
  );
}
