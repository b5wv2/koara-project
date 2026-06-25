import React, { useState, useEffect } from 'react';

const InteractiveGrid = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
      background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(37, 99, 235, 0.06), transparent 40%)`
    }}>
    </div>
  );
};

export default InteractiveGrid;
