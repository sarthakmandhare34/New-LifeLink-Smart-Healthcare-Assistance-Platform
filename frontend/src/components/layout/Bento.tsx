import React from 'react';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => (
  <div className={`bento-grid ${className}`}>
    {children}
  </div>
);

interface BentoItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const BentoItem: React.FC<BentoItemProps> = ({ 
  children, 
  colSpan = 1, 
  rowSpan = 1, 
  className = '',
  onClick
}) => {
  const colClass = `bento-col-span-${colSpan}`;
  const rowClass = `bento-row-span-${rowSpan}`;
  
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
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  );
};
