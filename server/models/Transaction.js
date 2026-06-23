const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'entry_fee', 'prize', 'withdrawal'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpayPayoutId: String,
  upiId: String,
  phone: String,
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  description: String,
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);
