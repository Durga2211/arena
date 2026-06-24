const Room = require('../models/Room');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

// @desc    Get public game settings
// @route   GET /api/rooms/settings
exports.getGameSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ singletonData: 'global' });
    if (!settings) {
      settings = await Settings.create({ singletonData: 'global' });
    }
    res.json({ success: true, enabledGames: settings.enabledGames });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available rooms
// @route   GET /api/rooms/available
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const filter = { status: 'waiting', isDuel: { $ne: true } };
    if (req.query.gameType) {
      filter.gameType = req.query.gameType;
    }
    const rooms = await Room.find(filter)
      .select('roomCode entryFee players status prizePool maxPlayers gameType createdAt')
      .sort({ createdAt: -1 });

    const roomsData = rooms.map((room) => ({
      id: room._id,
      roomCode: room.roomCode,
      entryFee: room.entryFee,
      playerCount: room.players ? room.players.length : 0,
      maxPlayers: room.maxPlayers || 10,
      gameType: room.gameType,
      prizePool: room.prizePool || (room.entryFee * (room.maxPlayers || 10)),
      status: room.status,
    }));

    res.json({ success: true, rooms: roomsData });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a room
// @route   POST /api/rooms/join
exports.joinRoom = async (req, res, next) => {
  try {
    const { entryFee, roomId, gameType } = req.body;

    // Check settings to ensure game is not disabled
    let settings = await Settings.findOne({ singletonData: 'global' });
    if (!settings) settings = await Settings.create({ singletonData: 'global' });
    
    // Determine target gameType
    let targetGameType = gameType || 'quiz';
    if (roomId) {
      const targetRoom = await Room.findById(roomId);
      if (targetRoom) targetGameType = targetRoom.gameType;
    }

    if (settings.enabledGames && settings.enabledGames[targetGameType] === false) {
      return res.status(403).json({ message: `The ${targetGameType} game mode is currently disabled by the administrator.` });
    }

    const user = await User.findById(req.user.id);

    // Block joining if already in an active/waiting room
    const existingRoom = await Room.findOne({
      status: { $in: ['waiting', 'countdown', 'active'] },
      'players.userId': req.user.id
    });
    if (existingRoom) {
      return res.status(400).json({ message: 'You are already inside an active room. Please leave it before joining another.' });
    }

    let room;
    if (roomId) {
      room = await Room.findById(roomId);
      if (!room || room.status !== 'waiting') {
        return res.status(400).json({ message: 'Room not available' });
      }
      if (room.isDuel) {
        return res.status(400).json({ message: 'Cannot join a private duel room from this endpoint.' });
      }
      if (user.walletBalance < room.entryFee) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      if (room.players.length >= (room.maxPlayers || 10)) {
        return res.status(400).json({ message: 'Room is full' });
      }
    } else {
      if (!entryFee) return res.status(400).json({ message: 'Entry fee or Room ID is required' });
      if (user.walletBalance < entryFee) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      // Find or create a waiting room with this entry fee and gameType
      const targetGameType = gameType || 'quiz';
      room = await Room.findOne({
        entryFee,
        gameType: targetGameType,
        status: 'waiting',
        $expr: { $lt: [{ $size: "$players" }, { $ifNull: ["$maxPlayers", 10] }] }
      });

      if (!room) {
        // Create new room
        let roomCode;
        let attempts = 0;
        do {
          roomCode = await Room.generateRoomCode();
          attempts++;
        } while (await Room.findOne({ roomCode }) && attempts < 10);

        room = await Room.create({
          roomCode,
          entryFee,
          maxPlayers: 10,
          gameType: targetGameType,
          prizePool: 0,
          platformFee: 0,
        });
      }
    }

    // Check if player already in room
    const alreadyJoined = room.players.some(
      (p) => p.userId.toString() === req.user.id.toString()
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: 'Already in this room' });
    }

    // Deduct entry fee from wallet
    user.walletBalance -= room.entryFee;
    await user.save();

    // Create entry fee transaction
    await Transaction.create({
      userId: req.user.id,
      type: 'entry_fee',
      amount: room.entryFee,
      status: 'completed',
      roomId: room._id,
      description: `Entry fee for room ${room.roomCode}`,
    });

    // Add player to room
    room.players.push({
      userId: req.user.id,
      username: user.username,
      avatar: user.avatar,
    });
    room.prizePool = room.players.length * room.entryFee;
    await room.save();

    const io = req.app.get('io');
    const gameService = req.app.get('gameService');

    if (io) {
      io.emit('room:update', {
        id: room._id,
        playerCount: room.players.length,
        prizePool: room.prizePool,
        status: room.players.length >= (room.maxPlayers || 10) ? 'countdown' : room.status,
      });
    }

    // If the room is now full, trigger countdown immediately
    if (room.players.length >= (room.maxPlayers || 10) && room.status === 'waiting' && gameService) {
      io.to(room._id.toString()).emit('room:full', {});
      gameService.startCountdown(room._id.toString());
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        roomCode: room.roomCode,
        entryFee: room.entryFee,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers || 10,
        players: room.players,
        prizePool: room.prizePool,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate 4-character alphanumeric code
const generateDuelCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 20) {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const Room = require('../models/Room');
    const existing = await Room.findOne({ roomCode: code, status: 'waiting' });
    if (!existing) isUnique = true;
    attempts++;
  }
  return code;
};

