import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
