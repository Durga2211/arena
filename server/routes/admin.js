const express = require('express');
const { requireAdmin } = require('../middleware/admin');
const { getAllTransactions, getPlatformStats, getActiveRooms, endRoom, getWithdrawalRequests, approveWithdrawal, createCustomRoom, getLiveRoomStats, getSettings, updateSettings } = require('../controllers/adminController');

const router = express.Router();

// Only require the admin password header
router.use(requireAdmin);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/transactions', getAllTransactions);
router.get('/stats', getPlatformStats);
router.get('/rooms', getActiveRooms);
router.post('/rooms', createCustomRoom);
router.post('/rooms/:id/end', endRoom);
router.get('/rooms/:id/live', getLiveRoomStats);
router.get('/withdrawals', getWithdrawalRequests);
router.post('/withdrawals/:id/approve', approveWithdrawal);

module.exports = router;
