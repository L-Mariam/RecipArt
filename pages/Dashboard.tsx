import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserReceipts, deleteReceipt, getAllUserComments, deleteComment, getUserGuesses } from '../services/receiptService';
import { Receipt, Comment, GuessRecord } from '../types';
import ReceiptCard from '../components/ReceiptCard';

const Dashboard: React.FC = () => {
  const { currentUser, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [userGuesses, setUserGuesses] = useState<GuessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'art' | 'guesses' | 'comments' | 'settings'>('art');
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [newName, setNewName] = useState(currentUser?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    const loadData = async () => {
        try {
            const [rData, cData, gData] = await Promise.all([
                getUserReceipts(currentUser.uid),
                getAllUserComments(currentUser.uid),
                getUserGuesses(currentUser.uid)
            ]);
            setReceipts(rData.sort((a, b) => b.createdAt - a.createdAt));
            setUserComments(cData.sort((a, b) => b.timestamp - a.timestamp));
            setUserGuesses(gData);
        } catch (e) {
            console.error("Dashboard data load failed", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [currentUser, navigate]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Basic size check
      if (file.size > 2 * 1024 * 1024) {
          alert("Image too large. Please select a file under 2MB.");
          return;
      }

      setIsUpdating(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
              await updateUserProfile({ photoURL: base64 });
          } catch (err) {
              console.error(err);
              alert("Failed to update avatar.");
          } finally {
              setIsUpdating(false);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async () => {
      if (!newName.trim()) return;
      setIsUpdating(true);
      try {
          await updateUserProfile({ displayName: newName });
          setEditingProfile(false);
      } catch (e) {
          alert("Failed to update username.");
      } finally {
          setIsUpdating(false);
      }
  };

  const handleDeleteArt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this art piece permanently?")) {
        await deleteReceipt(id);
        setReceipts(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleDeleteUserComment = async (receiptId: string, commentId: string) => {
    if (window.confirm("Remove this comment?")) {
        await deleteComment(receiptId, commentId);
        setUserComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const correctGuessesCount = userGuesses.filter(g => g.isCorrect).length;
  const accuracy = userGuesses.length > 0 ? ((correctGuessesCount / userGuesses.length) * 100).toFixed(0) : 0;

  if (!currentUser) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-primary flex items-center justify-center">
                {isUpdating ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-white text-3xl font-black">
                        {currentUser.displayName?.[0] || 'U'}
                    </span>
                )}
            </div>
            
            {!isUpdating && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold"
                >
                    UPDATE
                </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1 text-center md:text-left">
            {editingProfile ? (
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="text-2xl font-black border-b-2 border-primary focus:outline-none bg-transparent"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={handleProfileUpdate} className="text-xs font-bold bg-primary text-white px-3 py-1 rounded-lg">Save</button>
                        <button onClick={() => setEditingProfile(false)} className="text-xs font-bold text-gray-400">Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 justify-center md:justify-start">
                    <h1 className="text-3xl font-black text-gray-900">{currentUser.displayName || 'Unnamed User'}</h1>
                    <button onClick={() => { setNewName(currentUser.displayName || ''); setEditingProfile(true); }} className="text-gray-300 hover:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                </div>
            )}
            <p className="text-gray-400 text-sm font-medium mt-1">{currentUser.email || (currentUser.isAnonymous ? 'Guest Detective' : 'Offline Session')}</p>
        </div>

        <div className="flex gap-4">
            <div className="text-center bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 min-w-[100px]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-2xl font-black text-primary">{accuracy}%</p>
            </div>
            <div className="text-center bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 min-w-[100px]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Correct</p>
                <p className="text-2xl font-black text-green-500">{correctGuessesCount}</p>
            </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
          {['art', 'guesses', 'comments', 'settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="animate-in fade-in duration-500">
            {activeTab === 'art' && (
                receipts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold mb-4 uppercase text-[10px] tracking-widest">No Masterpieces Yet</p>
                        <button onClick={() => navigate('/upload')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-gray-200">Start Creating</button>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 gap-8">
                        {receipts.map(r => (
                            <div key={r.id} className="relative group mb-8">
                                <ReceiptCard receipt={r} onClick={(id) => navigate(`/view/${id}`)} />
                                <button 
                                    onClick={(e) => handleDeleteArt(r.id, e)}
                                    className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700 z-10"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {activeTab === 'guesses' && (
                <div className="space-y-4">
                    {userGuesses.length === 0 ? (
                        <p className="text-center text-gray-400 py-20 italic">You haven't solved any bills yet.</p>
                    ) : (
                        userGuesses.map(g => (
                            <div key={g.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/view/${g.receiptId}`)}>
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${g.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                                        {g.isCorrect ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-lg">Guess: ${g.guessAmount.toFixed(2)}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Target: ${g.actualAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-300 font-black">{new Date(g.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'comments' && (
                <div className="space-y-4">
                    {userComments.length === 0 ? (
                        <p className="text-center text-gray-400 py-20 italic">No comments history found.</p>
                    ) : (
                        userComments.map(c => (
                            <div key={c.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="cursor-pointer" onClick={() => navigate(`/view/${c.receiptId}`)}>
                                        <p className="text-gray-800 font-bold leading-relaxed">"{c.text}"</p>
                                        <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">On Art #{c.receiptId.slice(-4)} • {new Date(c.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteUserComment(c.receiptId, c.id)}
                                        className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            
            {activeTab === 'settings' && (
                <div className="bg-red-50 p-10 rounded-3xl border border-red-100 max-w-2xl mx-auto text-center">
                    <h3 className="text-red-600 font-black uppercase text-xs tracking-widest mb-4">Permanent Account Deletion</h3>
                    <p className="text-sm text-red-400 mb-8 font-medium">This action cannot be undone. All your art pieces, comments, and rank history will be wiped from our servers.</p>
                    <button 
                        onClick={() => { if(window.confirm("FINAL WARNING: Delete everything?")) deleteAccount(); }} 
                        className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                    >
                        DELETE EVERYTHING
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;