/**
 * Booking Routes
 */
const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');

// Search available rooms
// Query: city, checkInDate, checkOutDate, numGuests
router.get('/search', (req, res) => {
  try {
    const { city, checkInDate, checkOutDate, numGuests } = req.query;
    const availableRooms = bookingService.searchAvailableRooms({
      city,
      checkInDate,
      checkOutDate,
      numGuests
    });
    res.json({ success: true, count: availableRooms.length, data: availableRooms });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create a new booking
router.post('/', (req, res) => {
  try {
    const { guestDetails, hotelId, roomIds, checkInDate, checkOutDate, numGuests } = req.body;
    const booking = bookingService.createBooking({
      guestDetails,
      hotelId,
      roomIds,
      checkInDate,
      checkOutDate,
      numGuests
    });
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created in Pending Payment status. Room is held for 15 minutes.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List all bookings
router.get('/', (req, res) => {
  try {
    const bookings = bookingService.getAllBookings();
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get booking by ID
router.get('/:id', (req, res) => {
  try {
    const booking = bookingService.getBookingById(req.params.id);
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Cancel booking
router.post('/:id/cancel', (req, res) => {
  try {
    const { cancelledBy = 'GUEST', reason = 'Customer cancellation' } = req.body;
    const result = bookingService.cancelBooking(req.params.id, cancelledBy, reason);
    res.json({
      success: true,
      data: result.booking,
      refund: result.refund,
      message: result.refund.message
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Change booking dates
router.put('/:id/dates', (req, res) => {
  try {
    const { newCheckIn, newCheckOut } = req.body;
    const updated = bookingService.changeBookingDates(req.params.id, newCheckIn, newCheckOut);
    res.json({
      success: true,
      data: updated,
      message: 'Booking dates and pricing updated successfully.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Guest check-in
router.post('/:id/checkin', (req, res) => {
  try {
    const { idVerified = true } = req.body;
    const updated = bookingService.checkIn(req.params.id, idVerified);
    res.json({
      success: true,
      data: updated,
      message: 'Guest successfully checked in after ID verification.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Guest check-out
router.post('/:id/checkout', (req, res) => {
  try {
    const updated = bookingService.checkOut(req.params.id);
    res.json({
      success: true,
      data: updated,
      message: 'Guest successfully checked out. Room is now available for future dates.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
