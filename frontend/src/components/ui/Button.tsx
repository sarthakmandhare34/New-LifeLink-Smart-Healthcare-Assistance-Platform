import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', style, ...props }) => {
  let sizeStyle: React.CSSProperties = {};
  if (size === 'sm') {
    sizeStyle = { padding: '6px 12px', fontSize: 'var(--text-caption)' };
  } else if (size === 'lg') {
    sizeStyle = { padding: '14px 28px', fontSize: '16px' };
  }

  return (
    <button className={`btn btn-${variant} ${className}`} style={{ ...sizeStyle, ...style }} {...props}>
      {props.children}
    </button>
  );
};
