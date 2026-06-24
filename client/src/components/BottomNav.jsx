import { Link, useLocation } from 'react-router-dom';
import { HiOutlineHome, HiOutlineTrophy, HiOutlineUser } from 'react-icons/hi2';
import './BottomNav.css';

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-nav">
      <Link to="/home" className={`bottom-nav__item ${isActive('/home') ? 'bottom-nav__item--active' : ''}`}>
        <HiOutlineHome className="bottom-nav__icon" />
        <span>Home</span>
      </Link>
      <Link to="/leaderboard" className={`bottom-nav__item ${isActive('/leaderboard') ? 'bottom-nav__item--active' : ''}`}>
        <HiOutlineTrophy className="bottom-nav__icon" />
        <span>Leaderboard</span>
      </Link>
      <Link to="/profile" className={`bottom-nav__item ${isActive('/profile') ? 'bottom-nav__item--active' : ''}`}>
        <HiOutlineUser className="bottom-nav__icon" />
        <span>Profile</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
