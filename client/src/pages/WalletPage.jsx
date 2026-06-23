import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { paymentAPI } from '../services/api';
import toast from 'react-hot-toast';
import './WalletPage.css';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const TXN_ICONS = { deposit: '📥', entry_fee: '🎮', prize: '🏆', withdrawal: '📤' };

const WalletPage = () => {
  const { balance, transactions, loadingTxns, fetchTransactions, refreshBalance, withdraw } = useWallet();
  const [addAmount, setAddAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddMoney = async () => {
    const amount = parseInt(addAmount);
    if (!amount || amount < 10) {
      toast.error('Minimum deposit is ₹10');
      return;
    }

    setLoadingAdd(true);
    try {
      const amountInPaise = amount * 100;
      const { data: orderData } = await paymentAPI.createOrder(amountInPaise);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Squiz',
        description: `Add ₹${amount} to wallet`,
        order_id: orderData.order_id,
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(`₹${amount} added to wallet!`);
            setAddAmount('');
            fetchTransactions();
            refreshBalance();
          } catch (verifyError) {
            console.error('Payment Verification Error:', verifyError);
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#c92a2a' },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 50) {
      toast.error('Minimum withdrawal is ₹50');
      return;
    }
    if (!upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }
    if (!phone) {
      toast.error('Please enter your Phone Number');
      return;
    }

    setLoadingWithdraw(true);
    try {
      const data = await withdraw(amount, upiId, phone);
      toast.success(data.message);
      setWithdrawAmount('');
      setUpiId('');
      setPhone('');
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="page">
      <div className="container wallet">
        <div className="page-header">
          <h1>💰 Wallet</h1>
          <p>Manage your funds</p>
        </div>

        <div className="wallet__grid">
          {/* Balance Card */}
          <div className="wallet__balance-card glass-card">
            <div className="wallet__balance-label">Available Balance</div>
            <div className="wallet__balance-amount">₹{balance.toLocaleString('en-IN')}</div>
            <div className="wallet__balance-actions">
              <button className="btn btn--accent btn--sm" onClick={() => document.getElementById('add-money-input').focus()}>
                + Add Money
              </button>
              <button className="btn btn--outline btn--sm" onClick={() => document.getElementById('withdraw-input').focus()}>
                Withdraw
              </button>
            </div>
          </div>

          {/* Add Money */}
          <div className="wallet__action-card glass-card">
            <h3>Add Money</h3>
            <div className="wallet__amount-grid">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  className={`wallet__amount-btn ${addAmount === String(amt) ? 'wallet__amount-btn--active' : ''}`}
                  onClick={() => setAddAmount(String(amt))}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <div className="wallet__custom-input">
              <input
                id="add-money-input"
                type="number"
                className="input"
                placeholder="Custom amount"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                min="10"
              />
              <button
                className="btn btn--primary"
                onClick={handleAddMoney}
                disabled={loadingAdd}
              >
                {loadingAdd ? <span className="spinner spinner--sm"></span> : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw */}
        <div className="wallet__action-card glass-card" style={{ marginBottom: 'var(--space-2xl)' }}>
          <h3>Withdraw to UPI</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-sm)' }}>
            <input
              id="withdraw-input"
              type="number"
              className="input"
              placeholder="Amount (min ₹50)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min="50"
            />
            <input
              type="text"
              className="input"
              placeholder="your@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <input
              type="tel"
              className="input"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className="btn btn--accent"
              onClick={handleWithdraw}
              disabled={loadingWithdraw}
            >
              {loadingWithdraw ? <span className="spinner spinner--sm"></span> : 'Withdraw'}
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div className="wallet__transactions glass-card">
          <h3>Transaction History</h3>
          {loadingTxns ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : transactions.length > 0 ? (
            <div className="wallet__txn-list">
              {transactions.map((txn) => (
                <div key={txn._id} className="wallet__txn">
                  <div className="wallet__txn-left">
                    <div className={`wallet__txn-icon wallet__txn-icon--${txn.type}`}>
                      {TXN_ICONS[txn.type]}
                    </div>
                    <div>
                      <div className="wallet__txn-desc">{txn.description}</div>
                      <div className="wallet__txn-date">{formatDate(txn.createdAt)}</div>
                    </div>
                  </div>
                  <div className={`wallet__txn-amount ${['deposit', 'prize'].includes(txn.type) ? 'wallet__txn-amount--positive' : 'wallet__txn-amount--negative'}`}>
                    {['deposit', 'prize'].includes(txn.type) ? '+' : '-'}₹{txn.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="home__empty">
              <span className="home__empty-icon">📋</span>
              No transactions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
