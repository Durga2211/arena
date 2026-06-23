const express = require('express');
const router = express.Router();
const {
  getBalance,
  addMoney,
  verifyPayment,
  withdraw,
  getTransactions,
} = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/balance', getBalance);
router.post('/add-money', addMoney);
router.post('/verify-payment', verifyPayment);
router.post('/withdraw', withdraw);
router.get('/transactions', getTransactions);

module.exports = router;
