const { Room } = require('colyseus');
const { ShooterState, Player, Bullet } = require('./schema/ShooterState');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');

class ShooterRoom extends Room {
  async onCreate(options) {
    this.maxClients = 10;
    this.setState(new ShooterState());
    
    // 60 FPS Game Loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead && !this.state.isFinished) {
        // Basic movement (no collision for now)
        const speed = 5;
        if (data.left) player.x -= speed;
        if (data.right) player.x += speed;
        if (data.up) player.y -= speed;
        if (data.down) player.y += speed;
        if (data.rotation !== undefined) player.rotation = data.rotation;
      }
    });

    this.onMessage("shoot", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead && !this.state.isFinished) {
        const bulletId = Math.random().toString(36).substring(7);
        // Simple bullet physics
        const bulletSpeed = 15;
        const vx = Math.cos(player.rotation) * bulletSpeed;
        const vy = Math.sin(player.rotation) * bulletSpeed;
        
        // Offset starting position slightly ahead of player
        const startX = player.x + Math.cos(player.rotation) * 20;
        const startY = player.y + Math.sin(player.rotation) * 20;

        this.state.bullets.set(bulletId, new Bullet(bulletId, startX, startY, vx, vy, client.sessionId));
      }
    });
  }

  async onAuth(client, options, request) {
    try {
      if (!options.token) return false;
      const decoded = jwt.verify(options.token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) return false;
      
      // Check entry fee (Assume 50 rs for arena)
      const ENTRY_FEE = 50;
      if (user.walletBalance < ENTRY_FEE) {
        throw new Error("Insufficient balance");
      }

      // Deduct fee and save
      const deductSuccess = await walletService.deductEntryFee(user._id, ENTRY_FEE);
      if (!deductSuccess) {
        throw new Error("Insufficient balance");
      }
      user.totalGamesPlayed += 1;
      await user.save();

      // Log transaction
      await Transaction.create({
        userId: user._id,
        type: 'entry_fee',
        amount: ENTRY_FEE,
        status: 'completed',
        description: 'Joined Shooter Arena',
      });

      return { user }; // Attached to client.auth
    } catch (error) {
      console.error("Auth error:", error);
      return false;
    }
  }

  onJoin(client, options) {
    console.log(client.sessionId, "joined!");
    const user = client.auth.user;
    const newPlayer = new Player(user._id.toString(), user.username);
    
    // Random spawn point
    newPlayer.x = Math.random() * 800;
    newPlayer.y = Math.random() * 600;
    
    this.state.players.set(client.sessionId, newPlayer);
  }

  update(deltaTime) {
    if (this.state.isFinished) return;

    // Time remaining
    this.state.timeRemaining -= deltaTime / 1000;
    if (this.state.timeRemaining <= 0) {
      this.finishGame();
      return;
    }

    // Update bullets
    this.state.bullets.forEach((bullet, key) => {
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;
      bullet.life -= 1;

      if (bullet.life <= 0) {
        this.state.bullets.delete(key);
      } else {
        // Collision checking
        this.state.players.forEach((player, playerKey) => {
          if (!player.isDead && playerKey !== bullet.ownerId) {
            const dx = player.x - bullet.x;
            const dy = player.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Simple circular hit box
            if (distance < 20) {
              player.health -= 25;
              this.state.bullets.delete(key);

              if (player.health <= 0) {
                player.isDead = true;
                player.health = 0;
                
                // Give killer score
                const killer = this.state.players.get(bullet.ownerId);
                if (killer) {
                  killer.score += 10;
                  // First to 100 wins
                  if (killer.score >= 100) {
                    this.finishGame(bullet.ownerId);
                  }
                }
              }
            }
          }
        });
      }
    });
  }

  async finishGame(winnerSessionId = null) {
    this.state.isFinished = true;
    
    if (!winnerSessionId) {
      // Find highest score if time ran out
      let highestScore = -1;
      this.state.players.forEach((player, key) => {
        if (player.score > highestScore) {
          highestScore = player.score;
          winnerSessionId = key;
        }
      });
    }

    if (winnerSessionId) {
      const winner = this.state.players.get(winnerSessionId);
      this.state.winnerId = winner.userId;
      
      // Award prize
      try {
        const PRIZE = 200; // Example fixed prize
        const user = await User.findById(winner.userId);
        if (user) {
          user.walletBalance += PRIZE;
          user.winningsBalance += PRIZE;
          user.totalWins += 1;
          user.totalEarnings += PRIZE;
          await user.save();

          await Transaction.create({
            userId: user._id,
            type: 'prize',
            amount: PRIZE,
            status: 'completed',
            description: 'Won Shooter Arena',
          });
        }
      } catch (err) {
        console.error("Error awarding prize:", err);
      }
    }

    // Disconnect everyone after 5 seconds
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 5000);
  }

  onLeave(client, consented) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("Room disposed");
  }
}

module.exports = ShooterRoom;
