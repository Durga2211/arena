const Room = require('../models/Room');
const User = require('../models/User');

class MatchmakingHandler {
  constructor(io) {
    this.io = io;
    this.arenaQueue = [];
    this.stallTimer = null;
  }

  handleConnection(socket) {
    socket.on('queue:join', async ({ betAmount }) => {
      // Validate betAmount
      const bet = Number(betAmount);
      if (isNaN(bet) || bet < 50 || bet > 250) {
        socket.emit('error', { message: 'Bet must be between ₹50 and ₹250' });
        return;
      }

      // Add to queue if not already in it
      if (!this.arenaQueue.find(p => p.socketId === socket.id)) {
        try {
          const user = await User.findById(socket.userId);
          if (!user) return;

          this.arenaQueue.push({
            socketId: socket.id,
            userId: user._id,
            username: user.username,
            avatar: user.avatar,
            betAmount: bet
          });

          // Check if queue hits max (10)
          if (this.arenaQueue.length >= 10) {
            this.clearStallTimer();
            await this.createMatch(this.arenaQueue.splice(0, 10));
          } else if (this.arenaQueue.length === 1) {
            // First person joined, wait for 2nd
          } else if (this.arenaQueue.length === 2 && !this.stallTimer) {
            // 2nd person joined, start 5-second anti-stall rule
            this.stallTimer = setTimeout(() => {
              this.stallTimer = null;
              if (this.arenaQueue.length >= 2) {
                this.createMatch(this.arenaQueue.splice(0, this.arenaQueue.length));
              }
            }, 5000);
          }
        } catch (error) {
          console.error('Queue Join Error:', error);
        }
      }
    });

    socket.on('queue:leave', () => {
      this.removeFromQueue(socket.id);
    });

    socket.on('disconnect', () => {
      this.removeFromAllQueues(socket.id);
    });
  }

  removeFromQueue(socketId) {
    this.arenaQueue = this.arenaQueue.filter(p => p.socketId !== socketId);
    if (this.arenaQueue.length < 2) {
      this.clearStallTimer();
    }
  }

  removeFromAllQueues(socketId) {
    this.removeFromQueue(socketId);
  }

  clearStallTimer() {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  async createMatch(playersList) {
    try {
      let attempts = 0;
      let roomCode = '';
      while (attempts < 10) {
        roomCode = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 4; i++) roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        const existing = await Room.findOne({ roomCode, status: 'waiting' });
        if (!existing) break;
        attempts++;
      }

      // Calculate total pool based on human individual bets
      const totalPool = playersList.reduce((sum, p) => sum + p.betAmount, 0);
      
      const room = await Room.create({
        roomCode,
        entryFee: 0, // Ignored for Arena, handled per-player
        maxPlayers: playersList.length,
        gameType: 'mines',
        isDuel: false,
        isArena: true,
        prizePool: totalPool,
        platformFee: 0,
        status: 'waiting',
        players: playersList.map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          betAmount: p.betAmount
        }))
      });

      // Deduct specific entry fees from all players
      for (const p of playersList) {
        await User.findByIdAndUpdate(p.userId, { $inc: { walletBalance: -p.betAmount } });
        // Send success event to socket so they transition to the game
        this.io.to(p.socketId).emit('queue:match_found', { roomId: room._id });
      }

    } catch (error) {
      console.error('Error creating matchmaking match:', error);
      // In a robust system, refund users here if creation fails
    }
  }
}

module.exports = MatchmakingHandler;
