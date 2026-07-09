import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  color?: string;
  editable?: boolean;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onEditOption?: (value: string) => void;
  width?: string;
  disabled?: boolean;
}

export default function CustomSelect({ options, value, onChange, onEditOption, width = '70px', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-select" ref={ref} style={{ width, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div className="select-trigger" onClick={() => !disabled && setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedOption.color && (
            <div style={{ width: '10px', height: '10px', borderRadius: 0, backgroundColor: selectedOption.color }} />
          )}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} />
      </div>
      {isOpen && (
        <div className="select-dropdown">
          {options.map(option => (
            <div 
              key={option.value} 
              className={`select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                {option.color && (
                  <div style={{ width: '10px', height: '10px', borderRadius: 0, backgroundColor: option.color, flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</span>
              </div>
              {option.editable && onEditOption && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditOption(option.value);
                    setIsOpen(false);
                  }}
                  style={{ opacity: 0.5, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                >
                  <Pencil size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
