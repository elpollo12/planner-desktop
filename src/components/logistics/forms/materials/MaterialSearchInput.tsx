import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { capitalize } from '@/lib/stringUtils';
import type { Material } from '@/types/logistics';

interface MaterialSearchInputProps {
  materials: Material[];
  value: string;
  onChange: (materialId: string) => void;
  error?: string;
}

export function MaterialSearchInput({ materials, value, onChange, error }: MaterialSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display text when value changes externally (e.g. form reset)
  useEffect(() => {
    if (value) {
      const mat = materials.find(m => m.id === value);
      if (mat) setQuery(capitalize(mat.name));
    } else {
      setQuery('');
    }
  }, [value, materials]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    setIsOpen(true);
    // If user clears or edits, deselect
    if (value) {
      const selected = materials.find(m => m.id === value);
      if (selected && capitalize(selected.name) !== text) {
        onChange('');
      }
    }
  };

  const handleSelect = (mat: Material) => {
    onChange(mat.id);
    setQuery(capitalize(mat.name));
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const borderColor = error
    ? 'border-red-500'
    : 'border-gray-300 dark:border-gray-600';

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${borderColor}`}
          placeholder="Buscar material..."
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron materiales
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  m.id === value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                <span>{capitalize(m.name)}</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({m.unit})</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
