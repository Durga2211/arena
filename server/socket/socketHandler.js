const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const GameService = require('../services/gameService');


const setupSocket = (io) => {
  const gameService = new GameService(io);

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join a room's socket channel
    socket.on('room:join', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if player is in the room's player list
        const isPlayer = room.players.some(
          (p) => p.userId.toString() === socket.userId
        );
        if (!isPlayer) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        socket.join(roomId);
        socket.currentRoom = roomId;

        // Notify others
        const player = room.players.find(
          (p) => p.userId.toString() === socket.userId
        );
        socket.to(roomId).emit('room:player-joined', {
          player,
          playerCount: room.players.length,
        });

        // Send current room state to the joining player
        socket.emit('room:state', {
          players: room.players,
          playerCount: room.players.length,
          status: room.status,
          maxPlayers: room.maxPlayers || 10,
          gameType: room.gameType,
        });

        // If room is active, sync the game state
        if (room.status === 'active') {
          if (room.gameType === 'shooter') {
            socket.emit('shooter:start');
          } else {
            const gameState = gameService.activeGames.get(roomId);
            if (gameState) {
              const timeRemaining = 60 - Math.floor((Date.now() - gameState.startTime) / 1000);
              const clientQuestions = gameState.questions.map((q, i) => ({
                index: i,
                question: q.question,
                options: q.options,
                category: q.category,
              }));
              
              socket.emit('quiz:start', {
                questions: clientQuestions,
                totalTime: 60,
                totalQuestions: clientQuestions.length,
              });
              socket.emit('quiz:tick', { timeRemaining });
            }
          }
        }

        // If room is in countdown, sync the late-joining player
        if (room.status === 'countdown') {
          const countdownState = gameService.activeCountdowns.get(roomId);
          if (countdownState) {
            socket.emit('room:countdown', { seconds: countdownState.remaining });
          }
        }

        // Check if room is full and still waiting (backup trigger)
        if (room.players.length >= (room.maxPlayers || 10) && room.status === 'waiting') {
          io.to(roomId).emit('room:full', {});
          await gameService.startCountdown(roomId);
        }
      } catch (error) {
        console.error('Error joining room socket:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('room:leave', async ({ roomId }) => {
      socket.leave(roomId);
      socket.currentRoom = null;

      try {
        const room = await Room.findById(roomId);
        if (room) {
          socket.to(roomId).emit('room:player-left', {
            playerId: socket.userId,
            playerCount: room.players.length,
          });
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    // Force start room (Test)
    socket.on('room:force-start', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (room && room.status === 'waiting') {
          // Verify user is in room
          const isPlayer = room.players.some((p) => p.userId.toString() === socket.userId);
          if (isPlayer) {
            io.to(roomId).emit('room:full', {}); // Trigger UI countdown overlay
            await gameService.startCountdown(roomId);
          }
        }
      } catch (error) {
        console.error('Error force starting room:', error);
      }
    });

    // Submit answer
    socket.on('quiz:answer', ({ roomId, questionIndex, answerIndex }) => {
      gameService.processAnswer(roomId, socket.userId, {
        questionIndex,
        answerIndex,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('room:player-left', {
          playerId: socket.userId,
        });
      }
    });
  });

  return gameService;
};

module.exports = setupSocket;
