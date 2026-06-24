import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineHome, HiOutlineTrophy, HiOutlineUser, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import './Sidebar.css';

const Sidebar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar__nav">
        <Link to="/home" className={`sidebar__link ${isActive('/home') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineHome className="sidebar__icon" />
          <span>Home</span>
        </Link>
        <Link to="/leaderboard" className={`sidebar__link ${isActive('/leaderboard') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineTrophy className="sidebar__icon" />
          <span>Leaderboard</span>
        </Link>
        <Link to="/profile" className={`sidebar__link ${isActive('/profile') ? 'sidebar__link--active' : ''}`}>
          <HiOutlineUser className="sidebar__icon" />
          <span>Profile</span>
        </Link>
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
