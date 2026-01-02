import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
            <span className="text-xl font-black text-gray-900 flex items-center gap-2">
              <span className="bg-black text-white px-2 py-0.5 rounded-lg group-hover:rotate-6 transition-transform">R</span>
              RecipArt
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/leaderboard')} className={`text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/leaderboard' ? 'text-primary' : 'text-gray-400 hover:text-black'}`}>
                Ranking
            </button>
            {currentUser ? (
              <>
                 <button onClick={() => navigate('/upload')} className={`text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/upload' ? 'text-primary' : 'text-gray-400 hover:text-black'}`}>
                    Upload
                 </button>
                 <button onClick={() => navigate('/dashboard')} className={`text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/dashboard' ? 'text-primary' : 'text-gray-400 hover:text-black'}`}>
                    Dashboard
                 </button>
                 <div className="h-4 w-px bg-gray-200"></div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-full overflow-hidden border border-gray-100">
                        {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                                {currentUser.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </button>
                    <button onClick={handleLogout} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest">
                        Logout
                    </button>
                 </div>
              </>
            ) : (
                <button 
                    onClick={() => navigate('/login')}
                    className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md"
                >
                    Login
                </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;