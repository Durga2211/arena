import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import './QuizPage.css';

const LETTERS = ['A', 'B', 'C', 'D'];
const TOTAL_TIME = 60;

const QuizPage = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
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

    // Attempt immediately (might fail if no user gesture)
    requestFullscreenAndLandscape();

    // Also attempt on first click anywhere just in case
    const handleFirstClick = () => {
      requestFullscreenAndLandscape();
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the quiz? You will forfeit your entry fee.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('click', handleFirstClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('quiz:start', (data) => {
      setQuestions(data.questions);
      setQuizStarted(true);
      setTimeRemaining(data.totalTime || TOTAL_TIME);
    });

    socket.on('quiz:tick', (data) => {
      setTimeRemaining(data.timeRemaining);
    });

    socket.on('quiz:end', (data) => {
      navigate(`/results/${roomId}`, { state: { results: data } });
    });

    socket.emit('room:join', { roomId });

    return () => {
      socket.off('quiz:start');
      socket.off('quiz:tick');
      socket.off('quiz:end');
    };
  }, [socket, roomId, navigate]);

  const handleAnswer = useCallback((questionIndex, answerIndex) => {
    if (answers[questionIndex] !== undefined) return;

    setAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }));

    socket?.emit('quiz:answer', {
      roomId,
      questionIndex,
      answerIndex,
    });

    // Auto advance to next unanswered question — faster for speed mode
    setTimeout(() => {
      setCurrentQuestion((prev) => {
        for (let i = prev + 1; i < questions.length; i++) {
          if (answers[i] === undefined && i !== questionIndex) return i;
        }
        return prev;
      });
    }, 200);
  }, [answers, socket, roomId, questions.length]);

  const handleLeaveQuiz = () => {
    if (window.confirm('Are you sure you want to leave the quiz? You will forfeit your entry fee and NO REFUNDS will be issued.')) {
      navigate('/home');
    }
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'danger';
    if (timeRemaining <= 25) return 'warning';
    return 'safe';
  };

  const getTimerPercent = () => (timeRemaining / TOTAL_TIME) * 100;

  if (!quizStarted || questions.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto var(--space-md)' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-display)', letterSpacing: '0.05em' }}>LOADING QUIZ...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="page quiz-page">
      <div className="orientation-warning">
        <div className="orientation-icon">📱</div>
        <h2>Please Rotate Your Device</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          This quiz requires landscape mode for the best experience.
        </p>
      </div>

      <div className="container quiz">
        {/* HUD Timer */}
        <div className="quiz__timer-container">
          <div className="quiz__timer-header">
            <span className="quiz__timer-label">⏱ TIME REMAINING</span>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className={`quiz__timer-value quiz__timer-value--${getTimerColor()}`}>
                {timeRemaining}s
              </span>
              <button className="btn btn--outline btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={handleLeaveQuiz}>
                Leave Quiz
              </button>
            </div>
          </div>
          <div className="quiz__timer-bar">
            <div
              className={`quiz__timer-fill quiz__timer-fill--${getTimerColor()}`}
              style={{ width: `${getTimerPercent()}%` }}
            ></div>
          </div>
        </div>

        {/* Score HUD */}
        <div className="quiz__hud">
          <div className="quiz__hud-item">
            <div className="quiz__hud-value">{answeredCount}</div>
            <div className="quiz__hud-label">Answered</div>
          </div>
          <div className="quiz__hud-divider"></div>
          <div className="quiz__hud-item">
            <div className="quiz__hud-value">{currentQuestion + 1}</div>
            <div className="quiz__hud-label">Current</div>
          </div>
          <div className="quiz__hud-divider"></div>
          <div className="quiz__hud-item">
            <div className={`quiz__hud-value quiz__timer-value--${getTimerColor()}`}>{timeRemaining}s</div>
            <div className="quiz__hud-label">Time Left</div>
          </div>
        </div>

        {/* Question */}
        <div className="quiz__question-card glass-card" key={currentQuestion}>
          {question.category && (
            <span className="quiz__question-category">{question.category}</span>
          )}
          <h2 className="quiz__question-text">{question.question}</h2>
        </div>

        {/* Options */}
        <div className="quiz__options">
          {question.options.map((option, i) => (
            <button
              key={i}
              className={`quiz__option ${
                answers[currentQuestion] === i ? 'quiz__option--selected' : ''
              } ${answers[currentQuestion] !== undefined ? 'quiz__option--disabled' : ''}`}
              onClick={() => handleAnswer(currentQuestion, i)}
              disabled={answers[currentQuestion] !== undefined}
              style={{ animationDelay: `${i * 0.06}s` }}
              id={`option-${i}`}
            >
              <span className="quiz__option-letter">{LETTERS[i]}</span>
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
