import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { joinGlobalMines, submitGlobalMines } from '../services/api';
import toast from 'react-hot-toast';
import './MinesGlobalPage.css';

const MinesGlobalPage = () => {
  const { user } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const navigate = useNavigate();

  const [currentSecond, setCurrentSecond] = useState(new Date().getSeconds());
  const [phase, setPhase] = useState(new Date().getSeconds() < 30 ? 'LOBBY' : 'WAITING_NEXT');
  
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  
  const [config, setConfig] = useState({ entryFee: 50, totalPlayers: 10, winnerPrizePercent: 50, loserPrizePercent: 1 });
  const [roundId, setRoundId] = useState(null);
  
  const [bots, setBots] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]); // Visual leaderboard
  const [fakeJoinCount, setFakeJoinCount] = useState(1);
  
  const [minesData, setMinesData] = useState([]);
  const [revealed, setRevealed] = useState(new Array(25).fill(false));
  const [gameStatus, setGameStatus] = useState('IDLE'); // IDLE, DIGGING, ELIMINATED, FINISHED
  const [gemsFound, setGemsFound] = useState(0);
  const [firstClickTime, setFirstClickTime] = useState(null);
  const [survivalTime, setSurvivalTime] = useState(0);
  
  const [finalResult, setFinalResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Sounds
  const zapSound = useMemo(() => new Audio('/sounds/zap.mp3'), []);
  const explosionSound = useMemo(() => new Audio('/sounds/explosion.mp3'), []);

  // Global Clock Sync
  useEffect(() => {
    const interval = setInterval(() => {
      const sec = new Date().getSeconds();
      setCurrentSecond(sec);
      
      if (sec === 0) {
        // Reset everything for new round
        setPhase('LOBBY');
        setHasJoined(false);
        setBots([]);
        setLeaderboard([]);
        setFakeJoinCount(1);
        setGameStatus('IDLE');
        setRevealed(new Array(25).fill(false));
        setMinesData([]);
        setGemsFound(0);
        setFirstClickTime(null);
        setSurvivalTime(0);
        setFinalResult(null);
        setRoundId(Math.floor(Date.now() / 60000));
      } else if (sec === 30) {
        if (hasJoined) {
          setPhase('PLAYING');
          startGame();
        } else {
          setPhase('WAITING_NEXT');
        }
      } else if (sec === 59 && hasJoined && gameStatus === 'DIGGING') {
        // Force submit if they didn't blow up by end of minute
        handleGameEnd(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasJoined, gameStatus]); // Re-bind when state changes to avoid stale closures

  // Fake Lobby Joins Animation
  useEffect(() => {
    if (phase === 'LOBBY' && fakeJoinCount < config.totalPlayers) {
      const timeout = setTimeout(() => {
        setFakeJoinCount(prev => Math.min(prev + 1, config.totalPlayers));
      }, Math.random() * 3000 + 500);
      return () => clearTimeout(timeout);
    }
  }, [phase, fakeJoinCount, config.totalPlayers]);

  // Bot Simulation Logic during PLAYING phase
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    // Every second, update bot visual states based on their backend deterministic data
    const elapsedSeconds = currentSecond >= 30 ? currentSecond - 30 : 0;
    
    setLeaderboard(bots.map(bot => {
      // Has the bot blown up yet?
      if (bot.status === 'BLOWN_UP' && elapsedSeconds >= bot.survivalTime) {
        return { ...bot, displayStatus: '💥 BLOWN UP', displayGems: bot.gems };
      }
      // If surviving, scale their displayed gems based on elapsed time relative to their total survival time (or 30s)
      const maxTime = bot.status === 'BLOWN_UP' ? bot.survivalTime : 30;
      const progress = Math.min(elapsedSeconds / maxTime, 1);
      const currentVisualGems = Math.floor(progress * bot.gems);
      
      return { 
        ...bot, 
        displayStatus: 'DIGGING...', 
        displayGems: currentVisualGems 
      };
    }));

  }, [currentSecond, phase, bots]);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const res = await joinGlobalMines();
      if (res.data.success) {
        setHasJoined(true);
        setConfig(res.data.config);
        setRoundId(res.data.roundId);
        setBots(res.data.bots);
        fetchBalance();
        toast.success('Joined Global Match!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const startGame = () => {
    // Generate 3 random mines locally for this user
    const newMines = [];
    while(newMines.length < 3) {
      const r = Math.floor(Math.random() * 25);
      if(!newMines.includes(r)) newMines.push(r);
    }
    setMinesData(newMines);
    setGameStatus('DIGGING');
  };

  const handleTileClick = useCallback((index) => {
    if (gameStatus !== 'DIGGING') return;
    if (revealed[index]) return;

    if (!firstClickTime) setFirstClickTime(Date.now());

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (minesData.includes(index)) {
      // Hit a mine
      explosionSound.currentTime = 0;
      explosionSound.play().catch(e=>e);
      setGameStatus('ELIMINATED');
      handleGameEnd(false); // They blew up
    } else {
      // Safe gem
      zapSound.currentTime = 0;
      zapSound.play().catch(e=>e);
      setGemsFound(prev => prev + 1);
      
      // If found all 22 gems
      if (gemsFound + 1 === 22) {
        setGameStatus('FINISHED');
        handleGameEnd(true);
      }
    }
  }, [gameStatus, revealed, minesData, firstClickTime, gemsFound, explosionSound, zapSound]);

  const handleGameEnd = async (survived) => {
    if (submitting) return;
    setSubmitting(true);
    
    // Calculate final survival time based on when they clicked first
    let survTime = 0;
    if (firstClickTime) {
      survTime = (Date.now() - firstClickTime) / 1000;
    } else {
      // If they never clicked, survival time is 0
      survTime = 0;
    }
    
    setSurvivalTime(survTime);

    try {
      const res = await submitGlobalMines(roundId, gemsFound, survTime);
      if (res.data.success) {
        setFinalResult(res.data);
        fetchBalance();
      }
    } catch (err) {
      toast.error('Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  };

  // Sort unified leaderboard visually
  const unifiedLeaderboard = [...leaderboard];
  if (hasJoined) {
    unifiedLeaderboard.push({
      userId: user.id,
      username: user.username + ' (YOU)',
      displayGems: gemsFound,
      displayStatus: gameStatus === 'ELIMINATED' ? '💥 BLOWN UP' : (gameStatus === 'FINISHED' ? 'FINISHED' : 'DIGGING...'),
      isBot: false,
      gems: gemsFound // actual gems for sorting if needed
    });
  }

  // Visual sorting: most gems first
  unifiedLeaderboard.sort((a, b) => b.displayGems - a.displayGems);

  return (
    <div className="container mines-global">
      <div className="mines-global__header">
        <button className="btn btn--outline btn--sm" onClick={() => navigate('/home')}>← Back</button>
        <h1 style={{ color: '#d400ff', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>🌍 Global Timeline</h1>
        <div className="mines-global__clock">
          <span className="clock-icon">⏳</span>
          {currentSecond < 30 ? (
            <span style={{ color: 'var(--warning)' }}>JOINING: 00:{String(30 - currentSecond).padStart(2, '0')}</span>
          ) : (
            <span style={{ color: 'var(--danger)' }}>MATCH: 00:{String(60 - currentSecond).padStart(2, '0')}</span>
          )}
        </div>
      </div>

      <div className="mines-global__layout">
        
        {/* LEFT PANEL: GAME GRID & LOBBY */}
        <div className="mines-global__left glass-card">
          {phase === 'LOBBY' && !hasJoined && (
            <div className="mines-global__lobby-state">
              <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>HURRY UP TO JOIN! ⚠️</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Next Global Room Starts in: <strong>{30 - currentSecond}s</strong></p>
              
              <div style={{ margin: 'var(--space-xl) 0', fontSize: '1.2rem' }}>
                <span style={{ color: '#00ff64' }}>{fakeJoinCount}/{config.totalPlayers} Players Registered...</span>
              </div>

              <button className="btn btn--primary btn--lg" style={{ width: '100%', background: '#d400ff', border: 'none' }} onClick={handleJoin} disabled={joining}>
                {joining ? 'Processing...' : `⚡ Join Room for ₹${config.entryFee}`}
              </button>
            </div>
          )}

          {phase === 'LOBBY' && hasJoined && (
            <div className="mines-global__lobby-state">
              <h2 style={{ fontSize: '2rem', color: '#00ff64' }}>✔️ YOU ARE IN!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Get ready. Grid unlocks in <strong>{30 - currentSecond}s</strong></p>
              
              <div style={{ margin: 'var(--space-xl) 0', fontSize: '1.2rem' }}>
                <span>{fakeJoinCount}/{config.totalPlayers} Players Registered...</span>
              </div>
            </div>
          )}

          {phase === 'WAITING_NEXT' && !hasJoined && (
            <div className="mines-global__lobby-state">
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>MATCH IN PROGRESS</h2>
              <p style={{ color: 'var(--text-tertiary)' }}>Please wait for the next minute to join.</p>
              <div className="spinner" style={{ marginTop: 'var(--space-lg)' }}></div>
            </div>
          )}

          {(phase === 'PLAYING' || (phase === 'WAITING_NEXT' && hasJoined && finalResult)) && (
            <div className="mines-global__board-container">
              <div className="mines-global__grid">
                {revealed.map((isRevealed, idx) => {
                  const isMine = minesData.includes(idx);
                  const showMine = isRevealed && isMine;
                  const showGem = isRevealed && !isMine;
                  
                  // Reveal remaining mines if eliminated
                  const isExposedMine = gameStatus === 'ELIMINATED' && isMine && !isRevealed;

                  let tileClass = "mines-global__tile";
                  if (isRevealed) tileClass += " revealed";
                  if (isExposedMine) tileClass += " exposed";
                  if (showMine) tileClass += " exploded";
                  
                  return (
                    <button
                      key={idx}
                      className={tileClass}
                      onClick={() => handleTileClick(idx)}
                      disabled={isRevealed || gameStatus !== 'DIGGING'}
                    >
                      {showMine && <span className="mines-global__emoji">💥</span>}
                      {showGem && <span className="mines-global__emoji">💎</span>}
                      {isExposedMine && <span className="mines-global__emoji" style={{ opacity: 0.5 }}>💣</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: DASHBOARD */}
        <div className="mines-global__right">
          
          <div className="glass-card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>🏦 Active Ledger</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Your Entry:</span>
              <strong style={{ color: '#ff4444' }}>₹{config.entryFee}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Room Pool:</span>
              <strong style={{ color: '#00ff64' }}>₹{config.entryFee * config.totalPlayers} ({config.totalPlayers} Players)</strong>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>📊 Payout Formula</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
              <li style={{ marginBottom: '6px' }}>🥇 1st Place: <strong style={{ color: 'var(--text-primary)' }}>{config.winnerPrizePercent}% (₹{((config.entryFee * config.totalPlayers) * config.winnerPrizePercent) / 100})</strong></li>
              <li style={{ marginBottom: '6px' }}>🥈 Losers: <strong style={{ color: 'var(--text-primary)' }}>{config.loserPrizePercent}% each</strong></li>
              <li>💼 Platform: <strong style={{ color: 'var(--text-primary)' }}>Retains remaining</strong></li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>🔴 Live Sync Leaderboard</h3>
            <div className="mines-global__leaderboard-list">
              {unifiedLeaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', marginTop: 'var(--space-xl)' }}>Waiting for players...</p>
              ) : (
                unifiedLeaderboard.map((p, i) => (
                  <div key={p.userId} className="mines-global__leaderboard-item" style={{ background: p.isBot ? 'transparent' : 'rgba(212, 0, 255, 0.1)', border: p.isBot ? 'none' : '1px solid rgba(212, 0, 255, 0.3)' }}>
                    <span style={{ fontWeight: 'bold', width: '20px' }}>#{i+1}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
                    <span style={{ color: '#00cc66', fontWeight: 'bold', width: '30px', textAlign: 'right' }}>{p.displayGems}</span>
                    <span style={{ fontSize: '0.8rem', color: p.displayStatus.includes('BLOWN') ? '#ff4444' : 'var(--text-secondary)', width: '80px', textAlign: 'right' }}>
                      {p.displayStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* FINAL RESULT OVERLAY */}
      {finalResult && (
        <div className="modal-overlay animate-fadeIn" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-card animate-scaleIn" style={{ textAlign: 'center', padding: 'var(--space-2xl)', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 var(--space-md) 0' }}>
              {finalResult.rank === 1 ? '🏆 VICTORY!' : '🛡️ SHIELD RETURN'}
            </h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              You placed <strong>#{finalResult.rank}</strong>
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: finalResult.prize > 0 ? '#00ff64' : 'var(--text-secondary)', margin: 'var(--space-lg) 0' }}>
              {finalResult.prize > 0 ? `+₹${finalResult.prize} Credited!` : 'No Prize'}
            </div>
            
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)' }}>
              {finalResult.rank === 1 
                ? 'You survived the longest and claimed the jackpot!' 
                : 'Consolation prize activated. Better luck next time!'}
            </p>

            <button className="btn btn--primary btn--full" onClick={() => setFinalResult(null)}>
              Close & Wait For Next Round
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MinesGlobalPage;
