import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { roomAPI } from '../services/api';
import confetti from 'canvas-confetti';
import './ResultsPage.css';

const ResultsPage = () => {
  const { roomId } = useParams();
  const { state } = useLocation();
  const { user, fetchUser } = useAuth();
  const { refreshBalance } = useWallet();
  const navigate = useNavigate();

  const [results, setResults] = useState(state?.results?.results || []);
  const [prizePool, setPrizePool] = useState(state?.results?.prizePool || 0);
  const [loading, setLoading] = useState(!state?.results);

  useEffect(() => {
    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});

    if (!state?.results) {
      loadResults();
    } else {
      triggerConfetti();
      refreshBalance();
      fetchUser();
    }
  }, []);

  const loadResults = async () => {
    try {
      const { data } = await roomAPI.getDetails(roomId);
      setResults(data.room.results || []);
      setPrizePool(data.room.prizePool || 0);
      triggerConfetti();
      refreshBalance();
      fetchUser();
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    const userResult = results.find((r) => r.userId === user?.id);
    if (userResult && userResult.rank <= 3) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#7c3aed', '#a855f7', '#06d6a0', '#fbbf24'],
      });
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const top3 = results.slice(0, 3);
  const userResult = results.find((r) => r.userId === user?.id);
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      <div className="container results">
        <div className="results__header">
          <h1 className="results__title">
            {userResult?.rank <= 3 ? '🎉 Congratulations!' : 'Quiz Complete!'}
          </h1>
          <p className="results__subtitle">
            {userResult?.rank <= 3
              ? `You won ₹${userResult.prize}!`
              : `You ranked #${userResult?.rank || '-'} with ${userResult?.score || 0} points`
            }
          </p>
        </div>

        {/* Podium */}
        <div className="results__podium">
          {top3.map((player, i) => {
            const positions = ['2nd', '1st', '3rd'];
            const pos = positions[i] || `${i + 1}th`;
            return (
              <div key={player.userId} className={`results__podium-item results__podium-item--${pos}`}>
                <div
                  className="results__podium-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${
                      i === 0 ? '#ffd700, #ffaa00'
                      : i === 1 ? '#c0c0c0, #a0a0a0'
                      : '#cd7f32, #b06720'
                    })`,
                  }}
                >
                  {player.username?.substring(0, 2).toUpperCase()}
                </div>
                <div className="results__podium-name">{player.username}</div>
                <div className="results__podium-prize">
                  {player.prize > 0 ? `₹${player.prize}` : '—'}
                </div>
                <div className={`results__podium-block results__podium-block--${pos}`}>
                  {rankEmojis[player.rank - 1]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Results Table */}
        <div className="results__table-card glass-card">
          <table className="results__table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Attempted</th>
                <th>Prize</th>
              </tr>
            </thead>
            <tbody>
              {results.map((player) => (
                <tr
                  key={player.userId}
                  className={player.userId === user?.id ? 'results__table-row--you' : ''}
                >
                  <td>
                    <span className={`badge ${player.rank <= 3 ? 'badge--accent' : 'badge--primary'}`}>
                      #{player.rank}
                    </span>
                  </td>
                  <td>
                    <div className="results__player-cell">
                      <div className="results__player-avatar">
                        {player.username?.substring(0, 2).toUpperCase()}
                      </div>
                      {player.username}
                      {player.userId === user?.id && (
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-light)' }}>(You)</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{player.score}</td>
                  <td>{player.correctAnswers}</td>
                  <td>{player.attempted || 0}</td>
                  <td style={{
                    color: player.prize > 0 ? 'var(--accent)' : 'var(--text-tertiary)',
                    fontWeight: 700,
                  }}>
                    {player.prize > 0 ? `₹${player.prize}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="results__actions">
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/home')} id="play-again-btn">
            Play Again
          </button>
          <button className="btn btn--outline btn--lg" onClick={() => navigate('/leaderboard')}>
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
