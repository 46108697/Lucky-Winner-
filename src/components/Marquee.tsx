
'use client';

import React from 'react';

type MarqueeProps = {
  text: string;
};

export const Marquee: React.FC<MarqueeProps> = ({ text }) => {
  return (
    <div className="relative flex overflow-hidden bg-darkCard py-2 border-y-2 border-gold/30">
      <div className="animate-marquee whitespace-nowrap">
        <span className="text-base text-gold mx-4">{text}</span>
        <span className="text-base text-gold mx-4">{text}</span>
        <span className="text-base text-gold mx-4">{text}</span>
        <span className="text-base text-gold mx-4">{text}</span>
      </div>
      <div className="absolute top-0 animate-marquee2 whitespace-nowrap">
         <span className="text-base text-gold mx-4">{text}</span>
         <span className="text-base text-gold mx-4">{text}</span>
         <span className="text-base text-gold mx-4">{text}</span>
         <span className="text-base text-gold mx-4">{text}</span>
      </div>
    </div>
  );
};
