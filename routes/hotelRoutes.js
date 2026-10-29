/**
 * Hotel Routes
 */
const express = require('express');
const router = express.Router();
const hotelService = require('../services/hotelService');
const userRepository = require('../repositories/userRepository');

// Helper to extract active user from headers or body
function getCallerUser(req) {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'GUEST';

  if (userId) {
    const existing = userRepository.findById(userId);
    if (existing) return existing;
  }
  // Fallback demo user object if header role is passed
  return {
    id: userId || 'caller_temp',
    role: userRole,
    hotelId: req.headers['x-hotel-id'] || null
  };
}

// List all hotels
router.get('/', (req, res) => {
  try {
    const { city } = req.query;
    const hotels = hotelService.getAllHotels(city);
    res.json({ success: true, data: hotels });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get hotel by ID
router.get('/:id', (req, res) => {
  try {
    const hotel = hotelService.getHotelById(req.params.id);
    res.json({ success: true, data: hotel });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Add a new hotel (Admin or Hotel Manager)
router.post('/', (req, res) => {
  try {
    const user = getCallerUser(req);
    const newHotel = hotelService.createHotel(req.body, user);
    res.status(201).json({ success: true, data: newHotel, message: 'Hotel and initial rooms created successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete hotel (Constraint: No upcoming bookings)
router.delete('/:id', (req, res) => {
  try {
    const user = getCallerUser(req);
    const result = hotelService.deleteHotel(req.params.id, user);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Schedule maintenance for a room
router.post('/:id/maintenance', (req, res) => {
  try {
    const user = getCallerUser(req);
    const { roomId, startDate, endDate, reason } = req.body;
    const maintenance = hotelService.scheduleMaintenance(
      req.params.id,
      roomId,
      startDate,
      endDate,
      reason,
      user
    );
    res.status(201).json({ success: true, data: maintenance, message: 'Maintenance scheduled successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get maintenance records for a hotel
router.get('/:id/maintenance', (req, res) => {
  try {
    const records = hotelService.getMaintenanceByHotel(req.params.id);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
