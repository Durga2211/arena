import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';
import './RadarMatchmaking.css';

const RadarMatchmaking = () => {
  const [betAmount, setBetAmount] = useState(50);
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState(['Radar system online. Awaiting coordinates...']);
  const [matchFound, setMatchFound] = useState(false);
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { balance } = useWallet();
  const logsEndRef = useRef(null);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartSearch = () => {
    if (betAmount < 50 || betAmount > 250) {
      toast.error('Bet must be between ₹50 and ₹250');
      return;
    }
    if (balance < betAmount) {
      toast.error('Insufficient balance for matchmaking.');
      navigate('/wallet');
      return;
    }

    setIsSearching(true);
    setLogs(['Initializing radar sweep...', 'Searching for opponents...']);

    const mockLogs = [
      "Scanning regional sector...",
      "Syncing network protocols...",
      "Analyzing opponent risk profiles...",
      "Checking latency...",
      "Expanding search radius..."
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < mockLogs.length) {
        setLogs(prev => [...prev, mockLogs[logIndex]]);
        logIndex++;
      }
    }, 400);

    // After 2.5 seconds, actually hit the backend queue to ensure no drop-off
    setTimeout(() => {
      clearInterval(logInterval);
      if (socket) {
        socket.emit('queue:join', { betAmount });
        setLogs(prev => [...prev, 'Connected to Arena queue. Awaiting match...']);
      }
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (socket && isSearching && !matchFound) {
        socket.emit('queue:leave', {});
      }
    };
  }, [socket, isSearching, matchFound]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = ({ roomId }) => {
      setMatchFound(true);
      setLogs(prev => [...prev, 'Match found! Room secured...', 'Teleporting to Arena...']);
      setTimeout(() => {
        navigate(`/lobby/${roomId}`);
      }, 1000);
    };

    socket.on('queue:match_found', handleMatchFound);

    return () => {
      socket.off('queue:match_found', handleMatchFound);
    };
  }, [socket, navigate]);

  return (
    <div className="radar-container">
      <div className="radar-header">
        <h1>MINES ARENA</h1>
        <p>Public Matchmaking</p>
      </div>

      {!isSearching ? (
        <div className="radar-setup animate-fadeInUp">
          <div className="radar-bet-box glass-card">
            <h3>SELECT YOUR BET</h3>
            <p>You can match with players betting different amounts. Winner takes 95% of the total combined pool!</p>
            <div className="bet-input-wrapper">
              <span>₹</span>
              <input 
                type="number" 
                min="50" 
                max="250" 
                value={betAmount} 
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="input bet-input" 
              />
            </div>
            <button className="btn btn--primary radar-start-btn" onClick={handleStartSearch}>
              INITIALIZE RADAR
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="radar-visualizer">
            <div className="radar-circle">
              <div className="radar-sweep"></div>
              {/* Random blips */}
              <div className="radar-blip" style={{ top: '30%', left: '40%', animationDelay: '0.5s' }}></div>
              <div className="radar-blip" style={{ top: '70%', left: '60%', animationDelay: '1.2s' }}></div>
              <div className="radar-blip" style={{ top: '50%', left: '20%', animationDelay: '2.1s' }}></div>
            </div>
            {matchFound && <div className="radar-match-overlay animate-scaleIn">MATCH FOUND</div>}
          </div>

          <div className="radar-console">
            <div className="radar-console-header">NETWORK LOG</div>
            <div className="radar-logs">
              {logs.map((log, index) => (
                <div key={index} className="radar-log-entry animate-fadeInUp">
                  <span className="log-time">[{new Date().toLocaleTimeString().split(' ')[0]}]</span> {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </>
      )}
      
      <button className="btn btn--outline" style={{ marginTop: '20px', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => navigate('/')}>
        Cancel
      </button>
    </div>
  );
};

export default RadarMatchmaking;
