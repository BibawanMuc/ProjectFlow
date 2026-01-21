
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-4 sm:p-6 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
