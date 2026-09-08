/**
 * The compact brand treatment is a crop of the owner-supplied official LifeLink
 * artwork, never a generic emoji or synthetic healthcare symbol.
 */
import { LifeLinkLogo } from './LifeLinkLogo';

type LifeLinkMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function LifeLinkMark({ size = 'md', className = '' }: LifeLinkMarkProps) {
  return (
    <LifeLinkLogo variant="symbol" className={`lifelink-mark lifelink-mark-${size} ${className}`} />
  );
}
