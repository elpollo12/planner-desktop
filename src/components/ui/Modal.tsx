import { useEffect, useCallback } from "react";
import { useModalStore } from "../../store";
import { X } from "lucide-react";
import { Button } from "./Button";

export const Modal = () => {
  const { isOpen, content, options, closeModal } = useModalStore();

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

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc && isOpen) {
        closeModal();
      }
    };

    if (isOpen && closeOnEsc) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
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
    sm: 'max-w-[24rem]',  // 24rem = 384px
    md: 'max-w-[28rem]',  // 28rem = 448px
    lg: 'max-w-[32rem]',  // 32rem = 512px
    xl: 'max-w-[36rem]',  // 36rem = 576px
    full: 'w-full',
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
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} onClick={handleOutsideClick}>
        <div
          className={`relative bg-white flex flex-col rounded-lg shadow-xl w-full max-h-[90vh] ${sizeClasses[size]}
          transform transition-all duration-300 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          } ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              {title && (
                <h3
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={handleCancel}
                  className="ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
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
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200">
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
