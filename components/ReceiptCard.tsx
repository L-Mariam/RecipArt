import React from 'react';
import { Receipt } from '../types';

interface Props {
  receipt: Receipt;
  onClick: (id: string) => void;
  className?: string;
}

const ReceiptCard: React.FC<Props> = ({ receipt, onClick, className = '' }) => {
  return (
    <div 
      onClick={() => onClick(receipt.id)}
      className={`group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 break-inside-avoid border border-gray-100 ${className}`}
    >
      <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        <img 
          src={receipt.artUrl} 
          alt={receipt.title}
          loading="lazy"
          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-8">
        <h3 className="text-xl font-black text-white leading-tight mb-1">{receipt.title}</h3>
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white">
                {receipt.artist[0]}
            </div>
            <p className="text-xs text-white/80 font-bold">{receipt.artist}</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptCard;