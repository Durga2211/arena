const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Room = require('../models/Room');

// @desc    Get all transactions (deposits, entries, prizes, withdrawals)
// @route   GET /api/admin/transactions
exports.getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'username email avatar')
      .populate('roomId', 'roomCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform statistics
// @route   GET /api/admin/stats
exports.getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    
    const depositResult = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDeposits = depositResult.length > 0 ? depositResult[0].total : 0;

    const entryFeeResult = await Transaction.aggregate([
      { $match: { type: 'entry_fee', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEntryFees = entryFeeResult.length > 0 ? entryFeeResult[0].total : 0;

    const prizeResult = await Transaction.aggregate([
      { $match: { type: 'prize', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPrizes = prizeResult.length > 0 ? prizeResult[0].total : 0;

    // Platform revenue roughly = Entry Fees - Prizes Distributed
    const platformRevenue = totalEntryFees - totalPrizes;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDeposits,
        totalEntryFees,
        totalPrizes,
        platformRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active/waiting rooms
// @route   GET /api/admin/rooms
exports.getActiveRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: { $in: ['waiting', 'countdown', 'active'] } })
      .populate('players.userId', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, rooms });
  } catch (error) {
    next(error);
  }
};

// @desc    End a room prematurely
// @route   POST /api/admin/rooms/:id/end
exports.endRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.status === 'completed' || room.status === 'cancelled') {
      return res.status(400).json({ message: 'Room already ended' });
    }

    // Refund players
    for (const player of room.players) {
      await User.findByIdAndUpdate(player.userId, {
        $inc: { walletBalance: room.entryFee }
      });
      await Transaction.create({
        userId: player.userId,
        type: 'deposit',
        amount: room.entryFee,
        status: 'completed',
        roomId: room._id,
        description: `Refund for cancelled room ${room.roomCode}`,
      });
    }

    room.status = 'cancelled';
    await room.save();

    // Broadcast cancellation
    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('room:cancelled', {});
    }

    res.json({ success: true, message: 'Room ended and players refunded' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending withdrawal requests
// @route   GET /api/admin/withdrawals
exports.getWithdrawalRequests = async (req, res, next) => {
  try {
    const withdrawals = await Transaction.find({ type: 'withdrawal', status: 'pending' })
      .populate('userId', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a withdrawal request
// @route   POST /api/admin/withdrawals/:id/approve
exports.approveWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Transaction.findById(req.params.id);
    if (!withdrawal || withdrawal.type !== 'withdrawal') {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal is already processed' });
    }

    withdrawal.status = 'completed';
    await withdrawal.save();

    res.json({ success: true, message: 'Withdrawal approved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom room
// @route   POST /api/admin/rooms
exports.createCustomRoom = async (req, res, next) => {
  try {
    const { entryFee, maxPlayers, gameType } = req.body;
    if (!entryFee || !maxPlayers) {
      return res.status(400).json({ message: 'Entry fee and max players are required' });
    }

    let roomCode;
    let attempts = 0;
    do {
      roomCode = await Room.generateRoomCode();
      // To ensure uniqueness if generateRoomCode count is off:
      roomCode = `${roomCode}${attempts > 0 ? `-${attempts}` : ''}`;
      attempts++;
    } while (await Room.findOne({ roomCode }) && attempts < 10);

    const room = await Room.create({
      roomCode,
      entryFee,
      maxPlayers,
      status: 'waiting',
      gameType: gameType || 'quiz',
      prizePool: 0,
      platformFee: 0,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('room:new', {
        id: room._id,
        roomCode: room.roomCode,
        entryFee: room.entryFee,
        playerCount: 0,
        maxPlayers: room.maxPlayers,
        gameType: room.gameType,
        prizePool: room.prizePool || (room.entryFee * room.maxPlayers),
        status: room.status,
      });
    }

    res.status(201).json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live stats of an active room
// @route   GET /api/admin/rooms/:id/live
exports.getLiveRoomStats = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId).populate('players.userId', 'username email avatar');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.status !== 'active') {
      return res.json({ success: true, status: room.status, message: 'Room is not active' });
    }

    if (room.gameType === 'shooter') {
      const { activeShooterGames } = require('../socket/shooterHandler');
      const arena = activeShooterGames[roomId];
      
      if (!arena) {
        return res.json({ success: true, status: room.status, message: 'Game state missing' });
      }

      const playerStats = room.players.map(p => {
        // Find player in arena by socket ID. The arena players map keys are socket IDs, but objects have userId
        const arenaPlayer = Object.values(arena.players).find(ap => ap.userId === p.userId._id.toString());
        return {
          userId: p.userId._id,
          username: p.userId.username,
          kills: arenaPlayer ? arenaPlayer.kills : 0,
          deaths: arenaPlayer ? arenaPlayer.deaths : 0,
          score: arenaPlayer ? arenaPlayer.score : 0,
        };
      });

      return res.json({
        success: true,
        timeRemaining: Math.floor(arena.timeRemaining),
        players: playerStats,
      });
    } else {
      const gameService = req.app.get('gameService');
      const gameState = gameService?.activeGames.get(roomId);

      if (!gameState) {
        return res.json({ success: true, status: room.status, message: 'Game state missing' });
      }

      const timeRemaining = 60 - Math.floor((Date.now() - gameState.startTime) / 1000);

      const playerStats = room.players.map(p => {
        const answers = gameState.answers.get(p.userId._id.toString()) || [];
        return {
          userId: p.userId._id,
          username: p.userId.username,
          answersCount: answers.length,
        };
      });

      return res.json({
        success: true,
        timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
        players: playerStats,
      });
    }
  } catch (error) {
    next(error);
  }
};
