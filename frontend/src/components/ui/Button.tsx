import React from 'react';                                                                // Core React engine

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';                                     // Visual style variants
  size?: 'sm' | 'md' | 'lg';                                                                    // Size presets
}

// =========================================================================================
// REUSABLE INTERACTIVE BUTTON COMPONENT
// Standardized touch and click target with smooth hover micro-animations and variant styles.
// =========================================================================================
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', style, ...props }) => {
  let sizeStyle: React.CSSProperties = {};
  if (size === 'sm') {
    sizeStyle = { padding: '6px 12px', fontSize: 'var(--text-caption)' };                      // Compact size
  } else if (size === 'lg') {
    sizeStyle = { padding: '14px 28px', fontSize: '16px' };                                     // Large CTA size
  }

  return (
    <button className={`btn btn-${variant} ${className}`} style={{ ...sizeStyle, ...style }} {...props}>
      {props.children}
    </button>
  );
};
