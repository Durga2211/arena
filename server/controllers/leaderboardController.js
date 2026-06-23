const User = require('../models/User');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard/global
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const leaders = await User.find({ totalGamesPlayed: { $gt: 0 } })
      .sort({ totalEarnings: -1 })
      .limit(50)
      .select('username avatar totalGamesPlayed totalWins totalEarnings');

    res.json({ success: true, leaderboard: leaders });
  } catch (error) {
    next(error);
  }
};
