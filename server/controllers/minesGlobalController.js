const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const MinesGlobalEntry = require('../models/MinesGlobalEntry');
const walletService = require('../services/walletService');

// Simple seeded random function
const seededRandom = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const BOT_NAMES = ['AlphaWolf', 'NeonNinja', 'ShadowFiend', 'CyberPunk', 'GlitchMaster', 'TurboRacer', 'PixelHero', 'VoidWalker', 'StarGazer', 'IronFist', 'GhostRider', 'QuantumLeap'];

const generateBotsForRound = (roundId, totalPlayers) => {
  const botsCount = totalPlayers - 1; // 9 bots if total is 10
  const bots = [];
  
  let seed = roundId * 1337;
  
  for (let i = 0; i < botsCount; i++) {
    seed += 1;
    const nameIndex = Math.floor(seededRandom(seed) * BOT_NAMES.length);
    seed += 1;
    
    // Survival time between 5s and 30s
    const survivalTime = 5 + (seededRandom(seed) * 25);
    seed += 1;
    
    // Gems between 1 and 18
    const gems = Math.floor(1 + (seededRandom(seed) * 17));
    seed += 1;
    
    // 60% chance to blow up, 40% chance to survive
    const status = seededRandom(seed) > 0.4 ? 'BLOWN_UP' : 'SURVIVED';
    
    bots.push({
      userId: `bot_${i}`,
      username: BOT_NAMES[nameIndex] + Math.floor(seededRandom(seed + 1) * 99),
      gems: status === 'BLOWN_UP' ? gems : gems + 3, // slightly more gems if survived
      survivalTime: parseFloat(survivalTime.toFixed(3)),
      status,
      isBot: true
    });
  }
  
  return bots;
};

exports.joinRound = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let settings = await Settings.findOne({ singletonData: 'global' });
    if (!settings) settings = await Settings.create({ singletonData: 'global' });

    const config = settings.minesGlobalConfig || { entryFee: 50, totalPlayers: 10 };
    
    const now = new Date();
    const roundId = Math.floor(now.getTime() / 60000);
    const seconds = now.getSeconds();

    if (seconds >= 32) {
      return res.status(400).json({ message: 'The join window for this round has closed. Please wait for the next round.' });
    }

    if (user.walletBalance < config.entryFee) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    // Check if already joined
    const existingEntry = await MinesGlobalEntry.findOne({ userId: user._id, roundId });
    if (existingEntry) {
      // Return the bots so they can continue playing
      const bots = generateBotsForRound(roundId, config.totalPlayers);
      return res.json({ success: true, roundId, config, bots, message: 'Already joined this round.' });
    }

    // Deduct fee
    const deductSuccess = await walletService.deductEntryFee(req.user.id, config.entryFee);
    if (!deductSuccess) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    await Transaction.create({
      userId: user._id,
      amount: config.entryFee,
      type: 'game_entry',
      status: 'completed',
      description: `Mines Global Timeline Entry (Round ${roundId})`
    });

    await MinesGlobalEntry.create({
      userId: user._id,
      roundId,
      entryFee: config.entryFee,
      status: 'joined'
    });

    const bots = generateBotsForRound(roundId, config.totalPlayers);

    res.json({ success: true, roundId, config, bots });
  } catch (error) {
    next(error);
  }
};

exports.submitRound = async (req, res, next) => {
  try {
    const { roundId, gems, survivalTime } = req.body;
    
    const entry = await MinesGlobalEntry.findOne({ userId: req.user.id, roundId });
    if (!entry) return res.status(404).json({ message: 'You did not join this round.' });
    if (entry.status === 'submitted') return res.status(400).json({ message: 'Score already submitted for this round.' });

    let settings = await Settings.findOne({ singletonData: 'global' });
    const config = settings.minesGlobalConfig || { entryFee: 50, totalPlayers: 10, winnerPrizePercent: 50, loserPrizePercent: 1 };

    // Get the bots to rank the user against
    const bots = generateBotsForRound(roundId, config.totalPlayers);
    
    const allPlayers = [
      ...bots,
      {
        userId: req.user.id,
        username: req.user.username,
        gems: gems,
        survivalTime: survivalTime,
        status: 'SURVIVED', // Doesn't strictly matter for ranking, sorting handles it
        isBot: false
      }
    ];

    // Sort leaderboard: highest gems first. If tie, longest survival time wins (or lowest? "survived the LONGEST without hitting a Red Mine").
    // Longest survival time without hitting red. 
    allPlayers.sort((a, b) => {
      if (b.gems !== a.gems) return b.gems - a.gems; // More gems = better
      return b.survivalTime - a.survivalTime; // Longer time = better
    });

    const userRank = allPlayers.findIndex(p => p.userId === req.user.id) + 1;
    
    const totalPool = config.entryFee * config.totalPlayers;
    let prize = 0;

    if (userRank === 1) {
      prize = (totalPool * config.winnerPrizePercent) / 100;
    } else {
      prize = (totalPool * config.loserPrizePercent) / 100;
    }

    entry.status = 'submitted';
    entry.gems = gems;
    entry.survivalTime = survivalTime;
    entry.rank = userRank;
    entry.prize = prize;
    await entry.save();

    if (prize > 0) {
      const user = await User.findById(req.user.id);
      user.walletBalance += prize;
      user.winningsBalance += prize;
      user.totalEarnings += prize;
      if (userRank === 1) user.totalWins += 1;
      await user.save();

      await Transaction.create({
        userId: user._id,
        amount: prize,
        type: 'game_prize',
        status: 'completed',
        description: `Mines Global Round ${roundId} - Rank ${userRank}`
      });
    }

    res.json({ success: true, rank: userRank, prize, leaderboard: allPlayers });
  } catch (error) {
    next(error);
  }
};
