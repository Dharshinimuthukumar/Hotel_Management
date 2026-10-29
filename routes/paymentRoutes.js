/**
 * Payment Routes
 */
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// Process payment
router.post('/process', (req, res) => {
  try {
    const { bookingId, method, paymentDetails } = req.body;
    if (!bookingId || !method) {
      return res.status(400).json({
        success: false,
        error: 'bookingId and method (UPI, Card, Pay at Hotel) are required.'
      });
    }

    const result = paymentService.processPayment(bookingId, method, paymentDetails);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          booking: result.booking,
          payment: result.payment
        },
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        data: {
          booking: result.booking,
          payment: result.payment
        },
        error: result.error
      });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List all payments
router.get('/', (req, res) => {
  try {
    const payments = paymentService.getAllPayments();
    res.json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
