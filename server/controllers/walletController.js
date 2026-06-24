const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const razorpay = require('../config/razorpay');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
exports.getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, balance: user.walletBalance, depositBalance: user.depositBalance, winningsBalance: user.winningsBalance });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Razorpay order for adding money
// @route   POST /api/wallet/add-money
exports.addMoney = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Minimum deposit is ₹10' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `wallet_${req.user.id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Create pending transaction
    await Transaction.create({
      userId: req.user.id,
      type: 'deposit',
      amount,
      status: 'pending',
      razorpayOrderId: order.id,
      description: `Wallet deposit of ₹${amount}`,
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/wallet/verify-payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      // Update transaction as failed
      await Transaction.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update transaction
    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    // Credit wallet
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { walletBalance: transaction.amount } },
      { new: true }
    );

    res.json({
      success: true,
      message: `₹${transaction.amount} added to wallet`,
      balance: user.walletBalance,
      depositBalance: user.depositBalance,
      winningsBalance: user.winningsBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw money
// @route   POST /api/wallet/withdraw
exports.withdraw = async (req, res, next) => {
  try {
    const { amount, upiId, phone } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ message: 'Minimum withdrawal is ₹50' });
    }

    if (!upiId) {
      return res.status(400).json({ message: 'UPI ID is required' });
    }
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({ message: 'Please provide a valid UPI ID (e.g., yourname@bank)' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit Indian phone number' });
    }

    const user = await User.findById(req.user.id);
    if (user.winningsBalance < amount) {
      return res.status(400).json({ message: 'Insufficient winnings balance. You can only withdraw winnings.' });
    }

    // Deduct from wallet and winnings balance
    user.walletBalance -= amount;
    user.winningsBalance -= amount;
    await user.save();

    // Create withdrawal transaction
    await Transaction.create({
      userId: req.user.id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      upiId,
      phone,
      description: `Withdrawal of ₹${amount} to ${upiId}`,
    });

    res.json({
      success: true,
      message: `Withdrawal of ₹${amount} initiated. Will be processed within 24 hours.`,
      balance: user.walletBalance,
      depositBalance: user.depositBalance,
      winningsBalance: user.winningsBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};
