import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FluidProduct } from '../../types/fluid';

interface FluidProductSelectorProps {
  products: FluidProduct[];
  selectedId: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
}

export function FluidProductSelector({ products, selectedId, onChange, disabled }: FluidProductSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = products.find((p) => p.id === selectedId);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  // Position the dropdown relative to the button using fixed positioning
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 260;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleOpen = () => {
    updatePosition();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`
          w-full text-left px-3 py-1.5 text-sm rounded-lg border
          ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800 cursor-pointer'}
          border-gray-300 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
      >
        {selected ? (
          <span>
            <strong className="text-primary-600 dark:text-primary-400">{selected.code}</strong>
            <span className="ml-1 text-gray-600 dark:text-gray-400">{selected.name}</span>
          </span>
        ) : (
          <span className="text-gray-400">{t('fluids.inventory.selectProduct')}</span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl"
        >
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fluids.inventory.searchProduct')}
              className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">{t('fluids.inventory.noResults')}</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer
                  ${p.id === selectedId ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                `}
              >
                <strong className="text-primary-600 dark:text-primary-400">{p.code}</strong>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{p.name}</span>
                {p.ge && <span className="ml-2 text-xs text-gray-400">GE: {p.ge}</span>}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