// @desc    Create a custom Mines room (Duel or Jackpot)
// @route   POST /api/rooms/mines/custom
exports.createCustomMinesRoom = async (req, res, next) => {
  try {
    const Settings = require('../models/Settings');
    const user = await User.findById(req.user.id);
    const entryFee = Number(req.body.entryFee) || 50;
    const maxPlayers = Number(req.body.maxPlayers) || 2;

    if (entryFee < 50) return res.status(400).json({ message: 'Minimum entry fee is ₹50' });
    if (maxPlayers < 2 || maxPlayers > 10) return res.status(400).json({ message: 'Players must be between 2 and 10' });

    // Check global settings
    let settings = await Settings.findOne({ singletonData: 'global' });
    if (settings && settings.enabledGames) {
      if (maxPlayers === 2 && settings.enabledGames.minesDuels === false) {
        return res.status(403).json({ message: 'Mines Duels are currently disabled.' });
      }
      if (maxPlayers > 2 && settings.enabledGames.minesJackpot === false) {
        return res.status(403).json({ message: 'Mines Jackpot is currently disabled.' });
      }
    }

    if (user.walletBalance < entryFee) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const existingRoom = await Room.findOne({
      status: { $in: ['waiting', 'countdown', 'active'] },
      'players.userId': req.user.id
    });
    if (existingRoom) {
      return res.status(400).json({ message: 'You are already inside an active room.' });
    }

    const roomCode = await generateDuelCode(); // Uses the same 4-char generator
    const isDuel = maxPlayers === 2;

    const room = await Room.create({
      roomCode,
      entryFee,
      maxPlayers,
      gameType: 'mines',
      isDuel,
      prizePool: 0,
      platformFee: 0,
      players: [{
        userId: req.user.id,
        username: user.username,
        avatar: user.avatar,
      }]
    });

    user.walletBalance -= entryFee;
    await user.save();

    await Transaction.create({
      userId: req.user.id,
      type: 'entry_fee',
      amount: entryFee,
      status: 'completed',
      roomId: room._id,
      description: `Entry fee for Custom Mines Room ${roomCode}`,
    });

    const io = req.app.get('io');
    io.emit('room:new', {
      id: room._id,
      roomCode: room.roomCode,
      entryFee: room.entryFee,
      playerCount: 1,
      maxPlayers: room.maxPlayers,
      gameType: 'mines',
      prizePool: 0,
      status: 'waiting',
      isDuel: room.isDuel
    });

    res.json({ success: true, room: { id: room._id, roomCode: room.roomCode, isDuel: room.isDuel } });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a custom room by code
// @route   POST /api/rooms/join-by-code
exports.joinRoomByCode = async (req, res, next) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode || roomCode.length !== 4) {
      return res.status(400).json({ message: 'Invalid 4-character referral code.' });
    }

    const codeUpper = roomCode.toUpperCase();
    const user = await User.findById(req.user.id);
    const entryFee = 50;
    
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne({ singletonData: 'global' });
    if (settings && settings.enabledGames && settings.enabledGames.mines === false) {
      return res.status(403).json({ message: 'Mines game mode is currently disabled.' });
    }

    const room = await Room.findOne({ roomCode: codeUpper, isDuel: true, status: 'waiting' });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or already started.' });
    }

    if (room.players.length >= 2) {
      return res.status(400).json({ message: 'Duel room is already full.' });
    }

    const alreadyJoined = room.players.some(p => p.userId.toString() === req.user.id.toString());
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You are already in this room.' });
    }

    const existingRoom = await Room.findOne({
      status: { $in: ['waiting', 'countdown', 'active'] },
      'players.userId': req.user.id
    });
    if (existingRoom) {
      return res.status(400).json({ message: 'You are already inside an active room.' });
    }

    if (user.walletBalance < entryFee) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    user.walletBalance -= entryFee;
    await user.save();

    await Transaction.create({
      userId: req.user.id,
      type: 'entry_fee',
      amount: entryFee,
      status: 'completed',
      roomId: room._id,
      description: `Entry fee for Duel ${codeUpper}`,
    });

    room.players.push({
      userId: req.user.id,
      username: user.username,
      avatar: user.avatar,
    });
    
    // Total pool collected is 100
    room.prizePool = 100;
    await room.save();

    const io = req.app.get('io');
    const gameService = req.app.get('gameService');

    io.to(room._id.toString()).emit('room:players', { players: room.players });
    
    io.emit('room:update', {
      id: room._id,
      playerCount: room.players.length,
      prizePool: room.prizePool,
    });

    // Automatically trigger countdown since the duel is full
    if (room.players.length === 2) {
      io.to(room._id.toString()).emit('room:full', {});
      gameService.startCountdown(room._id.toString());
    }

    res.json({ success: true, room: { id: room._id, roomCode: room.roomCode } });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a room explicitly
