import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineHome, HiOutlineTrophy, HiOutlineUser, HiOutlineWallet, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar__nav">
        <Link to="/home" className={`sidebar__link ${isActive('/home') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineHome className="sidebar__icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/wallet" className={`sidebar__link ${isActive('/wallet') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineWallet className="sidebar__icon" />
          <span>Wallet</span>
        </Link>
        <Link to="/leaderboard" className={`sidebar__link ${isActive('/leaderboard') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineTrophy className="sidebar__icon" />
          <span>Leaderboard</span>
        </Link>
        <Link to="/profile" className={`sidebar__link ${isActive('/profile') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineUser className="sidebar__icon" />
          <span>Profile</span>
        </Link>
        {user?.role === 'admin' && (
          <Link to="/admin" className={`sidebar__link ${isActive('/admin') ? 'sidebar__link--active' : ''}`}>
            <MdOutlineAdminPanelSettings className="sidebar__icon" />
            <span>Admin</span>
          </Link>
        )}
      </div>

      <div className="sidebar__bottom">
        <button className="sidebar__link sidebar__link--danger" onClick={() => { logout(); window.location.href = '/'; }}>
          <HiOutlineArrowRightOnRectangle className="sidebar__icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
