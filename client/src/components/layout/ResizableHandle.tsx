import React, { useState, useEffect, useCallback } from 'react';

interface ResizableHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
}

export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  direction,
  onResize,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'horizontal') {
        onResize(e.movementX);
      } else {
        onResize(e.movementY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  if (direction === 'horizontal') {
    return (
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 cursor-col-resize hover:bg-ide-focus transition-colors z-20 select-none ${
          isDragging ? 'bg-ide-focus' : 'bg-transparent'
        } ${className}`}
      />
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`h-1 cursor-row-resize hover:bg-ide-focus transition-colors z-20 select-none ${
        isDragging ? 'bg-ide-focus' : 'bg-transparent'
      } ${className}`}
    />
  );
};
