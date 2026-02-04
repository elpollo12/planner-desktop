import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function DialogModal({ isOpen, onClose, title, children, size = 'md' }: DialogModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
          {title && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="p-6 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
