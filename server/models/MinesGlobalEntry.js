const mongoose = require('mongoose');

const minesGlobalEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roundId: {
    type: Number,
    required: true,
    index: true // The integer minute (e.g. Math.floor(Date.now() / 60000))
  },
  entryFee: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['joined', 'submitted'],
    default: 'joined'
  },
  gems: {
    type: Number,
    default: 0
  },
  survivalTime: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  prize: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Ensure a user can only join a specific round once
minesGlobalEntrySchema.index({ userId: 1, roundId: 1 }, { unique: true });

module.exports = mongoose.model('MinesGlobalEntry', minesGlobalEntrySchema);
