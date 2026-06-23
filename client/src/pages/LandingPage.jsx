import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, firebaseConfigStatus } from '../config/firebase';
import { FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './LandingPage.css';

const LandingPage = () => {
  const { user, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const handleGoogleLogin = async () => {
    if (!firebaseConfigStatus.isConfigured) {
      toast.error('Firebase is not configured. Missing credentials.');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await googleLogin(token);
      navigate('/home');
    } catch (err) {
      console.error('Auth error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unknown error';
      toast.error(`Sign in failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-light">
      <div className="landing-light__container">
        {/* Header */}
        <header className="landing-light__header">
          <div className="landing-light__logo">
            OVERRUN<span>.</span>
          </div>
          <nav className="landing-light__nav">
            <a href="#quiz">SQUIZ</a>
            <a href="#arena">ARENA</a>
            <a href="#faq">FAQ</a>
            <button onClick={handleGoogleLogin} className="landing-light__btn-primary">
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="landing-light__hero-top">
          <h1>TWO ARENAS. ONE PLATFORM. SAME SIMPLE RULE.</h1>
          <p>Whether it's trivia or a free-for-all, 10 players go in, one comes out on top — and the math is identical every single time.</p>
        </section>

        <div className="landing-light__line-full"></div>

        {/* Quiz Section */}
        <section className="landing-light__mode-section" id="quiz">
          <div className="landing-light__mode-left">
            <div className="landing-light__mode-badge" style={{ backgroundColor: '#111' }}>QUIZ MODE</div>
            <h2>SQUIZ<span>.</span></h2>
            <p>Endless questions, no pauses. You've got 30 seconds — answer as many correctly as you can before the clock runs out. Most correct wins.</p>
            
            <div className="landing-light__mode-tags">
              <span>∞ QUESTIONS</span>
              <span className="landing-light__tag-separator">|</span>
              <span>30 SEC</span>
              <span className="landing-light__tag-separator">|</span>
              <span>10 PLAYERS</span>
            </div>

            <button onClick={handleGoogleLogin} className="landing-light__btn-primary landing-light__btn-lg">
              {loading ? 'WAIT...' : 'PLAY SQUIZ'} <FiArrowRight className="landing-light__btn-icon" />
            </button>
          </div>
          <div className="landing-light__mode-right">
            <div className="landing-light__receipt landing-light__receipt--red">
              <div className="landing-light__receipt-header">
                <div>
                  <div className="landing-light__receipt-label">ENTRY FEE</div>
                  <div className="landing-light__receipt-value">₹50</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="landing-light__receipt-label">WINNER GETS</div>
                  <div className="landing-light__receipt-value">₹250</div>
                </div>
              </div>
              <div className="landing-light__receipt-body">
                <div className="landing-light__receipt-row" style={{ fontWeight: 800 }}>
                  <span>PLAYERS</span>
                  <span>10</span>
                </div>
                
                <div className="landing-light__receipt-divider"></div>
                
                <div className="landing-light__receipt-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>WINNER GETS</div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>Most correct answers in 30 seconds</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c92a2a' }}>₹250</div>
                </div>
                
                <div className="landing-light__receipt-divider"></div>
                
                <div className="landing-light__receipt-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>EACH OF THE REST GETS</div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>1% of the ₹500 pool</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹5</div>
                </div>
                
                <div className="landing-light__receipt-footer">
                  *50 × 10 = ₹500 POOL · -₹250 WINNER · -9×₹5 = ₹45<br/>
                  <b>PLATFORM FEE = ₹205</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="landing-light__line-full"></div>

        {/* Shooter Section */}
        <section className="landing-light__mode-section" id="arena">
          <div className="landing-light__mode-left">
            <div className="landing-light__mode-badge" style={{ backgroundColor: '#c92a2a' }}>SHOOTER MODE</div>
            <h2>OVERRUN <br/> ARENA<span>.</span></h2>
            <p>Free-for-all, no teams, no mercy. 60 seconds on the clock — whoever has the most kills when time runs out takes the round.</p>
            
            <div className="landing-light__mode-tags">
              <span>FREE-FOR-ALL</span>
              <span className="landing-light__tag-separator">|</span>
              <span>60 SEC</span>
              <span className="landing-light__tag-separator">|</span>
              <span>10 PLAYERS</span>
            </div>

            <button onClick={handleGoogleLogin} className="landing-light__btn-primary landing-light__btn-lg">
              {loading ? 'WAIT...' : 'ENTER ARENA'} <FiArrowRight className="landing-light__btn-icon" />
            </button>
          </div>
          <div className="landing-light__mode-right">
            <div className="landing-light__receipt landing-light__receipt--red">
              <div className="landing-light__receipt-header">
                <div>
                  <div className="landing-light__receipt-label">ENTRY FEE</div>
                  <div className="landing-light__receipt-value">₹50</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="landing-light__receipt-label">WINNER GETS</div>
                  <div className="landing-light__receipt-value">₹250</div>
                </div>
              </div>
              <div className="landing-light__receipt-body">
                <div className="landing-light__receipt-row" style={{ fontWeight: 800 }}>
                  <span>PLAYERS</span>
                  <span>10</span>
                </div>
                
                <div className="landing-light__receipt-divider"></div>
                
                <div className="landing-light__receipt-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>WINNER GETS</div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>Most kills when the clock hits 0</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c92a2a' }}>₹250</div>
                </div>
                
                <div className="landing-light__receipt-divider"></div>
                
                <div className="landing-light__receipt-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>EACH OF THE REST GETS</div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>1% of the ₹500 pool</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹5</div>
                </div>
                
                <div className="landing-light__receipt-footer">
                  *50 × 10 = ₹500 POOL · -₹250 WINNER · -9×₹5 = ₹45<br/>
                  <b>PLATFORM FEE = ₹205</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-light__footer">
          <div className="landing-light__footer-pill">
            © OVERRUN - PLAY-MONEY MVP. NOT YET A REAL-MONEY PLATFORM.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
