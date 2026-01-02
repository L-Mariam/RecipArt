import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArtView from '../components/ArtView';
import BillView from '../components/BillView';
import GuessPanel from '../components/GuessPanel';
import CommentSection from '../components/CommentSection';
import ReceiptCard from '../components/ReceiptCard';
import { getReceiptById, getAllReceipts } from '../services/receiptService';
import { Receipt, Comment } from '../types';

const ViewReceipt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [suggestions, setSuggestions] = useState<Receipt[]>([]);
  const [viewMode, setViewMode] = useState<'art' | 'bill'>('art');
  const [loading, setLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const data = await getReceiptById(id);
      if (data) {
        setReceipt(data);
        setIsRevealed(false);
        setViewMode('art');
      }
      const all = await getAllReceipts();
      const others = all.filter(r => r.id !== id);
      const shuffled = others.sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 4));
      setLoading(false);
    };
    load();
    window.scrollTo(0,0);
  }, [id]);

  const handleCommentAdded = (comment: Comment) => {
    if (receipt) {
        let updatedComments = [...(receipt.comments || [])];
        if (comment.parentId) {
            updatedComments = updatedComments.map(c => {
                if (c.id === comment.parentId) {
                    return { ...c, replies: [...(c.replies || []), comment] };
                }
                return c;
            });
        } else {
            updatedComments.push(comment);
        }
        setReceipt({ ...receipt, comments: updatedComments });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen animate-pulse">Loading art...</div>;
  if (!receipt) return <div className="text-center mt-20">Receipt not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
       {/* Details Container - Restricted width for readability like Pinterest detail view */}
       <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
          
          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
              
              {/* Media Section */}
              <div className="flex-1 bg-gray-50 relative min-h-[400px] md:min-h-[600px] flex items-center justify-center border-r border-gray-100">
                {viewMode === 'art' ? (
                  <ArtView receipt={receipt} onViewBill={() => setViewMode('bill')} />
                ) : (
                  <BillView 
                      receipt={receipt} 
                      onBackToArt={() => setViewMode('art')} 
                      revealed={isRevealed} 
                  />
                )}
              </div>

              {/* Interaction Section */}
              <div className="w-full md:w-[380px] p-8 flex flex-col bg-white">
                  <div className="flex justify-between items-start mb-6">
                      <h1 className="text-2xl font-bold text-gray-900 leading-tight">{receipt.title}</h1>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                          {receipt.artist[0]}
                      </div>
                      <div>
                          <p className="text-sm font-bold text-gray-900">{receipt.artist}</p>
                          <p className="text-xs text-gray-400">{receipt.year}</p>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {viewMode === 'art' ? (
                          <div className="animate-in fade-in duration-300">
                            <p className="text-sm text-gray-600 leading-relaxed mb-6">{receipt.description}</p>
                            {receipt.medium && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Medium: {receipt.medium}</p>}
                            
                            <div className="mt-8">
                                <GuessPanel receipt={receipt} onReveal={(rev) => setIsRevealed(rev)} />
                            </div>
                          </div>
                      ) : (
                          <div className="animate-in slide-in-from-right-4 duration-300">
                             <GuessPanel receipt={receipt} onReveal={(rev) => setIsRevealed(rev)} />
                          </div>
                      )}
                  </div>

                  <CommentSection 
                      receiptId={receipt.id} 
                      comments={receipt.comments || []} 
                      onCommentAdded={handleCommentAdded} 
                  />
              </div>
          </div>
       </div>

       {/* More to Explore - Pinterest Masonry Style */}
       {suggestions.length > 0 && (
         <div className="w-full px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100 mt-8">
            <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">More ideas</h2>
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
               {suggestions.map(s => (
                   <ReceiptCard 
                      key={s.id} 
                      receipt={s} 
                      onClick={(id) => navigate(`/view/${id}`)}
                      className="mb-6"
                   />
               ))}
            </div>
         </div>
       )}
    </div>
  );
};

export default ViewReceipt;