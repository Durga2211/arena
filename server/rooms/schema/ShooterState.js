const { Schema, type, MapSchema } = require('@colyseus/schema');

class Player extends Schema {
  constructor(userId, username) {
    super();
    this.userId = userId;
    this.username = username;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.health = 100;
    this.score = 0;
    this.isDead = false;
  }
}

type("string")(Player.prototype, "userId");
type("string")(Player.prototype, "username");
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "rotation");
type("number")(Player.prototype, "health");
type("number")(Player.prototype, "score");
type("boolean")(Player.prototype, "isDead");

class Bullet extends Schema {
  constructor(id, x, y, velocityX, velocityY, ownerId) {
    super();
    this.id = id;
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.ownerId = ownerId;
    this.life = 100; // frames or distance
  }
}

type("string")(Bullet.prototype, "id");
type("number")(Bullet.prototype, "x");
type("number")(Bullet.prototype, "y");
type("number")(Bullet.prototype, "velocityX");
type("number")(Bullet.prototype, "velocityY");
type("string")(Bullet.prototype, "ownerId");
type("number")(Bullet.prototype, "life");

class ShooterState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.bullets = new MapSchema();
    this.timeRemaining = 300; // 5 minutes
    this.isFinished = false;
    this.winnerId = "";
  }
}

type({ map: Player })(ShooterState.prototype, "players");
type({ map: Bullet })(ShooterState.prototype, "bullets");
type("number")(ShooterState.prototype, "timeRemaining");
type("boolean")(ShooterState.prototype, "isFinished");
type("string")(ShooterState.prototype, "winnerId");

module.exports = { ShooterState, Player, Bullet };
