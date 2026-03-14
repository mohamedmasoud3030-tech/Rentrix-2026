import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/92 shadow-brand backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent dark:border-slate-800/90 dark:bg-slate-900/88 dark:before:via-slate-700/80 ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/45 to-transparent dark:from-white/[0.03]" />
      {children}
    </div>
  );
};

export default Card;
