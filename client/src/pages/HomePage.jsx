import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import './HomePage.css';


const HomePage = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { socket } = useSocket();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [enabledGames, setEnabledGames] = useState({ quiz: true, shooter: true, mines: true });
  const [globalStats, setGlobalStats] = useState({ online: 0, inRoom: 0, available: 0 });

  // Custom Mines State
  const [showMinesModal, setShowMinesModal] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [customEntryFee, setCustomEntryFee] = useState(50);
  const [customMaxPlayers, setCustomMaxPlayers] = useState(2);

  useEffect(() => {
    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    loadData();

    if (socket) {
      socket.on('room:new', (newRoom) => {
        setAvailableRooms((prev) => [newRoom, ...prev]);
      });
      socket.on('room:update', (updatedData) => {
        setAvailableRooms((prev) => prev.map(r => r.id === updatedData.id ? { ...r, ...updatedData } : r));
      });
      socket.on('room:cancelled', (data) => {
        if (data && data.roomId) {
          setAvailableRooms((prev) => prev.filter(r => r.id !== data.roomId && r.id !== data.id));
        }
      });
      socket.on('stats:update', (stats) => {
        setGlobalStats(stats);
      });
      
      return () => {
        socket.off('room:new');
        socket.off('room:update');
        socket.off('room:cancelled');
        socket.off('stats:update');
      };
    }
  }, [socket]);

  const loadData = async () => {
    try {
      const [roomsRes, historyRes, settingsRes] = await Promise.all([
        roomAPI.getAvailable(),
        roomAPI.getHistory(),
        roomAPI.getSettings()
      ]);
      setAvailableRooms(roomsRes.data.rooms);
      setRecentGames(historyRes.data.history);
      if (settingsRes.data.enabledGames) {
        setEnabledGames(settingsRes.data.enabledGames);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleJoinRoom = async (roomId, entryFee, gameType = 'quiz') => {
    if (balance < entryFee) {
      toast.error(`Insufficient balance. You need ₹${entryFee} to join.`);
      navigate('/wallet');
      return;
    }

    setJoining(true);
    try {
      const payload = roomId ? { roomId, entryFee } : { entryFee, gameType };
      const { data } = await roomAPI.join(payload);
      toast.success(`Joined ${gameType} match!`);
      navigate(`/lobby/${data.room.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateCustomMines = async (e) => {
    e.preventDefault();
    if (balance < customEntryFee) {
      toast.error(`Insufficient balance. You need ₹${customEntryFee} to create this room.`);
      navigate('/wallet');
      return;
    }
    try {
      setJoining(true);
      const { data } = await roomAPI.createCustomMinesRoom({ entryFee: customEntryFee, maxPlayers: customMaxPlayers });
      toast.success(customMaxPlayers === 2 ? 'Duel room created!' : 'Jackpot room created!');
      navigate(`/lobby/${data.room.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create custom room');
    } finally {
      setJoining(false);
      setShowMinesModal(false);
    }
  };

  const handleJoinCustomMines = async (e) => {
    e.preventDefault();
    if (!roomCodeInput || roomCodeInput.length !== 4) {
      toast.error('Please enter a valid 4-character room code.');
      return;
    }
    try {
      setJoining(true);
      const { data } = await roomAPI.joinRoomByCode(roomCodeInput);
      toast.success('Joined custom room!');
      navigate(`/lobby/${data.room.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoining(false);
      setShowMinesModal(false);
      setRoomCodeInput('');
    }
  };

  return (
    <div className="container home">
      {/* Welcome Hero */}
      <div className="home__hero">
        <div className="home__hero-content">
          <h1 className="home__greeting">
            Hey, <span>{user?.username}</span> <span className="home__wave">👋</span>
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '5px 15px', borderRadius: '20px', border: '1px solid rgba(0, 229, 255, 0.3)', fontSize: '0.85rem', color: '#00e5ff', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#00e5ff', borderRadius: '50%', marginRight: '5px', boxShadow: '0 0 5px #00e5ff' }}></span>
              {globalStats.online} Online
            </div>
            <div style={{ background: 'rgba(0, 255, 100, 0.1)', padding: '5px 15px', borderRadius: '20px', border: '1px solid rgba(0, 255, 100, 0.3)', fontSize: '0.85rem', color: '#00ff64', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#00ff64', borderRadius: '50%', marginRight: '5px', boxShadow: '0 0 5px #00ff64' }}></span>
              {globalStats.available} Available
            </div>
            <div style={{ background: 'rgba(255, 100, 100, 0.1)', padding: '5px 15px', borderRadius: '20px', border: '1px solid rgba(255, 100, 100, 0.3)', fontSize: '0.85rem', color: '#ff6464', whiteSpace: 'nowrap' }}>
              {globalStats.inRoom} In Game
            </div>
          </div>
        </div>
        <div className="home__hero-art">
          <div className="home__hero-controller">🎮</div>
        </div>
      </div>

      {/* Stats */}
      <div className="home__stats-grid">
        <div className="home__stat-box glass-card delay-1">
          <div className="home__stat-icon-wrapper home__stat-icon-wrapper--red">💰</div>
          <div className="home__stat-info">
            <div className="home__stat-val">₹{balance.toLocaleString('en-IN')}</div>
            <div className="home__stat-lbl">WALLET BALANCE</div>
          </div>
        </div>
        <div className="home__stat-box glass-card delay-2">
          <div className="home__stat-icon-wrapper home__stat-icon-wrapper--green">🎮</div>
          <div className="home__stat-info">
            <div className="home__stat-val">{user?.totalGamesPlayed || 0}</div>
            <div className="home__stat-lbl">GAMES PLAYED</div>
          </div>
        </div>
        <div className="home__stat-box glass-card delay-3">
          <div className="home__stat-icon-wrapper home__stat-icon-wrapper--yellow">🏆</div>
          <div className="home__stat-info">
            <div className="home__stat-val">{user?.totalWins || 0}</div>
            <div className="home__stat-lbl">TOTAL WINS</div>
          </div>
        </div>
        <div className="home__stat-box glass-card delay-4">
          <div className="home__stat-icon-wrapper home__stat-icon-wrapper--blue">💎</div>
          <div className="home__stat-info">
            <div className="home__stat-val">₹{(user?.totalEarnings || 0).toLocaleString('en-IN')}</div>
            <div className="home__stat-lbl">TOTAL EARNINGS</div>
          </div>
        </div>
      </div>

      {/* Quick Play */}
      <div className="home__section-header">
        <span className="home__section-icon">🚀</span>
        <h2>Quick Play</h2>
        <button className="home__view-all">View All &gt;</button>
      </div>
      <div className="home__quickplay-grid">
        {enabledGames.quiz && (
          <div className="quick-play-card quick-play-card--quiz" onClick={() => handleJoinRoom(null, 100, 'quiz')}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">🧠⚡</div>
              <div className="quick-play-card__info">
                <h3>QUIZ MATCH</h3>
                <p><span></span> ₹100 Entry</p>
              </div>
            </div>
            <div className="quick-play-card__action">
              <span>Play Now</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}

        {enabledGames.shooter && (
          <div className="quick-play-card quick-play-card--shooter" onClick={() => handleJoinRoom(null, 100, 'shooter')}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">🔫🎯</div>
              <div className="quick-play-card__info">
                <h3>SHOOTER ARENA</h3>
                <p><span></span> ₹100 Entry</p>
              </div>
            </div>
            <div className="quick-play-card__action">
              <span>Play Now</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}

        {enabledGames.minesJackpot !== false && (
          <div className="quick-play-card quick-play-card--mines" onClick={() => setShowMinesModal(true)}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">💣💀</div>
              <div className="quick-play-card__info">
                <h3>MINES JACKPOT</h3>
                <p><span></span> Custom Match</p>
              </div>
            </div>
            <div className="quick-play-card__action">
              <span>Play Now</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}

        {enabledGames.minesDuels !== false && (
          <div className="quick-play-card" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', border: '1px solid #00ff64' }} onClick={() => setShowMinesModal(true)}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">⚔️</div>
              <div className="quick-play-card__info">
                <h3 style={{ color: '#00ff64' }}>MINES DUELS</h3>
                <p><span></span> ₹50 Entry (1v1)</p>
              </div>
            </div>
            <div className="quick-play-card__action" style={{ color: '#00ff64' }}>
              <span>Host/Join</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}

        {enabledGames.minesArena !== false && (
          <div className="quick-play-card" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', border: '1px solid #00e5ff' }} onClick={() => navigate('/matchmaking')}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">📡</div>
              <div className="quick-play-card__info">
                <h3 style={{ color: '#00e5ff' }}>MINES ARENA</h3>
                <p><span></span> Public Matchmaking</p>
              </div>
            </div>
            <div className="quick-play-card__action" style={{ color: '#00e5ff' }}>
              <span>Find Match</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}

        {enabledGames.minesGlobalTimeline !== false && (
          <div className="quick-play-card" style={{ background: 'linear-gradient(135deg, #2b0042 0%, #590089 100%)', border: '1px solid #d400ff' }} onClick={() => navigate('/mines-global')}>
            <div className="quick-play-card__content">
              <div className="quick-play-card__icon">🌍⏳</div>
              <div className="quick-play-card__info">
                <h3 style={{ color: '#d400ff' }}>GLOBAL TIMELINE</h3>
                <p><span></span> Live Sync Mode</p>
              </div>
            </div>
            <div className="quick-play-card__action" style={{ color: '#d400ff' }}>
              <span>Enter Lobby</span>
              <HiOutlineArrowRight />
            </div>
          </div>
        )}
      </div>

      {/* Available Rooms */}
      <div className="home__section-header">
        <span className="home__section-icon" style={{ color: 'var(--warning)' }}>⚡</span>
        <h2>Available Rooms</h2>
        <button className="home__view-all">View All &gt;</button>
      </div>
      
      <div className="home__rooms-container glass-card">
        {availableRooms.length === 0 ? (
          <div className="home__empty-state">
            <div className="home__empty-illustration">
              {theme === 'dark' ? '🛸' : '🛋️'}
            </div>
            <p>No active rooms available right now.</p>
            <p className="home__empty-sub">Check back soon!</p>
          </div>
        ) : (
          <div className="home__arena-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {availableRooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              return (
                <div key={room.id} className="home__arena-card glass-card">
                  <div className="home__arena-header">
                    <div className="home__arena-live-badge" style={{ color: isFull ? 'var(--text-secondary)' : 'var(--primary)', borderColor: isFull ? 'var(--text-secondary)' : 'var(--primary)' }}>
                      <span className="home__arena-live-dot" style={{ background: isFull ? 'var(--text-secondary)' : 'var(--primary)' }}></span>
                      {isFull ? 'FULL' : 'WAITING'}
                    </div>
                    <div className="home__arena-tier" style={{ textTransform: 'uppercase' }}>
                      {room.gameType === 'shooter' ? '🔫 SHOOTER ' : room.gameType === 'mines' ? '💣 MINES ' : '🧠 QUIZ '}
                      #{room.roomCode}
                    </div>
                  </div>

                  <div className="home__arena-body">
                    <div className="home__arena-fee">
                      ₹{room.entryFee} <span>entry</span>
                    </div>
                    <div className="home__arena-players-bar">
                      <div
                        className="home__arena-players-fill"
                        style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%`, background: isFull ? 'var(--danger)' : 'var(--primary)' }}
                      ></div>
                    </div>
                    <button
                      className={`btn btn--full btn--lg home__arena-btn ${isFull ? 'btn--outline' : 'btn--primary'}`}
                      onClick={() => handleJoinRoom(room.id, room.entryFee)}
                      disabled={joining || isFull}
                    >
                      {joining ? <span className="spinner spinner--sm"></span> : isFull ? 'Room Full' : `⚡ Join for ₹${room.entryFee}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Games */}
      <div className="home__section-header">
        <span className="home__section-icon" style={{ filter: 'grayscale(1)' }}>📋</span>
        <h2>Recent Games</h2>
        <button className="home__view-all">View All &gt;</button>
      </div>
      
      <div className="home__recent-container glass-card">
        {recentGames.length > 0 ? (
          <table className="home__recent-table">
            <thead>
              <tr>
                <th>GAME NAME</th>
                <th>ENTRY FEE</th>
                <th>PLAYERS</th>
                <th>STATUS</th>
                <th>PLAYED ON</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game, i) => (
                <tr key={i}>
                  <td>
                    <div className="home__recent-game-name">
                      {game.gameType === 'shooter' ? '🔫' : game.gameType === 'mines' ? '💣' : '🧠'}
                      <span>{game.gameType === 'shooter' ? 'Shooter Arena' : game.gameType === 'mines' ? 'Mines Jackpot' : 'Quiz Match'}</span>
                    </div>
                  </td>
                  <td>₹{game.entryFee}</td>
                  <td>{game.playerCount || '-'} / {game.maxPlayers || '-'}</td>
                  <td><span className="badge badge--success">Completed</span></td>
                  <td>{new Date(game.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="home__empty-state">
            <p>No games played yet. Join the arena to get started!</p>
          </div>
        )}
      </div>
      {/* Custom Mines Modal */}
      {showMinesModal && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowMinesModal(false)}>
          <div className="modal-content glass-card animate-scaleIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: 'var(--space-xl)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', color: '#00ff64' }}>💎 Custom Mines Room</h2>
              <button className="modal-close-btn" onClick={() => setShowMinesModal(false)} style={{ background: 'none', border: 'none', fontSize: 'var(--font-xl)', color: 'var(--text-secondary)', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <p style={{ margin: '0 0 var(--space-lg) 0', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Create a customized room or join an existing one using a 4-character code.</p>
                
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexDirection: 'column' }}>
              
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '1rem' }}>Create Room</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Entry Fee (₹)</label>
                    <input type="number" className="input" value={customEntryFee} onChange={(e) => setCustomEntryFee(Number(e.target.value))} min="50" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Players (2-10)</label>
                    <input type="number" className="input" value={customMaxPlayers} onChange={(e) => setCustomMaxPlayers(Number(e.target.value))} min="2" max="10" style={{ width: '100%' }} />
                  </div>
                </div>
                <button className="btn btn--success" style={{ width: '100%', background: '#00ff64', color: '#000' }} onClick={handleCreateCustomMines} disabled={joining}>
                  {joining ? 'Creating...' : `Create ${customMaxPlayers === 2 ? 'Duel' : 'Jackpot'} Room`}
                </button>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>OR</div>
              
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '1rem' }}>Join Room</h3>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <input 
                    type="text" 
                    placeholder="4-Char Code" 
                    maxLength={4}
                    className="input" 
                    style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  />
                  <button className="btn btn--outline" onClick={handleJoinCustomMines} disabled={joining}>
                    {joining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;

