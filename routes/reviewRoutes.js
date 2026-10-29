/**
 * Review Routes
 */
const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');

// Create a review
router.post('/', (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'bookingId and rating (1-5) are required.'
      });
    }

    const result = reviewService.createReview({ bookingId, rating, comment });
    res.status(201).json({
      success: true,
      data: result.review,
      hotelUpdated: result.hotelUpdated,
      message: 'Review recorded and hotel average rating updated successfully.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List reviews (all or by hotelId)
router.get('/', (req, res) => {
  try {
    const { hotelId } = req.query;
    const reviews = hotelId
      ? reviewService.getReviewsByHotel(hotelId)
      : reviewService.getAllReviews();
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
