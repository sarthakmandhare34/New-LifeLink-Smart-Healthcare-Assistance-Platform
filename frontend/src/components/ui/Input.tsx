import React from 'react';                                                                // Core React engine

// =========================================================================================
// LIQUID-GLASS TEXT INPUT FIELD
// Form field input component incorporating subtle cyan borders, smooth focus rings,
// and accessible placeholder styling for high contrast readability.
// =========================================================================================
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, className = '', ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      background: 'transparent',                                                                // Transparent backdrop
      border: '1px solid transparent',
      borderRadius: 'var(--border-radius-input)',
      padding: '10px var(--spacing-3)',
      fontSize: 'var(--text-body)',
      color: 'var(--color-text)',
      width: '100%',
      outline: 'none',
      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    };

    return (
      <input
        ref={ref}
        style={{ ...baseStyle, ...style }}
        className={`liquid-input ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';                                                                    // React DevTools display name
