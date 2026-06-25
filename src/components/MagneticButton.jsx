import React, { useRef, useState } from 'react';

const MagneticButton = ({ children, className, onClick, ...props }) => {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = buttonRef.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.25, y: y * 0.25 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-all duration-200 ease-out ${className} ${isHovered ? 'shadow-[0_0_20px_rgba(68,56,250,0.4)] z-10' : ''}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      {...props}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
