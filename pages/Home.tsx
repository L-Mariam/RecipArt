import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiptCard from '../components/ReceiptCard';
import { getAllReceipts } from '../services/receiptService';
import { Receipt } from '../types';

const Home: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllReceipts();
      const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
      setReceipts(sorted);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-500 mt-1">Receipts in the front, art in the back.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-6 space-y-6">
          <div 
            onClick={() => navigate('/upload')}
            className="break-inside-avoid group cursor-pointer flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl aspect-[3/4] hover:border-primary hover:bg-gray-100 transition-all mb-6"
          >
            <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="font-medium text-gray-900">Create New</span>
            <span className="text-xs text-gray-500 mt-1">Add your receipt art</span>
          </div>

          {receipts.map(r => (
            <ReceiptCard 
                key={r.id} 
                receipt={r} 
                onClick={(id) => navigate(`/view/${id}`)} 
                className="mb-6" 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;