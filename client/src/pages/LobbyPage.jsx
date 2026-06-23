import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import './LobbyPage.css';

const LobbyPage = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoom();

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? No refunds will be issued.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('room:join', { roomId });

    socket.on('room:state', (data) => {
      setPlayers(data.players);
    });

    socket.on('room:player-joined', (data) => {
      setPlayers((prev) => {
        const exists = prev.some((p) => p.userId === data.player.userId);
        if (exists) return prev;
        return [...prev, data.player];
      });
    });

    socket.on('room:player-left', (data) => {
      setPlayers((prev) => prev.filter((p) => p.userId !== data.playerId));
    });

    socket.on('room:countdown', (data) => {
      setCountdown(data.seconds);
    });

    socket.on('quiz:start', () => {
      navigate(`/quiz/${roomId}`);
    });

    socket.on('shooter:start', () => {
      navigate(`/shooter/${roomId}`);
    });

    socket.on('room:full', () => {
      // Room is full, countdown will start
    });

    socket.on('room:cancelled', () => {
      toast.error('Room was ended by admin. Your entry fee has been refunded.');
      navigate('/home');
    });

    return () => {
      socket.off('room:state');
      socket.off('room:player-joined');
      socket.off('room:player-left');
      socket.off('room:countdown');
      socket.off('quiz:start');
      socket.off('room:full');
      socket.off('room:cancelled');
    };
  }, [socket, roomId, navigate]);

  const loadRoom = async () => {
    try {
      const { data } = await roomAPI.getDetails(roomId);
      setRoom(data.room);
      setPlayers(data.room.players);

      if (data.room.status === 'active') {
        if (data.room.gameType === 'shooter') {
          navigate(`/shooter/${roomId}`);
        } else {
          navigate(`/quiz/${roomId}`);
        }
      } else if (data.room.status === 'completed') {
        navigate(`/results/${roomId}`);
      }
    } catch (err) {
      console.error('Failed to load room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave? You will forfeit your entry fee and NO REFUNDS will be issued.')) {
      try {
        await roomAPI.leave(roomId);
        toast.success('You have left the room and forfeited your entry fee.');
        navigate('/home');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to leave room');
      }
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const slots = Array.from({ length: 10 }, (_, i) => players[i] || null);

  return (
    <div className="page">
      <div className="container lobby">
        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="countdown-overlay">
            <div className="countdown-number" key={countdown}>{countdown}</div>
            <div className="countdown-label">{room?.gameType === 'shooter' ? 'Game' : 'Quiz'} starting...</div>
          </div>
        )}

        <div className="lobby__header">
          <div className="lobby__room-code" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
            ROOM: {room?.roomCode}
            <button className="btn btn--outline btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={handleLeave}>
              Leave Room
            </button>
          </div>
          <h1 className="lobby__title">Waiting for Players</h1>
          <p className="lobby__subtitle">
            {players.length}/10 players joined
          </p>

          <div className="lobby__info">
            <div className="lobby__info-item">
              <div className="lobby__info-value" style={{ color: 'var(--accent)' }}>
                ₹{room?.entryFee}
              </div>
              <div className="lobby__info-label">Entry Fee</div>
            </div>
            <div className="lobby__info-item">
              <div className="lobby__info-value" style={{ color: 'var(--warning)' }}>
                ₹{room?.prizePool}
              </div>
              <div className="lobby__info-label">Prize Pool</div>
            </div>
            <div className="lobby__info-item">
              <div className="lobby__info-value">
                {room?.gameType === 'shooter' ? '1 Min' : '10'}
              </div>
              <div className="lobby__info-label">
                {room?.gameType === 'shooter' ? 'Duration' : 'Questions'}
              </div>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        <div className="lobby__grid">
          {slots.map((player, i) => (
            <div
              key={i}
              className={`lobby__slot ${
                player
                  ? player.userId === user?.id
                    ? 'lobby__slot--filled lobby__slot--you'
                    : 'lobby__slot--filled'
                  : 'lobby__slot--empty'
              }`}
              style={player ? { animationDelay: `${i * 0.05}s` } : {}}
            >
              {player ? (
                <>
                  <div className="lobby__slot-avatar">
                    {player.avatar?.startsWith('http') ? (
                      <img src={player.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      player.avatar
                    )}
                  </div>
                  <div className="lobby__slot-name">
                    {player.userId === user?.id ? 'You' : player.username}
                  </div>
                </>
              ) : (
                <div className="lobby__slot-icon">👤</div>
              )}
            </div>
          ))}
        </div>

        {/* Waiting indicator */}
        {players.length < 10 && (
          <div className="lobby__waiting">
            <div className="lobby__waiting-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="lobby__waiting-text">
              Waiting for {10 - players.length} more player{10 - players.length !== 1 ? 's' : ''}...
            </p>
            <button
              className="btn btn--outline btn--sm"
              style={{ marginTop: '1rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
              onClick={async () => {
                try {
                  const docEl = document.documentElement;
                  if (docEl.requestFullscreen) {
                    await docEl.requestFullscreen();
                  } else if (docEl.webkitRequestFullscreen) {
                    await docEl.webkitRequestFullscreen();
                  }
                  if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                  }
                } catch (err) {
                  console.warn("Fullscreen/orientation lock failed:", err);
                }
                socket.emit('room:force-start', { roomId });
              }}
            >
              Play Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
