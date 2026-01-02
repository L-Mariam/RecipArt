import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/receiptService';
import { UserStats } from '../types';

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getLeaderboard();
      setLeaders(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Top Detectives</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Global Ranking by Accuracy</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="space-y-4">
          {leaders.length === 0 ? (
            <p className="text-center text-gray-400 py-20 italic">The leaderboard is empty. Start guessing to be the first!</p>
          ) : (
            leaders.map((user, idx) => (
              <div key={user.uid} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-200' : 
                    idx === 1 ? 'bg-gray-100 text-gray-500 border-2 border-gray-200' : 
                    idx === 2 ? 'bg-orange-100 text-orange-600 border-2 border-orange-200' : 
                    'bg-gray-50 text-gray-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900">{user.displayName || 'Anonymous Detective'}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.correctGuesses} Correct Guesses</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-primary">{user.accuracy.toFixed(0)}%</p>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Accuracy</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;