const express = require('express');
const router = express.Router();
const minesGlobalController = require('../controllers/minesGlobalController');
const { protect } = require('../middleware/auth');

router.post('/join', protect, minesGlobalController.joinRound);
router.post('/submit', protect, minesGlobalController.submitRound);

module.exports = router;
