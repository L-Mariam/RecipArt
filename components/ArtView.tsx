import React from 'react';
import { Receipt } from '../types';

interface Props {
  receipt: Receipt;
  onViewBill: () => void;
}

const ArtView: React.FC<Props> = ({ receipt, onViewBill }) => {
  return (
    <div className="flex flex-col h-full w-full">
      <div 
        className="flex-1 bg-gray-100 rounded-2xl overflow-hidden relative group cursor-pointer shadow-inner border border-gray-200"
        onDoubleClick={onViewBill}
      >
        <img 
          src={receipt.artUrl} 
          alt={receipt.title} 
          className="w-full h-full object-contain p-4"
        />
      </div>

      <div className="mt-6 flex justify-center">
         <button 
             onClick={onViewBill}
             className="group bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all flex items-center gap-3 text-lg"
           >
             <span>View Bill & Guess Total</span>
             <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
           </button>
      </div>
    </div>
  );
};

export default ArtView;