import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { roomAPI, paymentAPI } from '../services/api';
import { FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './WelcomeRoomPage.css';

const WelcomeRoomPage = () => {
  const { user } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setShowDetails(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const initiatePayment = async (amountInPaise) => {
    try {
      // 1. Create order on backend
      const { data: orderData } = await paymentAPI.createOrder(amountInPaise);

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use the environment variable
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Squiz',
        description: 'Room Entry Fee Deposit',
        order_id: orderData.order_id,
        handler: async (response) => {
          try {
            // 3. Verify Payment Signature
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success('Payment verified successfully!');
            await fetchBalance(); // Update wallet context
            
            // 4. Join Room
            executeJoinRoom();
          } catch (verifyError) {
            console.error('Payment Verification Error:', verifyError);
            toast.error('Payment verification failed.');
            setJoining(false);
          }
        },
        prefill: {
          name: user.username,
          email: user.email,
        },
        theme: {
          color: '#c92a2a', // Match the red theme
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled.');
            setJoining(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
        setJoining(false);
      });

      rzp.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Could not initiate payment gateway.');
      setJoining(false);
    }
  };

  const executeJoinRoom = async () => {
    try {
      const { data } = await roomAPI.join(100);
      navigate(`/lobby/${data.room.id}`);
    } catch (err) {
      console.error('Join error:', err);
      const errMsg = err.response?.data?.message || err.message;
      toast.error(`Could not join: ${errMsg}`);
      setJoining(false);
    }
  };

  const handleJoinRoom = async () => {
    if (joining) return;
    setJoining(true);
    
    // Check wallet balance first. If < 100, prompt Razorpay
    if (balance < 100) {
      // Create Razorpay order for ₹100 (10000 paise)
      await initiatePayment(10000);
    } else {
      // Has enough funds, join directly
      await executeJoinRoom();
    }
  };

  if (!user) return null;

  return (
    <div className="welcome-room-page">
      
      {/* Phase 1: Animated Greeting */}
      <div className="welcome-room__greeting">
        <h1>Welcome, <span>{user.username}</span>!</h1>
      </div>

      {/* Phase 2: Game Details Reveal */}
      {showDetails && (
        <div className="welcome-room__details">
          
          <div className="welcome-room__receipt">
            <div className="welcome-room__receipt-header">
              <div>
                <div className="welcome-room__receipt-label">ENTRY FEE</div>
                <div className="welcome-room__receipt-value">₹100</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="welcome-room__receipt-label">WINNER GETS</div>
                <div className="welcome-room__receipt-value welcome-room__text-red">₹500</div>
              </div>
            </div>
            
            <div className="welcome-room__receipt-row">
              <span className="welcome-room__receipt-key">PLAYERS</span>
              <span className="welcome-room__receipt-val">10</span>
            </div>
            
            <div className="welcome-room__receipt-row welcome-room__highlight-box">
              <span className="welcome-room__receipt-key">WINNER GETS</span>
              <span className="welcome-room__receipt-val welcome-room__text-red" style={{ fontSize: '1.25rem' }}>₹500</span>
            </div>
            
            <div className="welcome-room__receipt-row welcome-room__highlight-box">
              <span className="welcome-room__receipt-key">REMAINING GETS</span>
              <span className="welcome-room__receipt-val welcome-room__text-red" style={{ fontSize: '1.25rem' }}>₹10</span>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1.5rem', textAlign: 'center', lineHeight: '1.4' }}>
              Answer questions against the clock. The player with the maximum correct answers wins the top prize!
            </p>
          </div>

          <button 
            className="welcome-room__btn" 
            onClick={handleJoinRoom}
            disabled={joining}
          >
            {joining ? (
              <>
                <div className="welcome-room__spinner"></div>
                CONNECTING...
              </>
            ) : (
              <>
                PAY ₹100 & JOIN ROOM <FiArrowRight />
              </>
            )}
          </button>
          
        </div>
      )}
    </div>
  );
};

export default WelcomeRoomPage;
