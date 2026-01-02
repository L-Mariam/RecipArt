import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { signInWithGoogle, signInGuest, loginAsMock, currentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDevFallback, setShowDevFallback] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
        navigate('/');
    }
  }, [currentUser, navigate]);

  const handleError = (err: any) => {
    console.error("Login failed:", err);
    
    // Check for file protocol common error
    if (window.location.protocol === 'file:') {
        setError("Firebase Auth does not work with 'file://' protocol. You must run this on a local server (e.g., 'npx serve' or VS Code Live Server).");
        setShowDevFallback(true);
        return;
    }

    if (err.code === 'auth/configuration-not-found') {
        setError("Google Sign-In is not configured in Firebase Console.");
        setShowDevFallback(true);
    } else if (err.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        // Provide extremely specific instructions
        setError(`Domain Unauthorized. 
        Your current origin is: "${origin}" 
        Your hostname is: "${hostname}"
        
        Go to Firebase Console > Authentication > Settings > Authorized Domains and add: ${hostname || 'your-preview-domain'}`);
        setShowDevFallback(true);
    } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled.");
    } else if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked. Please allow popups for this site.");
    } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        setError("Sign-in method restricted or not enabled in Firebase Console.");
        setShowDevFallback(true);
    } else {
        setError(err.message || "Failed to sign in.");
        // Fallback for previews
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('webcontainer')) {
             setShowDevFallback(true);
        }
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
        await signInWithGoogle();
    } catch (err: any) {
        handleError(err);
    } finally {
        setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
      setError(null);
      setLoading(true);
      try {
          // This will now auto-fallback to mock inside AuthContext if it fails
          await signInGuest();
      } catch (err: any) {
          handleError(err);
      } finally {
          setLoading(false);
      }
  };

  const handleMockLogin = async () => {
      setLoading(true);
      await loginAsMock();
      setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-black text-white flex items-center justify-center rounded-lg text-2xl font-bold">R</div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Welcome to RecipArt</h2>
            <p className="mt-2 text-sm text-gray-600">Turn your bills into masterpieces.</p>
        </div>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 whitespace-pre-wrap break-words">
                {error}
            </div>
        )}

        <div className="mt-8 space-y-4">
            <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue as guest</span>
                </div>
            </div>

            <button 
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gray-600 hover:bg-gray-700 font-medium transition-all disabled:opacity-50"
            >
                Guest Login
            </button>

            {showDevFallback && (
                <div className="animate-in fade-in pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-3 text-center">
                            <strong>Authentication Issue Detected</strong><br/>
                            <span className="text-xs text-gray-600">
                                This often happens in preview environments. <br/>
                                You can continue in Offline Mode:
                            </span>
                        </p>
                        <button 
                            onClick={handleMockLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-2 border border-yellow-400 rounded-lg shadow-sm text-yellow-900 bg-yellow-100 hover:bg-yellow-200 font-medium transition-all disabled:opacity-50"
                        >
                            Continue in Offline/Dev Mode
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;