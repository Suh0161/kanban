import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function Select({ value, onChange, options, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInContainer = containerRef.current && containerRef.current.contains(event.target);
      const clickedInDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      
      if (!clickedInContainer && !clickedInDropdown) {
        setIsOpen(false);
      }
    }
    
    // Listen for scroll to close dropdown to prevent detachment
    function handleScroll(e) {
      if (isOpen && !dropdownRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setIsOpen(false));
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef}>
      <button 
        type="button" 
        className="custom-select-trigger" 
        onClick={toggleDropdown}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown size={14} className={`select-icon ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 99999
          }}
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
