import { createContext, useContext, useState, useCallback } from 'react';
import { walletAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

export const WalletProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  const balance = user?.walletBalance || 0;

  const refreshBalance = useCallback(async () => {
    try {
      const { data } = await walletAPI.getBalance();
      updateUser({ walletBalance: data.balance });
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [updateUser]);

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const { data } = await walletAPI.getTransactions();
      setTransactions(data.transactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  }, []);

  const addMoney = async (amount) => {
    const { data } = await walletAPI.addMoney(amount);
    return data;
  };

  const verifyPayment = async (paymentData) => {
    const { data } = await walletAPI.verifyPayment(paymentData);
    updateUser({ walletBalance: data.balance });
    return data;
  };

  const withdraw = async (amount, upiId, phone) => {
    const { data } = await walletAPI.withdraw({ amount, upiId, phone });
    updateUser({ walletBalance: data.balance });
    return data;
  };

  return (
    <WalletContext.Provider value={{
      balance,
      transactions,
      loadingTxns,
      refreshBalance,
      fetchTransactions,
      addMoney,
      verifyPayment,
      withdraw,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
