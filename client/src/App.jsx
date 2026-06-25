import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import AppLayout from './components/AppLayout';
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
import MinesGlobalPage from './pages/MinesGlobalPage';
import RadarMatchmaking from './pages/RadarMatchmaking';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="fixed inset-0 technical-grid z-0 pointer-events-none opacity-30"></div>
        <AuthProvider>
          <SocketProvider>
            <WalletProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: 'var(--shadow-md)',
                  },
                  success: {
                    iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-elevated)' },
                  },
                  error: {
                    iconTheme: { primary: 'var(--danger)', secondary: 'var(--bg-elevated)' },
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

                {/* Protected Routes Without Layout */}
                <Route path="/lobby/:roomId" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
                <Route path="/quiz/:roomId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                <Route path="/results/:roomId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
                <Route path="/join/:roomCode" element={<ProtectedRoute><WelcomeRoomPage /></ProtectedRoute>} />
                <Route path="/shooter/:roomId" element={<ProtectedRoute><ShooterPage /></ProtectedRoute>} />
                <Route path="/mines/:roomId" element={<ProtectedRoute><MinesPage /></ProtectedRoute>} />
                <Route path="/mines-global" element={<ProtectedRoute><MinesGlobalPage /></ProtectedRoute>} />
                <Route path="/matchmaking" element={<ProtectedRoute><RadarMatchmaking /></ProtectedRoute>} />

                {/* Protected Routes With Layout */}
                <Route path="/welcome-room" element={<ProtectedRoute><AppLayout><WelcomeRoomPage /></AppLayout></ProtectedRoute>} />
                <Route path="/home" element={<ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><AppLayout><WalletPage /></AppLayout></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
              </Routes>
            </WalletProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
