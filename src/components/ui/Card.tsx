import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border border-white/75 bg-white/90 shadow-brand backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent dark:border-slate-800/90 dark:bg-slate-900/88 dark:before:via-slate-700/80 ${className ?? ''}`}
    >
      {children}
    </div>
  );
};

export default Card;
