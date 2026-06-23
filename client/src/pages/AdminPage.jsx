import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AdminPage.css';

const AdminPage = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  // Custom Room State
  const [newRoomEntryFee, setNewRoomEntryFee] = useState(100);
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(10);
  const [newRoomGameType, setNewRoomGameType] = useState('quiz');
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Live Stats State
  const [viewingLiveRoom, setViewingLiveRoom] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [liveStatsInterval, setLiveStatsInterval] = useState(null);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
      fetchDashboardData(savedPassword);
    }
    return () => {
      if (liveStatsInterval) clearInterval(liveStatsInterval);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '21') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminPassword', password);
      fetchDashboardData(password);
    } else {
      toast.error('Invalid password');
    }
  };

  const fetchDashboardData = async (pwd) => {
    try {
      setLoading(true);
      const [statsRes, txnsRes, roomsRes, withdrawalsRes] = await Promise.all([
        adminAPI.getStats(pwd || password),
        adminAPI.getTransactions(pwd || password),
        adminAPI.getActiveRooms(pwd || password),
        adminAPI.getWithdrawals(pwd || password),
      ]);
      setStats(statsRes.data.stats);
      setTransactions(txnsRes.data.transactions);
      setActiveRooms(roomsRes.data.rooms);
      setWithdrawals(withdrawalsRes.data.withdrawals);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response?.status === 403) {
        toast.error('Invalid password. Please try again.');
        setIsAuthenticated(false);
        sessionStorage.removeItem('adminPassword');
      } else {
        toast.error('Failed to load admin dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to end this room? All players will be refunded.')) return;
    try {
      await adminAPI.endRoom(password, roomId);
      toast.success('Room ended successfully');
      fetchDashboardData(password);
      if (viewingLiveRoom === roomId) closeLiveStats();
    } catch (error) {
      console.error('Error ending room:', error);
      toast.error('Failed to end room');
    }
  };

  const handleApproveWithdrawal = async (id) => {
    if (!window.confirm('Mark this withdrawal as completed? (Ensure you have transferred the funds)')) return;
    try {
      await adminAPI.approveWithdrawal(password, id);
      toast.success('Withdrawal approved');
      fetchDashboardData(password);
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreatingRoom(true);
    try {
      await adminAPI.createRoom(password, { entryFee: Number(newRoomEntryFee), maxPlayers: Number(newRoomMaxPlayers), gameType: newRoomGameType });
      toast.success('Custom room created!');
      setNewRoomEntryFee(100);
      setNewRoomMaxPlayers(10);
      setNewRoomGameType('quiz');
      fetchDashboardData(password);
      setActiveTab('liverooms');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(error.response?.data?.message || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const openLiveStats = (roomId) => {
    setViewingLiveRoom(roomId);
    fetchLiveStats(roomId);
    const interval = setInterval(() => fetchLiveStats(roomId), 1500);
    setLiveStatsInterval(interval);
  };

  const closeLiveStats = () => {
    setViewingLiveRoom(null);
    setLiveStats(null);
    if (liveStatsInterval) {
      clearInterval(liveStatsInterval);
      setLiveStatsInterval(null);
    }
  };

  const fetchLiveStats = async (roomId) => {
    try {
      const { data } = await adminAPI.getLiveRoomStats(password, roomId);
      if (data.success) {
        setLiveStats(data);
      }
    } catch (error) {
      console.error('Error fetching live stats:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page admin-page--login">
        <div className="admin-login-card glass-card">
          <h2>🛡️ Admin Access</h2>
          <p>Please enter the admin password</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button type="submit" className="btn btn--primary">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="admin-page admin-page--loading">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        <header className="admin-header">
          <h1>🛡️ Admin Dashboard</h1>
          <p>Real-time platform overview and configuration</p>
          <button className="btn btn--outline btn--sm" onClick={() => fetchDashboardData(password)} style={{ maxWidth: 200, margin: '0 auto' }}>
            Refresh Data
          </button>
        </header>

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`admin-tab ${activeTab === 'liverooms' ? 'active' : ''}`} onClick={() => setActiveTab('liverooms')}>Live Rooms</button>
          <button className={`admin-tab ${activeTab === 'customrooms' ? 'active' : ''}`} onClick={() => setActiveTab('customrooms')}>Create Room</button>
          <button className={`admin-tab ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setActiveTab('withdrawals')}>
            Withdrawals
            {withdrawals.length > 0 && <span className="admin-tab-badge">{withdrawals.length}</span>}
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="admin-tab-content animate-fadeInUp">
            {stats && (
              <div className="admin-stats-grid">
                <div className="admin-stat-card glass-card">
                  <h3>Total Users</h3>
                  <div className="admin-stat-value">{stats.totalUsers}</div>
                </div>
                <div className="admin-stat-card glass-card">
                  <h3>Total Deposits</h3>
                  <div className="admin-stat-value admin-stat-value--positive">₹{stats.totalDeposits.toLocaleString('en-IN')}</div>
                </div>
                <div className="admin-stat-card glass-card">
                  <h3>Entry Fees Collected</h3>
                  <div className="admin-stat-value">₹{stats.totalEntryFees.toLocaleString('en-IN')}</div>
                </div>
                <div className="admin-stat-card glass-card">
                  <h3>Platform Revenue</h3>
                  <div className="admin-stat-value admin-stat-value--accent">₹{stats.platformRevenue.toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
            <div className="admin-transactions-section glass-card">
              <h2>Recent Transactions</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Order ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.map((txn) => (
                        <tr key={txn._id}>
                          <td>{formatDate(txn.createdAt)}</td>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{txn.userId?.username || 'Unknown'}</span>
                              <span className="admin-user-email">{txn.userId?.email || ''}</span>
                            </div>
                          </td>
                          <td><span className={`admin-badge admin-badge--${txn.type}`}>{txn.type.replace('_', ' ').toUpperCase()}</span></td>
                          <td className={['deposit', 'prize'].includes(txn.type) ? 'admin-text-positive' : 'admin-text-negative'}>₹{txn.amount}</td>
                          <td><span className={`admin-status-dot admin-status--${txn.status}`}></span>{txn.status}</td>
                          <td className="admin-text-mono">{txn.razorpayOrderId || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="admin-empty-state">No transactions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'liverooms' && (
          <div className="admin-tab-content animate-fadeInUp">
            {viewingLiveRoom && liveStats ? (
              <div className="admin-transactions-section glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h2>Live Game Stats</h2>
                  <button className="btn btn--outline btn--sm" onClick={closeLiveStats}>Close Stats</button>
                </div>
                <div className="admin-stats-grid">
                  <div className="admin-stat-card glass-card">
                    <h3>Time Remaining</h3>
                    <div className="admin-stat-value" style={{ color: liveStats.timeRemaining <= 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {liveStats.timeRemaining}s
                    </div>
                  </div>
                  <div className="admin-stat-card glass-card">
                    <h3>Active Players</h3>
                    <div className="admin-stat-value">{liveStats.players.length}</div>
                  </div>
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        {liveStats.players[0] && liveStats.players[0].answersCount !== undefined ? (
                          <th>Answers Submitted</th>
                        ) : (
                          <>
                            <th>Kills</th>
                            <th>Deaths</th>
                            <th>Score</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {liveStats.players.map(p => (
                        <tr key={p.userId}>
                          <td style={{ fontWeight: 600 }}>{p.username}</td>
                          {p.answersCount !== undefined ? (
                            <td className="admin-text-mono">{p.answersCount}</td>
                          ) : (
                            <>
                              <td className="admin-text-mono" style={{ color: 'var(--success)' }}>{p.kills}</td>
                              <td className="admin-text-mono" style={{ color: 'var(--danger)' }}>{p.deaths}</td>
                              <td className="admin-text-mono" style={{ color: 'var(--accent)' }}>{p.score}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {liveStats.players.length === 0 && (
                        <tr><td colSpan="4" className="admin-empty-state">No players actively playing.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="admin-transactions-section glass-card">
              <h2>Live Rooms Overview</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Room ID</th>
                      <th>Game Type</th>
                      <th>Status</th>
                      <th>Players / Max</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRooms.length > 0 ? (
                      activeRooms.map((room) => (
                        <tr key={room._id}>
                          <td className="admin-text-mono">#{room.roomCode}</td>
                          <td style={{ textTransform: 'capitalize' }}>{room.gameType || 'Quiz'}</td>
                          <td><span className={`admin-badge admin-badge--${room.status === 'active' ? 'prize' : 'entry_fee'}`}>{room.status.toUpperCase()}</span></td>
                          <td>{room.players?.length || 0} / {room.maxPlayers || 10}</td>
                          <td>{formatDate(room.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {room.status === 'active' && (
                                <button className="btn btn--accent btn--sm" onClick={() => openLiveStats(room._id)}>Live Stats</button>
                              )}
                              <button className="btn btn--outline btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleEndRoom(room._id)}>End</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="admin-empty-state">No active rooms right now</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customrooms' && (
          <div className="admin-tab-content animate-fadeInUp">
            <div className="admin-transactions-section glass-card" style={{ maxWidth: 500, margin: '0 auto' }}>
              <h2>Create Custom Room</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Generate a new room with customized settings for the players.</p>
              
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label>Game Type</label>
                  <select className="input" value={newRoomGameType} onChange={(e) => setNewRoomGameType(e.target.value)}>
                    <option value="quiz">Quiz Game</option>
                    <option value="shooter">Shooter Arena</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Entry Fee (₹)</label>
                  <input type="number" className="input" value={newRoomEntryFee} onChange={(e) => setNewRoomEntryFee(e.target.value)} required min="10" />
                </div>
                <div className="input-group">
                  <label>Max Players</label>
                  <input type="number" className="input" value={newRoomMaxPlayers} onChange={(e) => setNewRoomMaxPlayers(e.target.value)} required min="2" max="100" />
                </div>
                <button type="submit" className="btn btn--primary" style={{ marginTop: 'var(--space-sm)' }} disabled={creatingRoom}>
                  {creatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="admin-tab-content animate-fadeInUp">
            <div className="admin-transactions-section glass-card">
              <h2>Pending Withdrawals</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Amount</th>
                      <th>UPI ID</th>
                      <th>Phone Number</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length > 0 ? (
                      withdrawals.map((withdrawal) => (
                        <tr key={withdrawal._id}>
                          <td>{formatDate(withdrawal.createdAt)}</td>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-name">{withdrawal.userId?.username || 'Unknown'}</span>
                              <span className="admin-user-email">{withdrawal.userId?.email || ''}</span>
                            </div>
                          </td>
                          <td className="admin-text-negative" style={{ fontWeight: 'bold' }}>₹{withdrawal.amount}</td>
                          <td className="admin-text-mono">{withdrawal.upiId || '-'}</td>
                          <td className="admin-text-mono">{withdrawal.phone || '-'}</td>
                          <td>
                            <button className="btn btn--accent btn--sm" onClick={() => handleApproveWithdrawal(withdrawal._id)}>Approve</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="admin-empty-state">No pending withdrawals</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPage;
