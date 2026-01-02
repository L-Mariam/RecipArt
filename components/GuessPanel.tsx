import React, { useState } from 'react';
import { Receipt } from '../types';
import { recordGuess } from '../services/receiptService';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  receipt: Receipt;
  onReveal?: (isRevealed: boolean) => void;
}

const GuessPanel: React.FC<Props> = ({ receipt, onReveal }) => {
  const { currentUser } = useAuth();
  const [guess, setGuess] = useState<string>('');
  const [revealed, setRevealed] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const handleReveal = async () => {
    setRevealed(true);
    if (onReveal) onReveal(true);
    
    if (currentUser && !hasRecorded) {
      const amount = parseFloat(guess || '0');
      const diff = Math.abs(amount - receipt.total);
      const isCorrect = (diff / receipt.total) <= 0.05; // 5% margin
      
      await recordGuess({
        userId: currentUser.uid,
        receiptId: receipt.id,
        guessAmount: amount,
        actualAmount: receipt.total,
        isCorrect
      });
      setHasRecorded(true);
    }
  };

  const handleReset = () => {
    setRevealed(false);
    setGuess('');
    setHasRecorded(false);
    if (onReveal) onReveal(false);
  };

  const amount = parseFloat(guess || '0');
  const difference = revealed ? Math.abs(amount - receipt.total) : 0;
  const percentOff = revealed && receipt.total > 0 ? ((difference / receipt.total) * 100).toFixed(1) : '0';
  const isCorrect = revealed && (difference / receipt.total) <= 0.05;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Guess the Total</h3>
      
      {receipt.location && !receipt.isLocationPrivate ? (
        <div className="mb-4 text-sm text-gray-600 flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="font-bold">{receipt.location}</span>
        </div>
      ) : (
        <div className="mb-4 text-sm text-gray-400 flex items-center gap-2 italic bg-gray-50 p-3 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
            Location Undisclosed
        </div>
      )}

      {!revealed ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">Try to guess the total within a 5% margin to rank up on the leaderboard!</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                placeholder="0.00"
              />
            </div>
            <button
              onClick={handleReveal}
              disabled={!guess || parseFloat(guess) <= 0}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Reveal
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className={`p-5 rounded-2xl border ${isCorrect ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
             {isCorrect && (
                <div className="flex items-center gap-2 text-green-700 font-bold text-xs uppercase tracking-widest mb-3">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                   Correct Guess!
                </div>
             )}
             <div className="flex justify-between items-center mb-1">
               <span className="text-gray-500 text-xs font-bold uppercase">Your Guess</span>
               <span className="font-bold text-lg">${amount.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-gray-500 text-xs font-bold uppercase">Actual Total</span>
               <span className="font-black text-2xl text-primary">${receipt.total.toFixed(2)}</span>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200/50 text-xs font-medium text-gray-500">
                You were off by <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>${difference.toFixed(2)}</span> ({percentOff}%)
             </div>
           </div>

           <div className="mt-4">
             <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-3">Item Breakdown</h4>
             <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2 custom-scrollbar">
               {receipt.items.map((item, idx) => (
                 <li key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                   <span className="text-gray-700">{item.name}</span>
                   <span className="font-bold text-gray-400">${item.price.toFixed(2)}</span>
                 </li>
               ))}
             </ul>
           </div>
           
           <button 
             onClick={handleReset}
             className="w-full mt-2 text-xs font-bold text-gray-400 hover:text-primary transition-colors py-2"
           >
             Try Another Guess
           </button>
        </div>
      )}
    </div>
  );
};

export default GuessPanel;