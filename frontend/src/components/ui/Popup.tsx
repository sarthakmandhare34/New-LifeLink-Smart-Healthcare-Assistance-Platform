import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const Popup: React.FC<PopupProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = '500px',
  className = '',
  closeOnBackdrop = true
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const titleId = React.useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setIsClosing(false);
      dialog.showModal();
    } else if (!isOpen && dialog.open && !isClosing) {
      handleClose();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for the closing animation to finish
    setTimeout(() => {
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      setIsClosing(false);
      onClose();
    }, 150); // Matches var(--transition-fast) timing
  };

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault(); // Prevent immediate closing to play animation
    handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Check if the click was exactly on the ::backdrop (pseudo-elements register on the element itself, outside its bounds)
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
    
    if (!isInDialog) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`popup ${isClosing ? 'closing' : ''} ${className}`}
      style={{ maxWidth }}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className="popup-inner" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4" style={{ paddingBottom: 'var(--spacing-3)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 'var(--text-h2)' }}>{title}</h2>
          <button 
            onClick={handleClose} 
            className="icon-btn" 
            aria-label="Close popup"
            style={{ margin: '-8px' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="popup-content">
          {children}
        </div>
      </div>
    </dialog>
  );
};
