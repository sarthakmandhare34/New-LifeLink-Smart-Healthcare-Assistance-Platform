import React from 'react';                                                                // Core React engine

interface BentoGridProps {
  children: React.ReactNode;                                                                    // Grid items
  className?: string;                                                                           // Extra CSS classes
}

// =========================================================================================
// BENTO GRID WRAPPER
// CSS Grid container for modern responsive healthcare bento layouts.
// =========================================================================================
export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => (
  <div className={`bento-grid ${className}`}>
    {children}
  </div>
);

interface BentoItemProps {
  children: React.ReactNode;                                                                    // Item content
  colSpan?: 1 | 2 | 3 | 4;                                                                      // Column span multiplier
  rowSpan?: 1 | 2 | 3;                                                                          // Row span multiplier
  className?: string;                                                                           // Extra CSS classes
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;                                      // Click event callback
}

// =========================================================================================
// BENTO ITEM CELL
// Individual cell inside BentoGrid supporting responsive col/row spans and keyboard navigation.
// =========================================================================================
export const BentoItem: React.FC<BentoItemProps> = ({ 
  children, 
  colSpan = 1, 
  rowSpan = 1, 
  className = '',
  onClick
}) => {
  const colClass = `bento-col-span-${colSpan}`;                                                 // Column span class
  const rowClass = `bento-row-span-${rowSpan}`;                                                 // Row span class
  
  // Accessible keyboard activation on Enter or Space
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e as any);
    }
  };

  return (
    <div 
      className={`${colClass} ${rowClass} ${className}`} 
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}                                           // Keyboard handler
      tabIndex={onClick ? 0 : undefined}                                                        // Make focusable if clickable
      role={onClick ? 'button' : undefined}                                                     // ARIA role
    >
      {children}
    </div>
  );
};
