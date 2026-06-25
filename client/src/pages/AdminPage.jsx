import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import './AdminPage.css';

const AdminPage = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState({ quiz: true, shooter: true, mines: true });
  const [minesGlobalConfig, setMinesGlobalConfig] = useState({ entryFee: 50, totalPlayers: 10, winnerPrizePercent: 50, loserPrizePercent: 1 });
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
      const [statsRes, txnsRes, roomsRes, withdrawalsRes, settingsRes, usersRes, allRoomsRes] = await Promise.all([
        adminAPI.getStats(pwd || password),
        adminAPI.getTransactions(pwd || password),
        adminAPI.getActiveRooms(pwd || password),
        adminAPI.getWithdrawals(pwd || password),
        adminAPI.getSettings(pwd || password),
        adminAPI.getUsers(pwd || password),
        adminAPI.getAllRooms(pwd || password),
      ]);
      setStats(statsRes.data.stats);
      setTransactions(txnsRes.data.transactions);
      setUsers(usersRes.data.users);
      setActiveRooms(roomsRes.data.rooms);
      setAllRooms(allRoomsRes.data.rooms);
      setWithdrawals(withdrawalsRes.data.withdrawals);
      if (settingsRes.data.settings?.enabledGames) {
        setSettings(settingsRes.data.settings.enabledGames);
      }
      if (settingsRes.data.settings?.minesGlobalConfig) {
        setMinesGlobalConfig(settingsRes.data.settings.minesGlobalConfig);
      }
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

  const handleToggleGame = async (gameType, currentValue) => {
    try {
      const updatedGames = { ...settings, [gameType]: !currentValue };
      const res = await adminAPI.updateSettings(password, { enabledGames: updatedGames });
      if (res.data.success) {
        setSettings(res.data.settings.enabledGames);
        toast.success(`${gameType} has been ${!currentValue ? 'enabled' : 'disabled'}!`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update game settings');
    }
  };

  const handleUpdateMinesGlobalConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateSettings(password, { minesGlobalConfig });
      if (res.data.success) {
        toast.success('Mines Global Config updated!');
        if (res.data.settings?.minesGlobalConfig) {
          setMinesGlobalConfig(res.data.settings.minesGlobalConfig);
        }
      }
    } catch (error) {
      console.error('Error updating global config:', error);
      toast.error('Failed to update config');
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
      setActiveTab('rooms');
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
      second: '2-digit'
    });
  };

  const getGameModeName = (room) => {
    if (room.gameType === 'mines') {
      if (room.isArena) return 'Mines Arena';
      if (room.isDuel) return 'Mines Duel';
      return 'Custom Match';
    }
    if (room.gameType === 'quiz') return 'Quiz Match';
    if (room.gameType === 'shooter') return 'Shooter Arena';
    return room.gameType || 'N/A';
  };

  if (!isAuthenticated) {
    return (
      <div className="os-login-container">
        <div className="os-login-box">
          <h2 style={{ color: 'var(--os-accent)', letterSpacing: '2px', textTransform: 'uppercase' }}>SQUIZ_OS ACCESS</h2>
          <p style={{ color: 'var(--os-text-muted)', marginBottom: 'var(--space-xl)' }}>SECURE CONNECTION REQUIRED</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <input type="password" className="os-input" placeholder="ACCESS_KEY" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus style={{ textAlign: 'center' }} />
            <button type="submit" className="os-btn os-btn--accent">INITIALIZE</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="os-login-container">
        <div className="os-telemetry" style={{ fontSize: '1.2rem', color: 'var(--os-accent)' }}>
          <div className="os-dot"></div> CONNECTING TO NETWORK NODES...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <aside className="os-sidebar">
        <div className="os-logo-container">
          <h2 className="os-logo">SQUIZ_OS</h2>
        </div>
        <div className="os-platform-ctrl">
          PLATFORM_CTRL<br/>
          <span style={{fontSize: '0.6rem', color: '#555'}}>V2.0.4-STABLE</span>
        </div>
        <ul className="os-menu">
          <li className={`os-menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>[01] Overview</li>
          <li className={`os-menu-item ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>[02] Revenue</li>
          <li className={`os-menu-item ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>[03] Players</li>
          <li className={`os-menu-item ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>[04] Rooms</li>
          <li className={`os-menu-item ${activeTab === 'customrooms' ? 'active' : ''}`} onClick={() => setActiveTab('customrooms')}>[05] Create Room</li>
          <li className={`os-menu-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>[06] Game Config</li>
          <li className={`os-menu-item ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setActiveTab('withdrawals')}>
            [07] Withdrawals
            {withdrawals.length > 0 && <span className="os-badge os-badge--warning" style={{marginLeft: 'auto'}}>{withdrawals.length}</span>}
          </li>
        </ul>
      </aside>

      <main className="os-main-content">
        <header className="os-topbar">
          <div className="os-top-tabs">
            <div className="os-top-tab active">REVENUE</div>
            <div className="os-top-tab">ANALYTICS</div>
            <div className="os-top-tab">OPERATIONS</div>
          </div>
          <div className="os-top-actions">
            <div className="os-telemetry"><div className="os-dot"></div> TELEMETRY_FEED_ACTIVE // SYNCED</div>
            <button className="os-btn os-btn--accent" onClick={() => fetchDashboardData(password)}>RELOAD_BUFFER</button>
          </div>
        </header>

        <div className="os-content animate-fade">
          
          {activeTab === 'overview' && (
            <>
              <div className="os-page-title">
                <h1>SYSTEM_OVERVIEW</h1>
                <div className="os-telemetry" style={{color: 'var(--os-accent)'}}>DATA_SOURCE_023 // LATENCY: 14ms // UPTIME: 99.98%</div>
              </div>

              {stats && (
                <div className="os-stats-grid">
                  <div className="os-stat-card">
                    <h3>TOTAL_USERS</h3>
                    <div className="os-stat-value">{stats.totalUsers}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>TOTAL_DEPOSITS</h3>
                    <div className="os-stat-value accent">₹{stats.totalDeposits.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>ENTRY_FEES_COLLECTED</h3>
                    <div className="os-stat-value">₹{stats.totalEntryFees.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>PLATFORM_REVENUE (ALL TIME)</h3>
                    <div className="os-stat-value accent">₹{stats.platformRevenue.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              <div className="os-table-section">
                <div className="os-table-header">
                  <h2>LIVE_TRANSACTION_STREAM</h2>
                  <span className="os-table-meta">AUTO-UPDATING EVERY 5S</span>
                </div>
                <div className="os-table-container">
                  <table className="os-table">
                    <thead>
                      <tr>
                        <th>TIMESTAMP</th>
                        <th>TX_ID</th>
                        <th>NODE / USER</th>
                        <th>TYPE</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((txn) => (
                          <tr key={txn._id}>
                            <td className="os-text-muted">{formatDate(txn.createdAt).split(', ')[1]}</td>
                            <td>{txn.razorpayOrderId || txn._id.substring(0, 8).toUpperCase()}</td>
                            <td>
                              {txn.userId?.username || 'UNKNOWN'} <span className="os-text-muted">({txn.userId?.email || 'N/A'})</span>
                            </td>
                            <td><span className={`os-badge ${txn.type === 'deposit' ? 'os-badge--success' : ''}`}>{txn.type.toUpperCase()}</span></td>
                            <td className={['deposit', 'prize'].includes(txn.type) ? 'os-text-accent' : 'os-text-danger'}>₹{txn.amount}</td>
                            <td>
                              <span className={`os-badge os-badge--${txn.status === 'success' || txn.status === 'completed' ? 'success' : (txn.status === 'failed' ? 'danger' : 'warning')}`}>
                                {txn.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: 'var(--os-text-muted)'}}>NO TRANSACTIONS DETECTED</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'revenue' && (
            <>
              <div className="os-page-title">
                <h1>REVENUE_OVERVIEW</h1>
                <div className="os-telemetry" style={{color: 'var(--os-accent)'}}>DATA_SOURCE_023 // UPTIME: 99.98%</div>
              </div>
              
              {stats && (
                <div className="os-stats-grid">
                  <div className="os-stat-card">
                    <h3>REVENUE (1 HOUR)</h3>
                    <div className="os-stat-value accent">₹{stats.revenue1H?.toLocaleString('en-IN') || 0}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>REVENUE (1 DAY)</h3>
                    <div className="os-stat-value accent">₹{stats.revenue1D?.toLocaleString('en-IN') || 0}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>REVENUE (1 WEEK)</h3>
                    <div className="os-stat-value accent">₹{stats.revenue1W?.toLocaleString('en-IN') || 0}</div>
                  </div>
                  <div className="os-stat-card">
                    <h3>REVENUE (1 MONTH)</h3>
                    <div className="os-stat-value accent">₹{stats.revenue1M?.toLocaleString('en-IN') || 0}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'players' && (
            <>
              <div className="os-page-title">
                <h1>PLAYER_DATABASE</h1>
                <div className="os-telemetry">SYNC_ACTIVE</div>
              </div>

              <div className="os-table-section">
                <div className="os-table-header">
                  <h2>REGISTERED_NODES (PLAYERS)</h2>
                </div>
                <div className="os-table-container">
                  <table className="os-table">
                    <thead>
                      <tr>
                        <th>JOIN_DATE</th>
                        <th>PLAYER_IDENTIFIER</th>
                        <th>WALLET_BALANCE</th>
                        <th>TOTAL_EARNINGS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((u) => (
                          <tr key={u._id}>
                            <td className="os-text-muted">{formatDate(u.createdAt)}</td>
                            <td>{u.username} <span className="os-text-muted">[{u.email}]</span></td>
                            <td>₹{u.walletBalance || 0}</td>
                            <td className="os-text-accent">₹{u.totalEarnings || 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{textAlign: 'center'}}>NO NODES FOUND</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'rooms' && (
            <>
              <div className="os-page-title">
                <h1>ROOM_TELEMETRY</h1>
                <div className="os-telemetry">TRACKING_ACTIVE_MATCHES</div>
              </div>
              
              <div className="os-stats-grid">
                <div className="os-stat-card">
                  <h3>CURRENTLY_PLAYING</h3>
                  <div className="os-stat-value accent">
                    {allRooms.filter(r => ['waiting', 'countdown', 'active'].includes(r.status)).length}
                  </div>
                </div>
                <div className="os-stat-card">
                  <h3>TOTAL_ROOMS_PLAYED</h3>
                  <div className="os-stat-value accent">
                    {allRooms.filter(r => ['completed', 'cancelled'].includes(r.status)).length}
                  </div>
                </div>
              </div>

              <div className="os-table-section">
                <div className="os-table-header">
                  <h2>ROOM_HISTORY_LOG</h2>
                </div>
                <div className="os-table-container">
                  <table className="os-table">
                    <thead>
                      <tr>
                        <th>ROOM_ID</th>
                        <th>GAME_MODE</th>
                        <th>STATUS</th>
                        <th>PLAYERS</th>
                        <th>POOL_MONEY</th>
                        <th>CREATED_AT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRooms.length > 0 ? (
                        allRooms.map((room) => (
                          <tr key={room._id}>
                            <td className="os-text-muted">#{room.roomCode}</td>
                            <td>{getGameModeName(room).toUpperCase()}</td>
                            <td>
                              <span className={`os-badge os-badge--${room.status === 'completed' ? 'success' : (['active', 'waiting', 'countdown'].includes(room.status) ? 'warning' : 'danger')}`}>
                                {room.status.toUpperCase()}
                              </span>
                            </td>
                            <td>{room.players?.length || 0} / {room.maxPlayers || 10}</td>
                            <td className="os-text-accent">₹{room.prizePool || 0}</td>
                            <td className="os-text-muted">{formatDate(room.createdAt).split(', ')[1]}</td>
                            <td>
                              <button className="os-btn os-btn--accent" onClick={() => setSelectedRoomDetails(room)}>INSPECT</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="7" style={{textAlign: 'center'}}>NO ROOMS IN LOG</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'customrooms' && (
            <>
              <div className="os-page-title">
                <h1>ROOM_INITIALIZATION</h1>
                <div className="os-telemetry">MANUAL_OVERRIDE</div>
              </div>
              
              <div className="os-form">
                <div className="os-table-header"><h2>CREATE_CUSTOM_ROOM</h2></div>
                <form onSubmit={handleCreateRoom} style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-md)'}}>
                  <div className="os-input-group">
                    <label>GAME_TYPE_SELECT</label>
                    <select className="os-select" value={newRoomGameType} onChange={(e) => setNewRoomGameType(e.target.value)}>
                      <option value="quiz">QUIZ GAME</option>
                      <option value="shooter">SHOOTER ARENA</option>
                      <option value="mines">MINES (GEMS & MINES)</option>
                    </select>
                  </div>
                  <div className="os-input-group">
                    <label>ENTRY_FEE (₹)</label>
                    <input type="number" className="os-input" value={newRoomEntryFee} onChange={(e) => setNewRoomEntryFee(e.target.value)} required min="10" />
                  </div>
                  <div className="os-input-group">
                    <label>MAXIMUM_NODES (PLAYERS)</label>
                    <input type="number" className="os-input" value={newRoomMaxPlayers} onChange={(e) => setNewRoomMaxPlayers(e.target.value)} required min="2" max="100" />
                  </div>
                  <button type="submit" className="os-btn os-btn--accent" style={{ marginTop: 'var(--space-sm)' }} disabled={creatingRoom}>
                    {creatingRoom ? 'INITIALIZING...' : 'EXECUTE_CREATION'}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === 'config' && (
            <>
              <div className="os-page-title">
                <h1>SYSTEM_CONFIGURATION</h1>
                <div className="os-telemetry">GLOBAL_VARIABLES</div>
              </div>

              <div className="os-table-section">
                <div className="os-table-header">
                  <h2>GAME_MODULE_TOGGLES</h2>
                </div>
                <div className="os-config-grid">
                  <div className="os-config-item">
                    <div>
                      <h3>QUIZ_MATCH</h3>
                      <p>Classic multiple-choice trivia.</p>
                    </div>
                    <button className={`os-btn ${settings?.quiz ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('quiz', settings?.quiz)}>
                      {settings?.quiz ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <div className="os-config-item">
                    <div>
                      <h3>SHOOTER_ARENA</h3>
                      <p>Reflex-based target shooting.</p>
                    </div>
                    <button className={`os-btn ${settings?.shooter ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('shooter', settings?.shooter)}>
                      {settings?.shooter ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <div className="os-config-item">
                    <div>
                      <h3>MINES_JACKPOT</h3>
                      <p>Standard Multiplayer Arena.</p>
                    </div>
                    <button className={`os-btn ${settings?.minesJackpot !== false ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('minesJackpot', settings?.minesJackpot !== false)}>
                      {settings?.minesJackpot !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <div className="os-config-item">
                    <div>
                      <h3>MINES_DUELS</h3>
                      <p>Private 1v1 Matches.</p>
                    </div>
                    <button className={`os-btn ${settings?.minesDuels !== false ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('minesDuels', settings?.minesDuels !== false)}>
                      {settings?.minesDuels !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <div className="os-config-item">
                    <div>
                      <h3>GLOBAL_TIMELINE</h3>
                      <p>Single-player Sync Mode.</p>
                    </div>
                    <button className={`os-btn ${settings?.minesGlobalTimeline !== false ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('minesGlobalTimeline', settings?.minesGlobalTimeline !== false)}>
                      {settings?.minesGlobalTimeline !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <div className="os-config-item">
                    <div>
                      <h3>MINES_ARENA_PUBLIC</h3>
                      <p>Free-for-all Matchmaking.</p>
                    </div>
                    <button className={`os-btn ${settings?.minesArena !== false ? 'os-btn--accent' : ''}`} onClick={() => handleToggleGame('minesArena', settings?.minesArena !== false)}>
                      {settings?.minesArena !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="os-table-section" style={{ marginTop: 'var(--space-2xl)' }}>
                <div className="os-table-header">
                  <h2>GLOBAL_TIMELINE_PARAMETERS</h2>
                </div>
                <form className="os-form" onSubmit={handleUpdateMinesGlobalConfig}>
                  <div className="os-input-group">
                    <label>ENTRY_FEE (₹)</label>
                    <input type="number" className="os-input" value={minesGlobalConfig.entryFee} onChange={(e) => setMinesGlobalConfig({...minesGlobalConfig, entryFee: Number(e.target.value)})} required min="10" />
                  </div>
                  <div className="os-input-group">
                    <label>SIMULATED_NODES_PER_ROOM</label>
                    <input type="number" className="os-input" value={minesGlobalConfig.totalPlayers} onChange={(e) => setMinesGlobalConfig({...minesGlobalConfig, totalPlayers: Number(e.target.value)})} required min="2" max="100" />
                  </div>
                  <div className="os-input-group">
                    <label>WINNER_PRIZE_ALLOCATION (%)</label>
                    <input type="number" className="os-input" value={minesGlobalConfig.winnerPrizePercent} onChange={(e) => setMinesGlobalConfig({...minesGlobalConfig, winnerPrizePercent: Number(e.target.value)})} required min="0" max="100" />
                  </div>
                  <div className="os-input-group">
                    <label>LOSER_CONSOLATION_ALLOCATION (%)</label>
                    <input type="number" className="os-input" value={minesGlobalConfig.loserPrizePercent} onChange={(e) => setMinesGlobalConfig({...minesGlobalConfig, loserPrizePercent: Number(e.target.value)})} required min="0" max="100" />
                  </div>
                  <button type="submit" className="os-btn os-btn--accent" style={{ alignSelf: 'flex-start' }}>UPDATE_CONFIG</button>
                </form>
              </div>
            </>
          )}

          {activeTab === 'withdrawals' && (
            <>
              <div className="os-page-title">
                <h1>WITHDRAWAL_REQUESTS</h1>
                <div className="os-telemetry">MANUAL_APPROVAL_REQUIRED</div>
              </div>

              <div className="os-table-section">
                <div className="os-table-header">
                  <h2>PENDING_TRANSACTIONS</h2>
                </div>
                <div className="os-table-container">
                  <table className="os-table">
                    <thead>
                      <tr>
                        <th>TIMESTAMP</th>
                        <th>USER_IDENTIFIER</th>
                        <th>AMOUNT</th>
                        <th>UPI_ID</th>
                        <th>PHONE</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length > 0 ? (
                        withdrawals.map((withdrawal) => (
                          <tr key={withdrawal._id}>
                            <td className="os-text-muted">{formatDate(withdrawal.createdAt)}</td>
                            <td>{withdrawal.userId?.username || 'UNKNOWN'} <span className="os-text-muted">[{withdrawal.userId?.email || ''}]</span></td>
                            <td className="os-text-danger">₹{withdrawal.amount}</td>
                            <td>{withdrawal.upiId || '-'}</td>
                            <td>{withdrawal.phone || '-'}</td>
                            <td>
                              <button className="os-btn os-btn--accent" onClick={() => handleApproveWithdrawal(withdrawal._id)}>AUTHORIZE</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" style={{textAlign: 'center'}}>NO PENDING REQUESTS</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Room Details Modal */}
      {selectedRoomDetails && (
        <div className="os-modal-overlay" onClick={() => setSelectedRoomDetails(null)}>
          <div className="os-modal animate-fade" onClick={e => e.stopPropagation()}>
            <div className="os-modal-header">
              <h2>ROOM_INSPECTION_PORTAL [#{selectedRoomDetails.roomCode}]</h2>
              <button className="os-btn" onClick={() => setSelectedRoomDetails(null)}>CLOSE_X</button>
            </div>
            
            <div className="os-stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="os-stat-card">
                <h3>TOTAL_PRIZE_POOL</h3>
                <div className="os-stat-value accent">₹{selectedRoomDetails.prizePool || 0}</div>
              </div>
              <div className="os-stat-card">
                <h3>PLATFORM_REVENUE</h3>
                <div className="os-stat-value danger">₹{selectedRoomDetails.platformFee || 0}</div>
              </div>
              <div className="os-stat-card">
                <h3>ENTRY_FEE</h3>
                <div className="os-stat-value">
                  {selectedRoomDetails.isArena ? 'VARIABLE' : `₹${selectedRoomDetails.entryFee || 0}`}
                </div>
              </div>
              <div className="os-stat-card">
                <h3>GAME_MODE</h3>
                <div className="os-stat-value">{getGameModeName(selectedRoomDetails).toUpperCase()}</div>
              </div>
            </div>

            <div className="os-table-section">
              <div className="os-table-header">
                <h2>PLAYER_RESULTS_LOG</h2>
              </div>
              <div className="os-table-container">
                <table className="os-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>PLAYER_ID</th>
                      <th>SCORE</th>
                      <th>PRIZE_ALLOCATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoomDetails.results && selectedRoomDetails.results.length > 0 ? (
                      selectedRoomDetails.results.sort((a,b) => (a.rank || 99) - (b.rank || 99)).map((res, idx) => (
                        <tr key={idx}>
                          <td style={{ color: res.rank === 1 ? 'var(--os-accent)' : 'inherit' }}>
                            {res.rank === 1 ? '> 1ST' : `${res.rank || '-'}TH`}
                          </td>
                          <td>{res.username || (res.userId && res.userId.username) || 'UNKNOWN'}</td>
                          <td>{res.score || 0}</td>
                          <td className="os-text-accent">₹{res.prize || 0}</td>
                        </tr>
                      ))
                    ) : (
                      selectedRoomDetails.players && selectedRoomDetails.players.length > 0 ? (
                        selectedRoomDetails.players.map((p, idx) => (
                          <tr key={idx}>
                            <td>-</td>
                            <td>{p.username || (p.userId && p.userId.username) || 'UNKNOWN'}</td>
                            <td>-</td>
                            <td>-</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{textAlign: 'center'}}>NO LOGS FOUND</td></tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
