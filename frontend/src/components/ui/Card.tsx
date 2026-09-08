import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'solid' | 'emergency';
  interactive?: boolean;
  selected?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'glass',
  interactive = false,
  selected = false,
  style,
  onClick
}) => {
  let baseClass = 'glass-surface';
  if (variant === 'solid' || variant === 'default') {
    baseClass = 'solid-clinical-surface';
  } else if (variant === 'emergency') {
    baseClass = 'emergency-panel';
  }

  const interactiveClass = interactive ? 'interactive-surface' : '';
  const selectedClass = selected ? 'selected' : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
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
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="card-header flex justify-between items-center">
    <h3 style={{ margin: 0 }}>{title}</h3>
    {action && <div>{action}</div>}
  </div>
);
