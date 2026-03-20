import { useEffect, useCallback, useRef } from "react";
import { useModalStore } from "../../store";
import { X } from "lucide-react";
import { Button } from "./Button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = () => {
  const { isOpen, content, options, closeModal } = useModalStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const {
    title,
    size = 'sm',
    showCloseButton = true,
    closeOnOutsideClick = true,
    closeOnEsc = true,
    onClose,
    onConfirm,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    showConfirmButton = false,
    showCancelButton = false,
    disableConfirm = false,
    disableCancel = false,
    className = '',
    disableBodyScroll = true,
  } = options;

  // Auto-focus dialog on open & restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      // Wait for the modal to render, then focus
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      (previousFocusRef.current as HTMLElement).focus?.();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Block context menu, Alt+Arrow navigation, and mouse back/forward buttons while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleNavKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
      }
    };

    // Buttons 3 and 4 are back/forward on most mice
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleNavKeys);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleNavKeys);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  // Handle ESC key & focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc && isOpen) {
        closeModal();
        return;
      }

      if (event.key === 'Tab' && isOpen && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEsc, closeModal]);

  // Handle body scroll
  useEffect(() => {
    if (isOpen && disableBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, disableBodyScroll]);

  const handleOutsideClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && closeOnOutsideClick) {
        closeModal();
      }
    },
    [closeModal, closeOnOutsideClick]
  );

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    closeModal();
  }, [onConfirm, closeModal]);

  const handleCancel = useCallback(() => {
    onClose?.();
    closeModal();
  }, [onClose, closeModal]);

  const sizeClasses = {
    sm: 'w-full max-w-[24rem]',   // 384px
    md: 'w-full max-w-[28rem]',   // 448px
    lg: 'w-full max-w-[36rem]',   // 576px — wizard fits here
    xl: 'w-full max-w-[48rem]',   // 768px
    full: 'w-full max-w-[90vw]',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`}
        onClick={handleOutsideClick}
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`relative bg-gray-50 dark:bg-gray-800 flex flex-col rounded-lg shadow-xl w-full max-h-[90vh] ${sizeClasses[size]} transform transition-all duration-300 outline-none ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          } ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h3
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={handleCancel}
                  className="ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  type="button"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto grow">{content}</div>

          {/* Footer */}
          {(showConfirmButton || showCancelButton) && (
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {showCancelButton && (
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={disableCancel}
                >
                  {cancelText}
                </Button>
              )}
              {showConfirmButton && (
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={disableConfirm}
                >
                  {confirmText}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
