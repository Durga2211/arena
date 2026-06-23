const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt = 'receipt#1' } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: 'Amount must be at least 100 paise' });
    }

    const options = {
      amount,
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify-payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    // Generate expected signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Dynamically fetch the original order to get the correct amount
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found in Razorpay' });
    }

    const amountToAdd = order.amount / 100; // Razorpay amount is in paise

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.walletBalance += amountToAdd;
    await user.save();

    // Create a deposit transaction record
    await Transaction.create({
      userId: req.user.id,
      type: 'deposit',
      amount: amountToAdd,
      status: 'completed',
      description: 'Razorpay wallet deposit',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and funds added successfully',
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ message: 'Internal server error during verification' });
  }
};
