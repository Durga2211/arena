import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import LobbyPage from './pages/LobbyPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import WelcomeRoomPage from './pages/WelcomeRoomPage';
import ShooterPage from './pages/ShooterPage';
import MinesPage from './pages/MinesPage';

function App() {
  return (
    <Router>
      <div className="bg-animation">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>
      <AuthProvider>
        <SocketProvider>
          <WalletProvider>
            <Navbar />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#14141e',
                  color: '#f0f0f5',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                },
                success: {
                  iconTheme: { primary: '#00cc66', secondary: '#0a0a0f' },
                },
                error: {
                  iconTheme: { primary: '#ff4444', secondary: '#0a0a0f' },
                },
              }}
            />
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminPage />} />

              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected */}
              <Route path="/welcome-room" element={<ProtectedRoute><WelcomeRoomPage /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/lobby/:roomId" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
              <Route path="/quiz/:roomId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
              <Route path="/results/:roomId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/join/:roomCode" element={<ProtectedRoute><WelcomeRoomPage /></ProtectedRoute>} />
              <Route path="/shooter/:roomId" element={<ProtectedRoute><ShooterPage /></ProtectedRoute>} />
              <Route path="/mines/:roomId" element={<ProtectedRoute><MinesPage /></ProtectedRoute>} />
            </Routes>
          </WalletProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
