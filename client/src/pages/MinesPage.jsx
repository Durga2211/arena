import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './MinesPage.css';

const TOTAL_TIME = 30;

const MinesPage = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [minesData, setMinesData] = useState([]); // Array of 3 indices
  const [revealed, setRevealed] = useState(new Array(25).fill(false));
  const [gameStatus, setGameStatus] = useState('WAITING'); // WAITING, DIGGING, ELIMINATED, FINISHED
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [gemsFound, setGemsFound] = useState(0);
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalResults, setFinalResults] = useState(null);
  
  // Sounds
  const zapSound = useMemo(() => new Audio('/sounds/zap.mp3'), []);
  const explosionSound = useMemo(() => new Audio('/sounds/explosion.mp3'), []);

  useEffect(() => {
    if (!socket) return;

    socket.on('mines:start', ({ mines, startTime, players }) => {
      setMinesData(mines);
      setGameStatus('DIGGING');
      // Initialize everyone in leaderboard
      setLeaderboard(() => {
        return players?.map(p => ({
          userId: String(p.userId),
          username: p.username,
          avatar: p.avatar,
          status: 'DIGGING',
          gems: 0,
        })) || [];
      });
    });

    socket.on('mines:update', (data) => {
      setLeaderboard((prev) => {
        const idx = prev.findIndex(p => String(p.userId) === String(data.userId));
        if (idx !== -1) {
          const newLb = [...prev];
          newLb[idx] = { ...newLb[idx], status: data.status, gems: data.gems };
          return newLb;
        }
        return [...prev, { userId: String(data.userId), status: data.status, gems: data.gems }];
      });
    });

    socket.on('mines:end', (data) => {
      setGameStatus('FINISHED');
      setFinalResults(data);
    });

    socket.emit('room:join', { roomId });

    return () => {
      socket.off('mines:start');
      socket.off('mines:update');
      socket.off('mines:end');
    };
  }, [socket, roomId, user?.id, user?._id, user?.username, user?.avatar]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (gameStatus === 'DIGGING' || gameStatus === 'ELIMINATED') {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStatus]);

  const handleTileClick = useCallback((index) => {
    if (gameStatus !== 'DIGGING') return;
    if (revealed[index]) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    // Is it first click?
    const isFirstClick = revealed.filter(v => v).length === 0;
    if (isFirstClick) {
      socket.emit('mines:click', { roomId });
    }

    if (minesData.includes(index)) {
      // Hit a mine!
      explosionSound.play().catch(e => console.warn(e));
      setGameStatus('ELIMINATED');
      const survivalTime = (TOTAL_TIME - timeRemaining) * 1000; // rough ms
      socket.emit('mines:eliminated', { roomId, gems: gemsFound, survivalTime });
    } else {
      // Hit a gem!
      zapSound.play().catch(e => console.warn(e));
      const newGems = gemsFound + 1;
      setGemsFound(newGems);
      socket.emit('mines:gem', { roomId });
    }
  }, [gameStatus, revealed, minesData, gemsFound, timeRemaining, socket, roomId, explosionSound, zapSound]);

  const handleNextMatch = () => {
    navigate('/home');
  };

  const timerDeg = (timeRemaining / TOTAL_TIME) * 360;
  const timerColor = timeRemaining > 10 ? 'var(--success)' : 'var(--danger)';

  const myResult = finalResults?.results?.find(r => String(r.userId) === String(user?.id || user?._id));

  return (
    <div className="mines-container">
      {/* SIDEBAR DASHBOARD */}
      <div className="mines-sidebar">
        <div className="sidebar-header">
          <h2>MINES</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Pool: {finalResults ? finalResults.prizePool : '???'} INR
          </div>
        </div>

        <div className="timer-container">
          <div className="timer-circle" style={{ '--timer-deg': `${timerDeg}deg`, '--timer-color': timerColor }}>
            <span className="timer-text">{timeRemaining}</span>
          </div>
        </div>

        <div className="leaderboard-container">
          {leaderboard.map(p => (
            <div key={p.userId} className={`leaderboard-item ${String(p.userId) === String(user?.id || user?._id) ? 'me' : ''} ${p.status === 'ELIMINATED' ? 'eliminated' : ''}`}>
              <div className="player-info">
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border-hover)' }} />
                <div>
                  <div className="player-name">{String(p.userId) === String(user?.id || user?._id) ? 'You' : p.username || 'Player'}</div>
                  <div className={`player-status status-${p.status.toLowerCase()}`}>{p.status}</div>
                </div>
              </div>
              <div className="player-gems">{p.gems}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="mines-main">
        {gameStatus === 'WAITING' ? (
          <h2>GENERATING UNIQUE GRID...</h2>
        ) : (
          <div className="mines-grid-wrapper">
            <div className="mines-grid">
              {Array.from({ length: 25 }).map((_, idx) => {
                const isRevealed = revealed[idx];
                const isMine = minesData.includes(idx);
                
                let tileClass = 'mine-tile';
                if (isRevealed) {
                  tileClass += ' revealed';
                  tileClass += isMine ? ' mine' : ' gem';
                }
                if (gameStatus !== 'DIGGING' && !isRevealed) {
                  tileClass += ' disabled';
                }

                return (
                  <div 
                    key={idx} 
                    className={tileClass}
                    onClick={() => handleTileClick(idx)}
                  >
                    {isRevealed && (isMine ? '💣' : '💎')}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RE-QUEUE TRAP MODAL */}
        {gameStatus === 'ELIMINATED' && (
          <div className="mines-modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
            <div className="mines-modal" style={{ border: '2px solid var(--danger)', boxShadow: '0 0 30px rgba(255,50,50,0.3)' }}>
              <h1 className="lose" style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>KABOOM! 💥</h1>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                You hit a mine at {gemsFound} gems. Don't let them take your spot on the leaderboard.
              </p>
              <button 
                className="btn" 
                style={{ background: 'var(--danger)', color: '#fff', fontSize: '1.2rem', padding: '15px 30px', width: '100%', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
                onClick={() => navigate('/matchmaking')}
              >
                GET REVENGE: REMATCH NOW!
              </button>
              <button className="btn btn--outline" style={{ marginTop: '15px', width: '100%', borderColor: 'transparent' }} onClick={() => navigate('/home')}>
                Return to Lobby
              </button>
            </div>
          </div>
        )}

        {/* FINISHED MODAL */}
        {gameStatus === 'FINISHED' && finalResults && (
          <div className="mines-modal-overlay">
            <div className="mines-modal">
              <h1 className={myResult?.rank === 1 ? 'win' : 'lose'}>
                {myResult?.rank === 1 ? 'JACKPOT WINNER!' : 'ELIMINATED'}
              </h1>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                You found {myResult?.gems} gems and placed #{myResult?.rank}!
              </p>
              <h2 style={{ margin: '2rem 0' }}>
                +{myResult?.prize || 0} INR
              </h2>
              <button className="btn btn--primary" onClick={handleNextMatch}>
                NEXT MATCH
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinesPage;
