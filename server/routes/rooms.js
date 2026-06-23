const express = require('express');
const router = express.Router();
const {
  getAvailableRooms,
  joinRoom,
  getRoomDetails,
  getGameHistory,
  leaveRoom,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/available', getAvailableRooms);
router.post('/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.get('/history', getGameHistory);
router.get('/:roomId', getRoomDetails);

module.exports = router;
