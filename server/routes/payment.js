const express = require('express');
const { protect } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

// All payment routes should be protected
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;
