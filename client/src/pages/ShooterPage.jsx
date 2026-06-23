import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import ShooterScene from './ShooterScene';
import './ShooterPage.css';

const ShooterPage = () => {
  const { roomId } = useParams();
  const gameRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    // Small delay to ensure the DOM container div is rendered
    const timerId = setTimeout(() => {
      const container = document.getElementById('phaser-container');
      if (!container) return;

      const config = {
        type: Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 600,
          parent: 'phaser-container',
        },
        backgroundColor: '#0f0f23',
        scene: [],
      };

      const game = new Phaser.Game(config);
      game.scene.add('ShooterScene', ShooterScene, true, { 
        token, 
        user, 
        roomId,
        onGameOver: (data) => {
          if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
          navigate(`/results/${roomId}`, { state: { results: data } });
        }
      });
      gameRef.current = game;
      setLoading(false);
    }, 100);

    const requestFullscreenAndLandscape = async () => {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.warn("Fullscreen/orientation lock failed:", err);
      }
    };

    requestFullscreenAndLandscape();

    const handleFirstClick = () => {
      requestFullscreenAndLandscape();
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the arena?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('click', handleFirstClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [user]);

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the arena? You will forfeit your entry fee.')) {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      navigate('/home');
    }
  };

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div className="orientation-warning">
        <div className="orientation-icon">📱</div>
        <h2>Please Rotate Your Device</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          This game requires landscape mode for the best experience.
        </p>
      </div>

      <div className="shooter-header">
        <button className="btn btn--outline btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(0,0,0,0.5)' }} onClick={handleLeave}>
          Leave Arena
        </button>
      </div>

      {loading && <div className="spinner" style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 10001, transform: 'translate(-50%, -50%)' }}></div>}

      <div id="phaser-container"></div>
    </div>
  );
};

export default ShooterPage;
