const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    unique: true,
    required: true,
  },
  gameType: {
    type: String,
    enum: ['quiz', 'shooter'],
    default: 'quiz',
  },
  entryFee: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    default: 10,
  },
  status: {
    type: String,
    enum: ['waiting', 'countdown', 'active', 'completed', 'cancelled'],
    default: 'waiting',
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    avatar: String,
    joinedAt: { type: Date, default: Date.now },
  }],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  results: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    score: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    rank: Number,
    prize: { type: Number, default: 0 },
  }],
  prizePool: {
    type: Number,
    default: 0,
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

// Generate room code
roomSchema.statics.generateRoomCode = async function () {
  const count = await this.countDocuments();
  return (count + 1).toString();
};

module.exports = mongoose.model('Room', roomSchema);
