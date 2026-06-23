const Room = require('../models/Room');
const Question = require('../models/Question');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const QUIZ_DURATION = 30; // seconds
const QUESTIONS_PER_QUIZ = 10;
const COUNTDOWN_SECONDS = 5;
const PLATFORM_FEE_PERCENT = 10;
// New rules: Winner gets 500, rest get 10.

class GameService {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // roomId -> game state
    this.activeCountdowns = new Map(); // roomId -> { endTime }
  }

  async startCountdown(roomId) {
    // Prevent double-start synchronously
    if (this.activeCountdowns.has(roomId)) return;
    
    // Set lock immediately to prevent race conditions during async DB operations
    let count = COUNTDOWN_SECONDS;
    this.activeCountdowns.set(roomId, { remaining: count });

    try {
      const room = await Room.findById(roomId);
      if (!room || room.status !== 'waiting') {
        this.activeCountdowns.delete(roomId);
        return;
      }

      room.status = 'countdown';
      await room.save();

    const countdownInterval = setInterval(async () => {
      this.io.to(roomId).emit('room:countdown', { seconds: count });
      this.activeCountdowns.set(roomId, { remaining: count });
      count--;

      if (count < 0) {
        clearInterval(countdownInterval);
        this.activeCountdowns.delete(roomId);
        if (room.gameType === 'shooter') {
          await this.startShooter(roomId);
        } else {
          await this.startQuiz(roomId);
        }
      }
    }, 1000);
    
    } catch (error) {
      console.error('Error in startCountdown:', error);
      this.activeCountdowns.delete(roomId);
    }
  }

  async startShooter(roomId) {
    try {
      const room = await Room.findById(roomId);
      room.status = 'active';
      room.startedAt = new Date();
      await room.save();

      this.io.to(roomId).emit('shooter:start');
    } catch (error) {
      console.error('Error starting shooter game:', error);
    }
  }

  async startQuiz(roomId) {
    try {
      // Get random questions
      const questions = await Question.aggregate([
        { $sample: { size: QUESTIONS_PER_QUIZ } },
      ]);

      if (questions.length === 0) {
        this.io.to(roomId).emit('quiz:error', { message: 'Not enough questions available' });
        return;
      }

      const room = await Room.findById(roomId);
      room.status = 'active';
      room.startedAt = new Date();
      room.questions = questions.map((q) => q._id);
      await room.save();

      // Prepare questions for clients (hide correct answer)
      const clientQuestions = questions.map((q, i) => ({
        index: i,
        question: q.question,
        options: q.options,
        category: q.category,
      }));

      // Store game state in memory
      this.activeGames.set(roomId, {
        questions,
        answers: new Map(), // playerId -> [{questionIndex, answerIndex, timestamp}]
        startTime: Date.now(),
        timer: null,
      });

      // Send quiz to all players
      this.io.to(roomId).emit('quiz:start', {
        questions: clientQuestions,
        totalTime: QUIZ_DURATION,
        totalQuestions: clientQuestions.length,
      });

      // Server timer
      let timeRemaining = QUIZ_DURATION;
      const gameState = this.activeGames.get(roomId);

      gameState.timer = setInterval(async () => {
        timeRemaining--;
        this.io.to(roomId).emit('quiz:tick', { timeRemaining });

        if (timeRemaining <= 0) {
          clearInterval(gameState.timer);
          await this.endQuiz(roomId);
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }

  processAnswer(roomId, playerId, data) {
    const gameState = this.activeGames.get(roomId);
    if (!gameState) return;

    const { questionIndex, answerIndex } = data;

    if (!gameState.answers.has(playerId)) {
      gameState.answers.set(playerId, []);
    }

    const playerAnswers = gameState.answers.get(playerId);

    // Prevent duplicate answers for same question
    if (playerAnswers.some((a) => a.questionIndex === questionIndex)) return;

    playerAnswers.push({
      questionIndex,
      answerIndex,
      timestamp: Date.now(),
    });

    // Notify others that this player answered (without revealing answer)
    this.io.to(roomId).emit('quiz:player-answered', {
      playerId,
      questionIndex,
      totalAnswered: playerAnswers.length,
    });
  }

  async endQuiz(roomId) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return;

      const room = await Room.findById(roomId);
      if (!room) return;

      const { questions, answers, startTime } = gameState;

      // Calculate scores
      const scores = [];
      for (const player of room.players) {
        const playerId = player.userId.toString();
        const playerAnswers = answers.get(playerId) || [];

        let score = 0;
        let correctCount = 0;
        let totalTimeTaken = 0;

        for (const answer of playerAnswers) {
          const question = questions[answer.questionIndex];
          if (question && answer.answerIndex === question.correctAnswer) {
            correctCount++;
            score += 2;
          }
          const timeTaken = (answer.timestamp - startTime) / 1000;
          totalTimeTaken += timeTaken;
        }

        scores.push({
          userId: player.userId,
          username: player.username,
          score,
          correctAnswers: correctCount,
          attempted: playerAnswers.length,
          timeTaken: Math.round(totalTimeTaken),
          rank: 0,
          prize: 0,
        });
      }

      // Sort by score (desc), then by time taken (asc)
      scores.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);

      // Assign ranks
      scores.forEach((s, i) => { s.rank = i + 1; });

      // Calculate prizes
      const prizePool = room.entryFee * room.players.length;
      let totalPrizesDistributed = 0;

      for (let i = 0; i < scores.length; i++) {
        let prizeAmount = 0;
        if (scores[i].rank === 1) {
          prizeAmount = 500;
        } else {
          prizeAmount = 10;
        }
        scores[i].prize = prizeAmount;
        totalPrizesDistributed += prizeAmount;
      }

      const platformFee = prizePool - totalPrizesDistributed;

      // Update room
      room.status = 'completed';
      room.completedAt = new Date();
      room.results = scores;
      room.prizePool = prizePool;
      room.platformFee = platformFee;
      await room.save();

      // Credit prizes to winners' wallets
      for (const result of scores) {
        if (result.prize > 0) {
          await User.findByIdAndUpdate(result.userId, {
            $inc: {
              walletBalance: result.prize,
              totalEarnings: result.prize,
              totalWins: result.rank <= 3 ? 1 : 0,
            },
          });

          await Transaction.create({
            userId: result.userId,
            type: 'prize',
            amount: result.prize,
            status: 'completed',
            roomId: room._id,
            description: `Prize for rank #${result.rank} in room ${room.roomCode}`,
          });
        }

        // Update games played for all players
        await User.findByIdAndUpdate(result.userId, {
          $inc: { totalGamesPlayed: 1 },
        });
      }

      // Emit results
      this.io.to(roomId).emit('quiz:end', {
        results: scores,
        prizePool,
        platformFee,
      });

      // Cleanup
      this.activeGames.delete(roomId);
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }
}

module.exports = GameService;
