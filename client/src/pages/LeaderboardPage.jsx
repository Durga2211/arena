import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import './LeaderboardPage.css';

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

const LeaderboardPage = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data } = await leaderboardAPI.getGlobal();
      setLeaders(data.leaderboard);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container leaderboard">
        <div className="page-header">
          <h1>🏆 Leaderboard</h1>
          <p>Top players ranked by total earnings</p>
        </div>

        <div className="leaderboard__card glass-card">
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : leaders.length > 0 ? (
            <table className="leaderboard__table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Games</th>
                  <th>Wins</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((player, i) => (
                  <tr key={player._id}>
                    <td>
                      <span className={`leaderboard__rank leaderboard__rank--${i + 1}`}>
                        {i < 3 ? RANK_EMOJIS[i] : `#${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <div className="leaderboard__player">
                        <div className="leaderboard__avatar">{player.avatar}</div>
                        {player.username}
                      </div>
                    </td>
                    <td>{player.totalGamesPlayed}</td>
                    <td>{player.totalWins}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      ₹{player.totalEarnings.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="home__empty">
              <span className="home__empty-icon">🏆</span>
              No games played yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
