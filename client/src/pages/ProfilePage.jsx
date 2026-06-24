import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { useEffect } from 'react';

const ProfilePage = () => {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600, paddingTop: 'var(--space-2xl)' }}>
        <div className="page-header">
          <h1>👤 Profile</h1>
        </div>

        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--font-xl)', fontWeight: 800, color: 'white',
            }}>
              {user?.avatar?.startsWith('http') ? (
                <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user?.avatar
              )}
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{user?.username}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>{user?.totalGamesPlayed || 0}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Games Played</div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--warning)' }}>{user?.totalWins || 0}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Wins</div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--accent)' }}>₹{(user?.totalEarnings || 0).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Earnings</div>
            </div>
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--accent)' }}>₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Wallet Balance</div>
            </div>
          </div>
        </div>

        <button className="btn btn--danger btn--full" onClick={handleLogout} id="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
