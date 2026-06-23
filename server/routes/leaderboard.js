const express = require('express');
const router = express.Router();
const { getGlobalLeaderboard } = require('../controllers/leaderboardController');

router.get('/global', getGlobalLeaderboard);

module.exports = router;
