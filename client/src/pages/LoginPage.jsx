import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, firebaseConfigStatus } from '../config/firebase';
import { FcGoogle } from 'react-icons/fc';
import { roomAPI } from '../services/api';
import './AuthPage.css';

const LoginPage = () => {
  const { user, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const handleGoogleLogin = async () => {
    // Check Firebase configuration
    if (!firebaseConfigStatus.isConfigured) {
      setError(
        `Firebase is not configured. Missing: ${firebaseConfigStatus.missingKeys.join(', ')}. Please create a .env file in the client/ directory with your Firebase credentials.`
      );
      return;
    }

    if (!auth || !googleProvider) {
      setError('Firebase failed to initialize. Check the browser console for details.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await googleLogin(token);
      navigate('/home');
    } catch (err) {
      console.error('Google Auth Error:', err);
      
      // Provide specific error messages based on error code
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Add localhost to your Firebase Console → Authentication → Settings → Authorized domains.');
      } else if (code === 'auth/invalid-api-key') {
        setError('Invalid Firebase API key. Please check your VITE_FIREBASE_API_KEY in client/.env');
      } else if (err.response?.data?.message) {
        setError(`Server error: ${err.response.data.message}. Make sure Firebase Admin SDK is configured on the server.`);
      } else {
        setError(`Google Login failed: ${err.message || 'Unknown error'}. Check console for details.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          SQUIZ<span>.</span>
        </div>
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to your account to continue</p>

        {error && <div className="auth-card__error">{error}</div>}
        
        {loading && <div style={{ textAlign: 'center', margin: '1rem 0' }}><span className="spinner spinner--sm"></span> Logging in...</div>}

        {!loading && (
          <div className="auth-card__form">
            <button className="auth-btn-google" onClick={handleGoogleLogin}>
              <FcGoogle size={20} /> SIGN IN WITH GOOGLE
            </button>
          </div>
        )}

        {!firebaseConfigStatus.isConfigured && (
          <div className="auth-card__config-help">
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'var(--space-md)' }}>
              ⚠️ Firebase not configured. Create <code>client/.env</code> with your Firebase credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
