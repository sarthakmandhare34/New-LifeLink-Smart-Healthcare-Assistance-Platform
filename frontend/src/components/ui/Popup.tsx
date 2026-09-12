import React, { useEffect, useRef } from 'react';                                         // React hooks
import { X } from 'lucide-react';                                                               // Close modal icon

interface PopupProps {
  isOpen: boolean;                                                                              // Modal visibility state
  onClose: () => void;                                                                          // Close callback
  title: string;                                                                                // Dialog title
  children: React.ReactNode;                                                                    // Modal body content
  maxWidth?: string;                                                                            // Maximum width constraint
  className?: string;                                                                           // Extra classes
  closeOnBackdrop?: boolean;                                                                    // Allow closing when clicking outside
}

// =========================================================================================
// ACCESSIBLE POPUP DIALOG COMPONENT
// Utilizes HTML5 native `<dialog>` element with `showModal()` for accessible focus-trapping.
// Supports backdrop dismissal, close micro-animations, and ARIA title relationships.
// =========================================================================================
export const Popup: React.FC<PopupProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = '500px',
  className = '',
  closeOnBackdrop = true
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);                                            // Reference to native dialog
  const [isClosing, setIsClosing] = React.useState(false);                                      // Animation state
  const titleId = React.useId();                                                                // Accessible ID

  // Synchronize open state with native dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setIsClosing(false);
      dialog.showModal();                                                                       // Open native modal with focus trapping
    } else if (!isOpen && dialog.open && !isClosing) {
      handleClose();
    }
  }, [isOpen]);

  // Smooth exit animation handler
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (dialogRef.current?.open) {
        dialogRef.current.close();                                                              // Close dialog
      }
      setIsClosing(false);
      onClose();                                                                                // Trigger parent state update
    }, 150);
  };

  // Prevent instant cancel to play closing transition
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    handleClose();
  };

  // Close when clicking on dialog backdrop overlay
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
    
    if (!isInDialog) {
      handleClose();                                                                            // Click was outside dialog box
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
        {/* Modal Header */}
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
        {/* Modal Content */}
        <div className="popup-content">
          {children}
        </div>
      </div>
    </dialog>
  );
};