// @route   POST /api/rooms/:roomId/leave
exports.leaveRoom = async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.status !== 'waiting' && room.status !== 'countdown') {
      return res.status(400).json({ message: 'Cannot explicitly leave a room that has already started.' });
    }

    const playerIndex = room.players.findIndex(p => p.userId.toString() === req.user.id);
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'You are not in this room' });
    }

    // Remove player
    room.players.splice(playerIndex, 1);

    // Update the transaction from entry_fee to forfeit so it displays correctly on Admin Dash
    const transaction = await Transaction.findOne({
      userId: req.user.id,
      roomId: room._id,
      type: 'entry_fee'
    });

    if (transaction) {
      transaction.type = 'forfeit';
      transaction.description = `Forfeited entry fee for leaving room ${room.roomCode}`;
      await transaction.save();
    }

    // Update prize pool for remaining players
    room.prizePool = room.players.length * room.entryFee;
    await room.save();

    const io = req.app.get('io');
    if (io) {
      // Notify lobby
      io.to(roomId).emit('room:player-left', { playerId: req.user.id });
      // Notify home page
      io.emit('room:update', {
        id: room._id,
        playerCount: room.players.length,
        prizePool: room.prizePool,
        status: room.status,
      });
    }

    res.json({ success: true, message: 'Successfully left room' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room details
// @route   GET /api/rooms/:roomId
exports.getRoomDetails = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        roomCode: room.roomCode,
        entryFee: room.entryFee,
        status: room.status,
        playerCount: room.players.length,
        isDuel: room.isDuel,
        maxPlayers: room.maxPlayers || 10,
        players: room.players,
        prizePool: room.prizePool || (room.entryFee * (room.maxPlayers || 10)),
        results: room.results,
        startedAt: room.startedAt,
        completedAt: room.completedAt,
        gameType: room.gameType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's past games
// @route   GET /api/rooms/history
exports.getGameHistory = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      status: 'completed',
      'players.userId': req.user.id,
    })
      .sort({ completedAt: -1 })
      .limit(20)
      .select('roomCode entryFee prizePool results completedAt players');

    const history = rooms.map((room) => {
      const userResult = room.results.find(
        (r) => r.userId.toString() === req.user.id.toString()
      );
      return {
        roomCode: room.roomCode,
        entryFee: room.entryFee,
        prizePool: room.prizePool,
        playerCount: room.players.length,
        rank: userResult?.rank || '-',
        score: userResult?.score || 0,
        prize: userResult?.prize || 0,
        date: room.completedAt,
      };
    });

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};
