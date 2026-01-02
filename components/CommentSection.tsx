import React, { useState } from 'react';
import { Comment } from '../types';
import { addComment } from '../services/receiptService';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  receiptId: string;
  comments: Comment[];
  onCommentAdded: (comment: Comment) => void;
}

const CommentSection: React.FC<Props> = ({ receiptId, comments, onCommentAdded }) => {
  const { currentUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    
    setSubmitting(true);
    try {
        const added = await addComment(receiptId, newComment, {
            uid: currentUser.uid,
            name: currentUser.displayName || 'Unnamed',
            avatar: currentUser.photoURL || undefined
        }, parentId);
        onCommentAdded(added);
        setNewComment('');
        setReplyTo(null);
    } catch (e) {
        alert("Failed to post comment");
    } finally {
        setSubmitting(false);
    }
  };

  const renderComment = (c: Comment, isReply = false) => (
    <div key={c.id} className={`flex gap-3 ${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
        <div className="flex-shrink-0">
            {c.userAvatar ? (
                <img src={c.userAvatar} className="w-8 h-8 rounded-full border border-gray-100" />
            ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                    {c.user[0]}
                </div>
            )}
        </div>
        <div className="flex-1 bg-gray-50 p-3 rounded-2xl relative group">
            <div className="flex justify-between items-baseline mb-1">
                <span className="font-bold text-xs text-gray-900">{c.user}</span>
                <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString()}</span>
            </div>
            <p className="text-gray-700 text-sm">{c.text}</p>
            
            {!isReply && (
                <button 
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="mt-1 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors"
                >
                    Reply
                </button>
            )}

            {replyTo === c.id && (
                <form onSubmit={(e) => handleSubmit(e, c.id)} className="mt-2 flex gap-2">
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 border-b border-gray-300 bg-transparent py-1 text-xs focus:outline-none"
                    />
                    <button type="submit" disabled={submitting} className="text-xs font-bold text-primary">Post</button>
                </form>
            )}
        </div>
    </div>
  );

  return (
    <div className="mt-8 pt-6">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Discussion</h3>
      
      <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-2">
        {comments && comments.length > 0 ? (
            comments.filter(c => !c.parentId).map(c => (
                <div key={c.id}>
                    {renderComment(c)}
                    {c.replies && c.replies.map(r => renderComment(r, true))}
                </div>
            ))
        ) : (
            <p className="text-gray-400 text-sm italic py-4">No comments yet. Be the first!</p>
        )}
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2 bg-gray-50 p-2 rounded-2xl">
        <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "Add a comment..." : "Login to comment"}
            disabled={!currentUser}
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
        />
        <button 
            type="submit"
            disabled={submitting || !newComment.trim() || !currentUser}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50"
        >
            Post
        </button>
      </form>
    </div>
  );
};

export default CommentSection;