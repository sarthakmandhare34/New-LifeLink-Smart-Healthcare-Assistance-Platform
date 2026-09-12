import React from 'react';                                                                // Core React engine

interface CardProps {
  children: React.ReactNode;                                                                    // Card child content
  className?: string;                                                                           // Extra classes
  variant?: 'default' | 'glass' | 'solid' | 'emergency';                                        // Surface treatment variants
  interactive?: boolean;                                                                        // Hover elevation flag
  selected?: boolean;                                                                           // Selected ring indicator
  style?: React.CSSProperties;                                                                  // Inline styles
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;                                      // Click callback
}

// =========================================================================================
// REUSABLE CARD CONTAINER COMPONENT
// Foundational visual container supporting liquid-glass, solid clinical, and emergency styles.
// Features full keyboard accessibility (Enter/Space triggers onClick when interactive).
// =========================================================================================
export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'glass',
  interactive = false,
  selected = false,
  style,
  onClick
}) => {
  let baseClass = 'glass-surface';                                                              // Default translucent glassmorphism
  if (variant === 'solid' || variant === 'default') {
    baseClass = 'solid-clinical-surface';                                                       // Opaque clinical surface
  } else if (variant === 'emergency') {
    baseClass = 'emergency-panel';                                                              // Urgent red-accented emergency surface
  }

  const isInteractive = interactive || Boolean(onClick);
  const interactiveClass = isInteractive ? 'interactive-surface' : '';
  const selectedClass = selected ? 'selected' : '';

  // Accessible keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (onClick) onClick(e as any);
    }
  };
  
  return (
    <div 
      className={`${baseClass} ${interactiveClass} ${selectedClass} ${className}`}
      style={style}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : undefined}                                                  // Focusable when clickable
      role={isInteractive ? 'button' : undefined}
    >
      {children}
    </div>
  );
};

// Reusable card header row
export const CardHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="card-header flex justify-between items-center">
    <h3 style={{ margin: 0 }}>{title}</h3>
    {action && <div>{action}</div>}
  </div>
);
