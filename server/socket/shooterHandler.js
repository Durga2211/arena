const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Room = require('../models/Room');

const TICK_RATE = 1000 / 30;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const BULLET_SPEED = 12;
const PLAYER_SPEED = 4;
const BULLET_LIFE = 50;
const PLAYER_RADIUS = 18;
const BULLET_RADIUS = 5;

const arenas = {};

function createArena(id) {
  return {
    id,
    players: {},
    bullets: {},
    isFinished: false,
    winnerId: null,
    bulletCounter: 0,
    interval: null,
    timeRemaining: 60, // 1 minute
  };
}

function setupShooter(io) {
  const shooterNs = io.of('/shooter');
  console.log('🔫 Shooter game namespace ready on /shooter');

  function startGameLoop(arena) {
    if (arena.interval) return;

    arena.interval = setInterval(() => {
      if (arena.isFinished) return;

      arena.timeRemaining -= TICK_RATE / 1000;
      if (arena.timeRemaining <= 0) {
        finishGame(arena);
        return;
      }

      // Update bullets
      const bulletsToRemove = [];
      for (const bId in arena.bullets) {
        const b = arena.bullets[bId];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        if (b.life <= 0 || b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) {
          bulletsToRemove.push(bId);
          continue;
        }

        for (const pId in arena.players) {
          const p = arena.players[pId];
          if (p.isDead || pId === b.ownerId) continue;
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PLAYER_RADIUS + BULLET_RADIUS) {
            p.health -= 25;
            bulletsToRemove.push(bId);

            // Notify hit
            shooterNs.to(arena.id).emit('hitEvent', { x: b.x, y: b.y, victimId: pId });

            if (p.health <= 0) {
              p.health = 0;
              p.isDead = true;
              p.deaths += 1;

              const killer = arena.players[b.ownerId];
              if (killer) {
                killer.score += 10;
                killer.kills += 1;
                shooterNs.to(arena.id).emit('killEvent', { killer: killer.username, victim: p.username });
              }
              respawnPlayer(arena, pId);
            }
            break;
          }
        }
      }
      bulletsToRemove.forEach((id) => delete arena.bullets[id]);

      // Broadcast state
      const state = {
        players: arena.players,
        bullets: arena.bullets,
        timeRemaining: Math.max(0, Math.floor(arena.timeRemaining)),
        isFinished: arena.isFinished,
      };
      shooterNs.to(arena.id).emit('state', state);
    }, TICK_RATE);
  }

  function respawnPlayer(arena, pId) {
    setTimeout(() => {
      if (!arena.isFinished && arena.players[pId]) {
        const p = arena.players[pId];
        p.isDead = false;
        p.health = 100;
        p.x = MAP_WIDTH / 2 + (Math.random() - 0.5) * 300;
        p.y = MAP_HEIGHT / 2 + (Math.random() - 0.5) * 200;
      }
    }, 2000);
  }

  async function finishGame(arena) {
    arena.isFinished = true;
    clearInterval(arena.interval);

    try {
      const room = await Room.findById(arena.id);
      if (room) {
        room.status = 'completed';
        room.completedAt = new Date();
        
        // Find player with highest score
        const playersArray = Object.values(arena.players);
        playersArray.sort((a, b) => b.score - a.score);
        const winner = playersArray[0];

        // Format results for ResultsPage
        const results = playersArray.map((p, index) => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
          rank: index + 1,
          prize: index === 0 ? room.prizePool : 0
        }));

        room.results = results;
        await room.save();

        if (winner && winner.score > 0) {
          arena.winnerId = winner.userId;
          const user = await User.findById(winner.userId);
          if (user) {
            user.walletBalance += room.prizePool;
            user.totalWins += 1;
            user.totalEarnings += room.prizePool;
            await user.save();

            await Transaction.create({
              userId: user._id,
              type: 'prize',
              amount: room.prizePool,
              status: 'completed',
              roomId: room._id,
              description: 'Won Shooter Arena',
            });
          }
        }
      }
    } catch (err) {
      console.error('Error finishing game:', err);
    }
    let finalWinnerName = 'Nobody';
    if (arena.winnerId) {
      const winnerObj = Object.values(arena.players).find(p => p.userId === arena.winnerId);
      if (winnerObj) finalWinnerName = winnerObj.username;
    }

    shooterNs.to(arena.id).emit('gameOver', {
      winnerId: arena.winnerId,
      winnerName: finalWinnerName,
      players: arena.players,
    });

    setTimeout(() => { delete arenas[arena.id]; }, 5000);
  }

  shooterNs.on('connection', async (socket) => {
    const token = socket.handshake.auth.token;
    const roomId = socket.handshake.auth.roomId;
    
    if (!token || !roomId) {
      socket.emit('error_msg', 'Missing token or roomId');
      socket.disconnect();
      return;
    }

    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
      if (!user) throw new Error('User not found');
    } catch (err) {
      socket.emit('error_msg', 'Authentication failed');
      socket.disconnect();
      return;
    }

    try {
      const room = await Room.findById(roomId);
      if (!room || room.status !== 'active' || room.gameType !== 'shooter') {
        socket.emit('error_msg', 'Room is not active or invalid');
        socket.disconnect();
        return;
      }

      // Verify user is part of the room
      const isPlayer = room.players.some((p) => p.userId.toString() === user._id.toString());
      if (!isPlayer) {
        socket.emit('error_msg', 'You are not registered in this room');
        socket.disconnect();
        return;
      }

      // Setup arena
      if (!arenas[roomId]) {
        // First to 100 points wins
        arenas[roomId] = createArena(roomId, 100);
      }
      
      const arena = arenas[roomId];
      socket.join(arena.id);
      socket.arenaId = arena.id;

      arena.players[socket.id] = {
        userId: user._id.toString(),
        username: user.username,
        x: MAP_WIDTH / 2 + (Math.random() - 0.5) * 300,
        y: MAP_HEIGHT / 2 + (Math.random() - 0.5) * 200,
        rotation: 0,
        health: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        isDead: false,
        lastShot: 0,
      };

      socket.emit('joined', {
        arenaId: arena.id,
        playerId: socket.id,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
      });

      startGameLoop(arena);

    } catch (err) {
      console.error(err);
      socket.emit('error_msg', 'Server error joining room');
      socket.disconnect();
    }

    socket.on('move', (data) => {
      const arena = arenas[socket.arenaId];
      if (!arena) return;
      const player = arena.players[socket.id];
      if (!player || player.isDead || arena.isFinished) return;

      if (data.left) player.x -= PLAYER_SPEED;
      if (data.right) player.x += PLAYER_SPEED;
      if (data.up) player.y -= PLAYER_SPEED;
      if (data.down) player.y += PLAYER_SPEED;

      player.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, player.y));

      if (data.rotation !== undefined) player.rotation = data.rotation;
    });

    socket.on('shoot', () => {
      const arena = arenas[socket.arenaId];
      if (!arena) return;
      const player = arena.players[socket.id];
      if (!player || player.isDead || arena.isFinished) return;

      const now = Date.now();
      if (now - player.lastShot < 300) return;
      player.lastShot = now;

      arena.bulletCounter++;
      const bId = 'b_' + arena.bulletCounter;
      const vx = Math.cos(player.rotation) * BULLET_SPEED;
      const vy = Math.sin(player.rotation) * BULLET_SPEED;

      arena.bullets[bId] = {
        x: player.x + Math.cos(player.rotation) * 25,
        y: player.y + Math.sin(player.rotation) * 25,
        vx, vy,
        ownerId: socket.id,
        life: BULLET_LIFE,
        damage: 25,
      };

      shooterNs.to(arena.id).emit('shotFired', {
        x: player.x, y: player.y, rotation: player.rotation, shooterId: socket.id,
      });
    });

    socket.on('disconnect', () => {
      const arena = arenas[socket.arenaId];
      if (arena && arena.players[socket.id]) {
        delete arena.players[socket.id];
        
        // We don't delete the arena if everyone leaves because it's managed by room system,
        // but if we want it to close if empty:
        if (Object.keys(arena.players).length === 0) {
          clearInterval(arena.interval);
          delete arenas[arena.id];
        }
      }
    });
  });
}

module.exports = { setupShooter, activeShooterGames: arenas };
