/** Uses the user-supplied LifeLink brand artwork stored in project-managed storage. */
export const LIFELINK_OFFICIAL_LOGO_URL = "/assets/branding/lifelink-logo-lockup.png";
export const LIFELINK_OFFICIAL_LOGO_SYMBOL_URL = "/assets/branding/lifelink-logo-symbol.png";
export const LIFELINK_FULL_LOGO_PRESENTATION_CLASS = 'lifelink-logo-full';

type LifeLinkLogoProps = {
  className?: string;
  variant?: 'full' | 'symbol';
  style?: React.CSSProperties;
};

export function LifeLinkLogo({ className = '', variant = 'full', style }: LifeLinkLogoProps) {
  const logoSource = variant === 'full' ? LIFELINK_OFFICIAL_LOGO_URL : LIFELINK_OFFICIAL_LOGO_SYMBOL_URL;

  return (
    <span style={style} className={`lifelink-logo-crop lifelink-logo-${variant} ${variant === 'full' ? LIFELINK_FULL_LOGO_PRESENTATION_CLASS : ''} ${className}`}>
      <img
        className="lifelink-logo"
        src={logoSource}
        alt={variant === 'full' ? 'LifeLink — Smart Healthcare Assistance Platform' : 'LifeLink'}
      />
    </span>
  );
}
