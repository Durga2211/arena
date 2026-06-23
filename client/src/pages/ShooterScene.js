import Phaser from 'phaser';
import io from 'socket.io-client';

export default class ShooterScene extends Phaser.Scene {
  constructor() {
    super('ShooterScene');
    this.isReady = false;
  }

  init(data) {
    this.token = data.token;
    this.user = data.user;
    this.roomId = data.roomId;
    this.onGameOver = data.onGameOver;
    this.playerSprites = {};
    this.bulletSprites = {};
    this.myId = null;
    this.gameState = null;
    this.isReady = false;
    this.socket = null;
    this.killFeedTexts = [];
  }

  create() {
    // ── Textures ──
    this.createTextures();

    // ── Background ──
    this.add.rectangle(400, 300, 800, 600, 0x0a0a1a).setDepth(0);
    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0x1a1a3e, 0.4);
    for (let x = 0; x <= 800; x += 40) grid.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 40) grid.lineBetween(0, y, 800, y);

    // ── HUD ──
    this.scoreText = this.add.text(10, 10, '🎯 Score: 0', {
      fontSize: '15px', fill: '#ffffff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(300);

    this.healthText = this.add.text(10, 30, '❤️ HP: 100', {
      fontSize: '15px', fill: '#00ff88', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(300);

    this.killsText = this.add.text(10, 50, '💀 Kills: 0', {
      fontSize: '15px', fill: '#ff6b6b', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(300);

    this.timerText = this.add.text(400, 12, '1:00', {
      fontSize: '20px', fill: '#ffaa00', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(300).setOrigin(0.5, 0);

    this.statusText = this.add.text(400, 300, '⚔️ Connecting...', {
      fontSize: '22px', fill: '#ffcc00', fontFamily: 'monospace',
      align: 'center', stroke: '#000', strokeThickness: 4,
    }).setDepth(300).setOrigin(0.5);

    // Hit flash overlay
    this.hitFlash = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0).setDepth(250);

    // Crosshair
    this.crosshair = this.add.sprite(400, 300, 'crosshair_tex').setDepth(150).setAlpha(0.8);

    // Scoreboard (top-right)
    this.scoreboardTexts = [];
    for (let i = 0; i < 5; i++) {
      const t = this.add.text(790, 10 + i * 16, '', {
        fontSize: '11px', fill: '#aaa', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(300).setOrigin(1, 0);
      this.scoreboardTexts.push(t);
    }

    // Kill feed (bottom-left)
    this.killFeedTexts = [];
    for (let i = 0; i < 4; i++) {
      const t = this.add.text(10, 560 - i * 18, '', {
        fontSize: '11px', fill: '#ccc', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setDepth(300).setAlpha(0);
      this.killFeedTexts.push(t);
    }

    // ── Input ──
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Mobile Joystick
    this.input.addPointer(2); // Enable multi-touch
    this.joystickBase = this.add.circle(100, 500, 40, 0x888888, 0.2).setDepth(400).setScrollFactor(0);
    this.joystickThumb = this.add.circle(100, 500, 20, 0xcccccc, 0.5).setDepth(401).setScrollFactor(0);
    this.joystickActive = false;
    this.joystickVector = { x: 0, y: 0 };
    this.joystickPointerId = null;

    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < 400 && !this.joystickActive) {
        // Left side: move joystick
        this.joystickActive = true;
        this.joystickPointerId = pointer.id;
        this.joystickBase.setPosition(pointer.x, pointer.y);
        this.joystickThumb.setPosition(pointer.x, pointer.y);
      } else {
        // Right side: shoot
        if (this.socket && this.myId) {
          this.socket.emit('shoot');
        }
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.joystickActive && pointer.id === this.joystickPointerId) {
        let dx = pointer.x - this.joystickBase.x;
        let dy = pointer.y - this.joystickBase.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 40) {
          dx = (dx / dist) * 40;
          dy = (dy / dist) * 40;
        }
        this.joystickThumb.setPosition(this.joystickBase.x + dx, this.joystickBase.y + dy);
        this.joystickVector.x = dx / 40;
        this.joystickVector.y = dy / 40;
      }
    });

    const stopJoystick = (pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickActive = false;
        this.joystickPointerId = null;
        this.joystickBase.setPosition(100, 500);
        this.joystickThumb.setPosition(100, 500);
        this.joystickVector = { x: 0, y: 0 };
      }
    };

    this.input.on('pointerup', stopJoystick);
    this.input.on('pointerout', stopJoystick);

    // ── Mark ready ──
    this.isReady = true;

    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());

    // ── Connect ──
    this.connectSocket();
  }

  cleanup() {
    this.isReady = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createTextures() {
    const g = this.add.graphics();

    // Player (me) - glowing blue
    g.fillStyle(0x3b82f6, 1);
    g.fillCircle(20, 20, 18);
    g.lineStyle(2, 0x60a5fa, 1);
    g.strokeCircle(20, 20, 18);
    g.fillStyle(0x93c5fd, 1);
    g.fillRect(34, 17, 12, 6);
    g.generateTexture('player_me', 48, 40);
    g.clear();

    // Player (enemy) - red
    g.fillStyle(0xdc2626, 1);
    g.fillCircle(20, 20, 18);
    g.lineStyle(2, 0xf87171, 1);
    g.strokeCircle(20, 20, 18);
    g.fillStyle(0xfca5a5, 1);
    g.fillRect(34, 17, 12, 6);
    g.generateTexture('player_enemy', 48, 40);
    g.clear();

    // Bullet - bright yellow
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xfef3c7, 0.5);
    g.fillCircle(4, 4, 6);
    g.generateTexture('bullet_tex', 12, 12);
    g.clear();

    // Crosshair
    g.lineStyle(2, 0x00ff88, 0.9);
    g.strokeCircle(12, 12, 10);
    g.lineBetween(12, 0, 12, 24);
    g.lineBetween(0, 12, 24, 12);
    g.generateTexture('crosshair_tex', 24, 24);
    g.clear();
  }

  connectSocket() {
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5001');
    this.socket = io(`${socketUrl}/shooter`, {
      auth: { token: this.token, roomId: this.roomId },
    });

    this.socket.on('joined', (data) => {
      if (!this.isReady) return;
      this.myId = data.playerId;
      this.statusText.setText('');
    });

    this.socket.on('state', (state) => this.syncState(state));
    this.socket.on('error_msg', (msg) => {
      if (!this.isReady) return;
      this.statusText.setText(`❌ ${msg}`).setFill('#ff0000');
    });

    this.socket.on('hitEvent', (data) => {
      if (!this.isReady) return;
      if (data.victimId === this.myId) {
        this.hitFlash.setAlpha(0.4);
        this.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 200 });
        this.cameras.main.shake(150, 0.01);
      }
    });

    this.socket.on('killEvent', (data) => {
      if (!this.isReady) return;
      this.addFeedMessage(`💀 ${data.killer} killed ${data.victim}`);
    });

    this.socket.on('gameOver', (data) => {
      if (!this.isReady) return;
      this.statusText.setText(`🏆 GAME OVER!\nWinner: ${data.winnerName}`).setFill('#00ff88');
      
      const p = this.playerSprites[this.myId];
      if (p && p.hpBar) p.hpBar.destroy();
      if (p && p.nameText) p.nameText.destroy();

      setTimeout(() => {
        if (this.onGameOver) this.onGameOver(data);
      }, 3000);
    });
  }

  addFeedMessage(msg) {
    for (let i = this.killFeedTexts.length - 1; i > 0; i--) {
      this.killFeedTexts[i].setText(this.killFeedTexts[i - 1].text);
      this.killFeedTexts[i].setAlpha(this.killFeedTexts[i - 1].alpha);
    }
    this.killFeedTexts[0].setText(msg);
    this.killFeedTexts[0].setAlpha(1);
    this.tweens.add({ targets: this.killFeedTexts[0], alpha: 0, delay: 4000, duration: 1000 });
  }

  syncState(state) {
    if (!this.isReady) return;
    this.gameState = state;

    if (state.timeRemaining !== undefined) {
      const min = Math.floor(state.timeRemaining / 60);
      const sec = state.timeRemaining % 60;
      this.timerText.setText(`${min}:${sec < 10 ? '0' : ''}${sec}`);
      if (state.timeRemaining <= 10) {
        this.timerText.setFill('#ff0000');
      } else {
        this.timerText.setFill('#ffaa00');
      }
    }

    // Players
    for (const pId in state.players) {
      const pData = state.players[pId];

      if (!this.playerSprites[pId]) {
        const tex = pId === this.myId ? 'player_me' : 'player_enemy';
        const sprite = this.add.sprite(pData.x, pData.y, tex).setDepth(10);
        const hpBar = this.add.graphics().setDepth(12);
        const nameText = this.add.text(pData.x, pData.y - 30, pData.username, {
          fontSize: '10px', fill: pId === this.myId ? '#3b82f6' : '#ef4444',
          fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(12);

        this.playerSprites[pId] = { sprite, hpBar, nameText };
      }

      const pObj = this.playerSprites[pId];
      
      if (pData.isDead) {
        pObj.sprite.setVisible(false);
        pObj.hpBar.setVisible(false);
        pObj.nameText.setVisible(false);
      } else {
        pObj.sprite.setVisible(true);
        pObj.hpBar.setVisible(true);
        pObj.nameText.setVisible(true);

        this.tweens.add({
          targets: pObj.sprite, x: pData.x, y: pData.y, rotation: pData.rotation,
          duration: 100, ease: 'Linear', overwrite: true,
        });
        this.tweens.add({
          targets: [pObj.nameText, pObj.hpBar], x: pData.x, y: pData.y,
          duration: 100, ease: 'Linear', overwrite: true,
        });

        pObj.hpBar.clear();
        const hpColor = pData.health > 50 ? 0x00ff00 : pData.health > 25 ? 0xffff00 : 0xff0000;
        pObj.hpBar.fillStyle(0x000000, 0.8);
        pObj.hpBar.fillRect(-20, -22, 40, 6);
        pObj.hpBar.fillStyle(hpColor, 1);
        pObj.hpBar.fillRect(-19, -21, (pData.health / 100) * 38, 4);

        if (pId === this.myId) {
          this.scoreText.setText(`🎯 Score: ${pData.score}`);
          this.healthText.setText(`❤️ HP: ${pData.health}`);
          this.killsText.setText(`💀 Kills: ${pData.kills}`);
          if (pData.health <= 30) this.healthText.setFill('#ff0000');
          else this.healthText.setFill('#00ff88');
        }
      }
    }

    // Remove old players
    for (const pId in this.playerSprites) {
      if (!state.players[pId]) {
        this.playerSprites[pId].sprite.destroy();
        this.playerSprites[pId].hpBar.destroy();
        this.playerSprites[pId].nameText.destroy();
        delete this.playerSprites[pId];
      }
    }

    // Bullets
    for (const bId in state.bullets) {
      const bData = state.bullets[bId];
      if (!this.bulletSprites[bId]) {
        this.bulletSprites[bId] = this.add.sprite(bData.x, bData.y, 'bullet_tex').setDepth(5);
      } else {
        this.tweens.add({
          targets: this.bulletSprites[bId],
          x: bData.x, y: bData.y,
          duration: 100, ease: 'Linear', overwrite: true,
        });
      }
    }

    for (const bId in this.bulletSprites) {
      if (!state.bullets[bId]) {
        this.bulletSprites[bId].destroy();
        delete this.bulletSprites[bId];
      }
    }

    // Scoreboard
    const sorted = Object.values(state.players).sort((a, b) => b.score - a.score);
    for (let i = 0; i < 5; i++) {
      if (sorted[i]) {
        const p = sorted[i];
        let medal = '';
        if (i === 0) medal = '🥇 ';
        if (i === 1) medal = '🥈 ';
        if (i === 2) medal = '🥉 ';
        this.scoreboardTexts[i].setText(`${medal}${p.username}: ${p.score}`);
        this.scoreboardTexts[i].setFill(p.userId === this.user._id ? '#00ff88' : '#aaa');
      } else {
        this.scoreboardTexts[i].setText('');
      }
    }
  }

  update() {
    if (!this.isReady || !this.socket || !this.myId || !this.gameState || this.gameState.isFinished) return;

    const me = this.gameState.players[this.myId];
    if (me && me.isDead) return;

    let dx = 0;
    let dy = 0;
    let moved = false;

    if (this.cursors.left.isDown) { dx = -1; moved = true; }
    if (this.cursors.right.isDown) { dx = 1; moved = true; }
    if (this.cursors.up.isDown) { dy = -1; moved = true; }
    if (this.cursors.down.isDown) { dy = 1; moved = true; }

    // Joystick movement
    if (this.joystickActive) {
      if (this.joystickVector.x < -0.3) { dx = -1; moved = true; }
      else if (this.joystickVector.x > 0.3) { dx = 1; moved = true; }
      if (this.joystickVector.y < -0.3) { dy = -1; moved = true; }
      else if (this.joystickVector.y > 0.3) { dy = 1; moved = true; }
    }

    // Aiming pointer logic
    let aimPointer = this.input.activePointer;
    if (this.joystickActive && aimPointer.id === this.joystickPointerId) {
      // Find a pointer that isn't the joystick
      if (this.input.pointer1.active && this.input.pointer1.id !== this.joystickPointerId) {
        aimPointer = this.input.pointer1;
      } else if (this.input.pointer2.active && this.input.pointer2.id !== this.joystickPointerId) {
        aimPointer = this.input.pointer2;
      }
    }

    let rotation = undefined;
    if (aimPointer && aimPointer.active && aimPointer.id !== this.joystickPointerId) {
      this.crosshair.setPosition(aimPointer.x, aimPointer.y);
      if (this.playerSprites[this.myId]) {
        const pSprite = this.playerSprites[this.myId].sprite;
        rotation = Phaser.Math.Angle.Between(pSprite.x, pSprite.y, aimPointer.x, aimPointer.y);
      }
    }

    if (moved || rotation !== undefined) {
      this.socket.emit('move', { 
        left: dx < 0, right: dx > 0, 
        up: dy < 0, down: dy > 0, 
        rotation 
      });
    }
  }
}
