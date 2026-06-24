const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  singletonData: {
    type: String,
    default: 'global',
    unique: true
  },
  enabledGames: {
    quiz: { type: Boolean, default: true },
    shooter: { type: Boolean, default: true },
    mines: { type: Boolean, default: true }, // Legacy
    minesJackpot: { type: Boolean, default: true },
    minesDuels: { type: Boolean, default: true },
    minesGlobalTimeline: { type: Boolean, default: true },
    minesArena: { type: Boolean, default: true }
  },
  minesGlobalConfig: {
    entryFee: { type: Number, default: 50 },
    totalPlayers: { type: Number, default: 10 },
    winnerPrizePercent: { type: Number, default: 50 },
    loserPrizePercent: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
