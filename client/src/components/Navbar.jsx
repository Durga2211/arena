import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { HiOutlineHome, HiOutlineTrophy, HiOutlineWallet, HiOutlineUser, HiOutlineArrowRightOnRectangle, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { balance } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (e) => {
    const isInRoom = location.pathname.startsWith('/lobby') || location.pathname.startsWith('/quiz');
    if (isInRoom) {
      e.preventDefault();
      alert("You are currently in a room! Please use the 'Leave Room' button on the screen if you wish to exit.");
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!user) return null;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__inner">
        <Link to="/home" className="navbar__logo" style={{ textTransform: 'uppercase' }} onClick={handleNavClick}>
          SQUIZ<span style={{ color: 'var(--primary)' }}>.</span>
        </Link>

        {/* Removed center nav for new layout */}
        <div style={{ flex: 1 }}></div>

        <div className="navbar__right">
          <button className="navbar__theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <HiOutlineSun size={20} /> : <HiOutlineMoon size={20} />}
          </button>

          <Link to="/wallet" className="navbar__wallet" id="wallet-pill" onClick={handleNavClick}>
            <span className="navbar__wallet-icon">💰</span>
            ₹{balance.toLocaleString('en-IN')}
          </Link>

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="navbar__avatar"
              onClick={() => setShowDropdown(!showDropdown)}
              id="avatar-menu"
              aria-label="User menu"
            >
              {user.avatar?.startsWith('http') ? (
                <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user.avatar
              )}
            </button>

            {showDropdown && (
              <div className="navbar__dropdown" id="user-dropdown">
                <div style={{ padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--border-default)', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{user.username}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{user.email}</div>
                </div>
                
                {/* Mobile-only navigation links */}
                <div className="navbar__dropdown-mobile-nav" style={{ display: 'none' }}>
                  <Link to="/home" className="navbar__dropdown-item" onClick={(e) => { handleNavClick(e); setShowDropdown(false); }}>
                    <HiOutlineHome /> Home
                  </Link>
                  <Link to="/leaderboard" className="navbar__dropdown-item" onClick={(e) => { handleNavClick(e); setShowDropdown(false); }}>
                    <HiOutlineTrophy /> Leaderboard
                  </Link>
                  <div className="navbar__dropdown-divider"></div>
                </div>

                <Link to="/profile" className="navbar__dropdown-item" onClick={(e) => { handleNavClick(e); setShowDropdown(false); }}>
                  <HiOutlineUser /> Profile
                </Link>
                <Link to="/wallet" className="navbar__dropdown-item" onClick={(e) => { handleNavClick(e); setShowDropdown(false); }}>
                  <HiOutlineWallet /> Wallet
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="navbar__dropdown-item" onClick={(e) => { handleNavClick(e); setShowDropdown(false); }}>
                    <span style={{ fontSize: '1.2em', marginRight: 'var(--space-sm)' }}>🛡️</span> Admin
                  </Link>
                )}
                <div className="navbar__dropdown-divider"></div>
                <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                  <HiOutlineArrowRightOnRectangle /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
