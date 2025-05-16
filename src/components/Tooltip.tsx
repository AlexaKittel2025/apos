'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 300,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.top - tooltipRect.height - 8;
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.bottom + 8;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
    }

    // Keep the tooltip within viewport
    const padding = 10;
    
    // Horizontal constraints
    x = Math.max(padding, x);
    x = Math.min(x, window.innerWidth - tooltipRect.width - padding);
    
    // Vertical constraints
    y = Math.max(padding, y);
    y = Math.min(y, window.innerHeight - tooltipRect.height - padding);

    setCoordinates({ x, y });
  };

  // Add resize handler for responsive tooltips
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        calculatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);

  return (
    <div 
      className={`inline-block relative ${className}`}
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[1000] bg-[#121212]/95 text-white text-sm py-2 px-3 rounded shadow-lg backdrop-blur-sm border border-gray-700 max-w-xs animate-fadeIn`}
          style={{
            left: `${coordinates.x}px`,
            top: `${coordinates.y}px`,
          }}
        >
          {/* Arrow based on position */}
          <div 
            className={`absolute w-0 h-0 border-4 border-transparent
              ${position === 'top' ? 'border-t-[#121212]/95 bottom-[-8px] left-1/2 transform -translate-x-1/2' : ''}
              ${position === 'right' ? 'border-r-[#121212]/95 left-[-8px] top-1/2 transform -translate-y-1/2' : ''}
              ${position === 'bottom' ? 'border-b-[#121212]/95 top-[-8px] left-1/2 transform -translate-x-1/2' : ''}
              ${position === 'left' ? 'border-l-[#121212]/95 right-[-8px] top-1/2 transform -translate-y-1/2' : ''}
            `}
          />
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;