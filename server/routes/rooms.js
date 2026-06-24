const express = require('express');
const router = express.Router();
const {
  getGameSettings,
  getAvailableRooms,
  joinRoom,
  getRoomDetails,
  getGameHistory,
  leaveRoom,
  createCustomMinesRoom,
  joinRoomByCode,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/settings', getGameSettings);
router.get('/available', getAvailableRooms);
router.post('/join', joinRoom);
router.post('/mines/custom', createCustomMinesRoom);
router.post('/mines/join-by-code', joinRoomByCode);
router.post('/:roomId/leave', leaveRoom);
router.get('/history', getGameHistory);
router.get('/:roomId', getRoomDetails);

module.exports = router;
