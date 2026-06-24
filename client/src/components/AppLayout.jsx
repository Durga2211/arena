import Navbar from './Navbar';
import BottomNav from './BottomNav';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
