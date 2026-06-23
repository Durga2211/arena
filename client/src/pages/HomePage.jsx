import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useSocket } from '../context/SocketContext';
import { roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import './HomePage.css';


const HomePage = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

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
        // Remove or mark cancelled
        if (data && data.roomId) {
          setAvailableRooms((prev) => prev.filter(r => r.id !== data.roomId && r.id !== data.id));
        }
      });
      
      return () => {
        socket.off('room:new');
        socket.off('room:update');
        socket.off('room:cancelled');
      };
    }
  }, [socket]);

  const loadData = async () => {
    try {
      const [roomsRes, historyRes] = await Promise.all([
        roomAPI.getAvailable(),
        roomAPI.getHistory(),
      ]);
      setAvailableRooms(roomsRes.data.rooms);
      setRecentGames(historyRes.data.history);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleJoinRoom = async (roomId, entryFee) => {
    if (balance < entryFee) {
      toast.error(`Insufficient balance. You need ₹${entryFee} to join.`);
      navigate('/wallet');
      return;
    }

    setJoining(true);
    try {
      const { data } = await roomAPI.join({ roomId, entryFee });
      toast.success(`Joined room ${data.room.roomCode}!`);
      navigate(`/lobby/${data.room.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="page">
      <div className="container home">
        {/* Welcome */}
        <div className="home__welcome">
          <h1 className="home__greeting">
            Hey, <span className="home__greeting-name">{user?.username}</span> <span className="home__greeting-wave">👋</span>
          </h1>
          <p className="home__greeting-sub">Ready to test your knowledge?</p>
        </div>

        {/* Stats */}
        <div className="home__stats">
          <div className="home__stat-card glass-card" style={{ animationDelay: '0.05s' }}>
            <div className="home__stat-icon home__stat-icon--wallet">💰</div>
            <div>
              <div className="home__stat-value">₹{balance.toLocaleString('en-IN')}</div>
              <div className="home__stat-label">Wallet Balance</div>
            </div>
          </div>
          <div className="home__stat-card glass-card" style={{ animationDelay: '0.1s' }}>
            <div className="home__stat-icon home__stat-icon--games">🎮</div>
            <div>
              <div className="home__stat-value">{user?.totalGamesPlayed || 0}</div>
              <div className="home__stat-label">Games Played</div>
            </div>
          </div>
          <div className="home__stat-card glass-card" style={{ animationDelay: '0.15s' }}>
            <div className="home__stat-icon home__stat-icon--wins">🏆</div>
            <div>
              <div className="home__stat-value">{user?.totalWins || 0}</div>
              <div className="home__stat-label">Total Wins</div>
            </div>
          </div>
          <div className="home__stat-card glass-card" style={{ animationDelay: '0.2s' }}>
            <div className="home__stat-icon home__stat-icon--earnings">💎</div>
            <div>
              <div className="home__stat-value">₹{(user?.totalEarnings || 0).toLocaleString('en-IN')}</div>
              <div className="home__stat-label">Total Earnings</div>
            </div>
          </div>
        </div>

        {/* Quick Play */}
        <h2 className="home__section-title">
          <span className="home__section-icon">🚀</span>
          Quick Play
        </h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={() => handleJoinRoom(null, 100)} disabled={joining}>
            🧠 Quiz Match (₹100)
          </button>
          <button className="btn btn--accent" onClick={() => {
            if (balance < 100) { navigate('/wallet'); return; }
            setJoining(true);
            roomAPI.join({ entryFee: 100, gameType: 'shooter' })
              .then(res => navigate(`/lobby/${res.data.room.id}`))
              .catch(err => toast.error('Failed to join room'))
              .finally(() => setJoining(false));
          }} disabled={joining}>
            🔫 Shooter Arena (₹100)
          </button>
          <button className="btn" style={{ background: '#00ff64', color: '#000', fontWeight: 700 }} onClick={() => {
            if (balance < 100) { navigate('/wallet'); return; }
            setJoining(true);
            roomAPI.join({ entryFee: 100, gameType: 'mines' })
              .then(res => navigate(`/lobby/${res.data.room.id}`))
              .catch(err => toast.error('Failed to join room'))
              .finally(() => setJoining(false));
          }} disabled={joining}>
            💣 Mines Jackpot (₹100)
          </button>
        </div>

        {/* Arena Room */}
        <h2 className="home__section-title">
          <span className="home__section-icon">⚡</span>
          Available Rooms
        </h2>
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

                  <div className="home__arena-info">
                    <div className="home__arena-info-row">
                      <span>Prize Pool</span>
                      <span className="home__arena-info-value">₹{room.prizePool}</span>
                    </div>
                    <div className="home__arena-info-row">
                      <span>Players</span>
                      <span className="home__arena-info-value">{room.playerCount}/{room.maxPlayers}</span>
                    </div>
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
                    {joining ? (
                      <span className="spinner spinner--sm"></span>
                    ) : isFull ? (
                      'Room Full - Cannot Join'
                    ) : (
                      `⚡ Join for ₹${room.entryFee}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {availableRooms.length === 0 && (
            <div className="home__empty">
              <span className="home__empty-icon">🛋️</span>
              No active rooms available right now. Check back soon!
            </div>
          )}
        </div>


        {/* Recent Games */}
        <h2 className="home__section-title">
          <span className="home__section-icon">📋</span>
          Recent Games
        </h2>
        <div className="home__recent glass-card">
          {recentGames.length > 0 ? (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="home__recent-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Entry</th>
                    <th>Rank</th>
                    <th>Score</th>
                    <th>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map((game, i) => (
                    <tr key={i}>
                      <td>{game.roomCode}</td>
                      <td>₹{game.entryFee}</td>
                      <td>
                        <span className={`badge ${game.rank <= 3 ? 'badge--accent' : 'badge--primary'}`}>
                          #{game.rank}
                        </span>
                      </td>
                      <td>{game.score}</td>
                      <td style={{ fontWeight: 600 }}>
                        {game.prize > 0 ? (
                          <span style={{ color: 'var(--success)' }}>+₹{game.prize}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="home__empty">
              <span className="home__empty-icon">🎮</span>
              No games played yet. Join the arena to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
