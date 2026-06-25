import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, firebaseConfigStatus } from '../config/firebase';
import toast from 'react-hot-toast';

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
    <div className="dark">
      <div className="bg-background text-on-background min-h-screen font-body-md">
                
{/*  Top Navigation  */}
<header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-outline-variant">
<nav className="flex justify-between items-center w-full px-6 md:px-margin-page py-4 max-w-container-max mx-auto">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tighter">OVERRUN<span className="text-primary-fixed-dim">.</span></div>
<div className="hidden md:flex gap-8 items-center">
<a className="font-label-caps text-label-caps text-primary-fixed-dim border-b border-primary-fixed-dim pb-1" href="#">HOME</a>
<a className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface transition-colors" href="#">ARENA</a>
<a className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface transition-colors" href="#">LEADERBOARD</a>
</div>
<div className="flex items-center gap-4">
</div>
</nav>
</header>
<main>
{/*  Hero Section  */}
<section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 md:px-margin-page technical-grid overflow-hidden">
<div className="shader-overlay">
                
            </div>
<div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none"></div>
<div className="relative z-10 max-w-4xl mt-12">
<h1 className="font-headline-xl text-headline-xl mb-6 tracking-tight">
                    THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed-dim to-white">ARENA</span> AWAITS.
                </h1>
<p className="font-body-md text-body-md text-on-surface-variant mb-10 max-w-2xl mx-auto">
                    High-stakes gaming, instant rewards. Join the elite network of strategic players in the most precise performance-based gaming ecosystem ever built.
                </p>
<div className="flex justify-center">
<button onClick={handleGoogleLogin} className="bg-background border-2 border-primary-fixed-dim text-primary-fixed-dim font-label-caps text-label-caps px-12 py-5 inline-flex items-center justify-center gap-2 group transition-all text-lg font-bold tracking-widest active:scale-95 hover:bg-primary-fixed-dim hover:text-black hover:border-black">
                        {loading ? 'WAIT...' : 'ENTER ARENA'}
</button>
</div>
</div>
</section>
{/*  Mines Game Mode Section  */}
<section className="py-24 px-6 md:px-margin-page max-w-container-max mx-auto border-t border-outline-variant">
<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-2">OPERATIONAL MODES</div>
<h2 className="font-headline-lg text-headline-lg">MINES PROTOCOL</h2>
</div>
<div className="hidden md:block h-[1px] flex-grow mx-12 bg-outline-variant"></div>
<div className="font-label-mono text-label-mono text-on-surface-variant">SEC_ID: 0x24F1</div>
</div>
<div className="max-w-4xl mx-auto">
<div className="group border border-outline-variant bg-surface-container-low p-8 md:p-12 transition-all hover:bg-surface-container-high relative overflow-hidden">
<div className="shimmer absolute inset-0 pointer-events-none"></div>
<div className="flex flex-col md:flex-row gap-12 items-start relative z-10">
<div className="flex-1">
<div className="bg-primary-fixed-dim/10 text-primary-fixed-dim px-3 py-1 font-label-caps text-label-caps inline-block mb-4">STRATEGY MODE</div>
<h3 className="font-headline-xl text-headline-xl leading-none mb-6">MINES<span className="text-primary-fixed-dim">.</span></h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-8">
                                Grid-based tactical warfare. Navigate the matrix, avoid the static, and outmaneuver 9 other contenders in a test of pure spatial logic. Precision is rewarded; errors are terminated.
                            </p>
<div className="mb-10">
<div className="font-label-caps text-label-caps text-primary-fixed-dim mb-4 tracking-widest">RULES &amp; REGULATIONS</div>
<ul className="space-y-3 font-label-mono text-label-mono text-on-surface-variant text-[13px]">
<li className="flex items-center gap-3">
<span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full"></span>
                                        10 OPERATORS PER MATRIX CYCLE
                                    </li>
<li className="flex items-center gap-3">
<span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full"></span>
                                        5X5 NEURAL GRID NAVIGATION
                                    </li>
<li className="flex items-center gap-3">
<span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full"></span>
                                        SINGLE ELIMINATION PROTOCOL
                                    </li>
<li className="flex items-center gap-3">
<span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full"></span>
                                        WINNER-TAKES-ALL REWARD ALLOCATION
                                    </li>
</ul>
</div>
<button onClick={handleGoogleLogin} className="w-full bg-background border-2 border-primary-fixed-dim text-primary-fixed-dim font-label-caps text-label-caps py-5 transition-all flex justify-center items-center gap-2 text-lg font-bold active:scale-95 hover:bg-primary-fixed-dim hover:text-black hover:border-black">
                                {loading ? 'WAIT...' : 'PLAY NOW'}
</button>
</div>
<div className="w-full md:w-1/3 aspect-square border border-outline-variant bg-surface-container-lowest flex items-center justify-center relative overflow-hidden">
<div className="absolute inset-0 technical-grid opacity-30"></div>
<span className="material-symbols-outlined text-[80px] text-primary-fixed-dim/20">grid_view</span>
<div className="absolute bottom-4 left-4 font-label-mono text-[10px] text-on-surface-variant">ACTIVE MATRIX: LOADED</div>
</div>
</div>
</div>
</div>
</section>

{/*  Final CTA  */}
<section className="py-32 technical-grid border-t border-outline-variant text-center">
<div className="max-w-2xl mx-auto px-6 md:px-margin-page">
<div className="font-label-caps text-label-caps text-primary-fixed-dim mb-6 tracking-[0.4em]">SYSTEM FINALIZATION</div>
<h2 className="font-headline-xl text-headline-xl mb-10">THE ARENA DOES NOT WAIT.</h2>
<div className="flex justify-center">
<button onClick={handleGoogleLogin} className="bg-background border-2 border-primary-fixed-dim text-primary-fixed-dim font-label-caps text-label-caps px-12 py-5 transition-all inline-flex items-center justify-center text-lg font-bold tracking-widest active:scale-95 hover:bg-primary-fixed-dim hover:text-black hover:border-black">
                    {loading ? 'WAIT...' : 'ENTER THE ARENA NOW'}
                </button>
</div>
</div>
</section>
</main>
{/*  Footer  */}
<footer className="bg-surface-container-lowest border-t border-outline-variant">
<div className="flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-margin-page py-8 max-w-container-max mx-auto">
<div className="font-label-caps text-label-caps text-on-surface mb-4 md:mb-0">OVERRUN<span className="text-primary-fixed-dim">.</span></div>
<div className="font-label-mono text-label-mono text-on-surface-variant text-center mb-4 md:mb-0">
                © 2024 OVERRUN PERFORMANCE GAMING. ALL SYSTEMS NOMINAL.
            </div>
<div className="flex gap-6">
<a className="font-label-mono text-label-mono text-on-surface-variant hover:text-primary transition-colors" href="#">TERMS</a>
<a className="font-label-mono text-label-mono text-on-surface-variant hover:text-primary transition-colors" href="#">PRIVACY</a>
<a className="font-label-mono text-label-mono text-on-surface-variant hover:text-primary transition-colors" href="#">TELEMETRY</a>
<a className="font-label-mono text-label-mono text-on-surface-variant hover:text-primary transition-colors" href="#">STATUS</a>
</div>
</div>
</footer>


      </div>
    </div>
  );
};

export default LandingPage;
