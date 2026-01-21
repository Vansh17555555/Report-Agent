import React from 'react';

const GlassCard = ({ children, className = '', style = {} }) => {
  return (
    <div 
      className={`glass-panel rounded-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default GlassCard;
