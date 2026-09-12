// Canonical asset paths for official LifeLink brand identity
export const LIFELINK_OFFICIAL_LOGO_URL = "/assets/branding/lifelink-logo-lockup.png";           // Full brand lockup logo
export const LIFELINK_OFFICIAL_LOGO_SYMBOL_URL = "/assets/branding/lifelink-logo-symbol.png";   // Compact symbol monogram
export const LIFELINK_FULL_LOGO_PRESENTATION_CLASS = 'lifelink-logo-full';                       // Presentation CSS class

type LifeLinkLogoProps = {
  className?: string;                                                                           // Optional styling classes
  variant?: 'full' | 'symbol';                                                                  // Full logo or compact mark
  style?: React.CSSProperties;                                                                  // Inline styles
};

// =========================================================================================
// LIFELINK OFFICIAL BRAND LOGO COMPONENT
// Renders the official brand artwork in either full lockup or compact emblem symbol format.
// =========================================================================================
export function LifeLinkLogo({ className = '', variant = 'full', style }: LifeLinkLogoProps) {
  const logoSource = variant === 'full' ? LIFELINK_OFFICIAL_LOGO_URL : LIFELINK_OFFICIAL_LOGO_SYMBOL_URL; // Resolve asset path

  return (
    <span style={style} className={`lifelink-logo-crop lifelink-logo-${variant} ${variant === 'full' ? LIFELINK_FULL_LOGO_PRESENTATION_CLASS : ''} ${className}`}>
      <img
        className="lifelink-logo"
        src={logoSource}                                                                        // Render logo image
        alt={variant === 'full' ? 'LifeLink — Smart Healthcare Assistance Platform' : 'LifeLink'}
      />
    </span>
  );
}
