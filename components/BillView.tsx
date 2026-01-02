import React from 'react';
import { Receipt } from '../types';

interface Props {
  receipt: Receipt;
  onBackToArt: () => void;
  revealed?: boolean;
}

const BillView: React.FC<Props> = ({ receipt, onBackToArt, revealed = false }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative group">
        <img 
          src={revealed ? receipt.billSensitiveUrl : receipt.billBlurredUrl} 
          alt="Receipt" 
          className="w-full h-full object-contain transition-opacity duration-500"
        />
        
        {/* Status Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="bg-red-900/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm border border-red-800">
                Sensitive Info Hidden
            </div>
            {!revealed && (
                <div className="bg-green-800/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm border border-green-700 animate-pulse">
                    Prices Hidden
                </div>
            )}
        </div>
      </div>

      <div className="mt-6">
        <button 
            onClick={onBackToArt}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm mb-4"
        >
            ← Back to Art
        </button>
      </div>
    </div>
  );
};

export default BillView;
