/**
 * Room Routes
 */
const express = require('express');
const router = express.Router();
const hotelService = require('../services/hotelService');
const roomRepository = require('../repositories/roomRepository');
const userRepository = require('../repositories/userRepository');

function getCallerUser(req) {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'GUEST';

  if (userId) {
    const existing = userRepository.findById(userId);
    if (existing) return existing;
  }
  return {
    id: userId || 'caller_temp',
    role: userRole,
    hotelId: req.headers['x-hotel-id'] || null
  };
}

// Add a room to a hotel
router.post('/', (req, res) => {
  try {
    const user = getCallerUser(req);
    const { hotelId, roomNumber, type, basePricePerNight, capacity } = req.body;
    const newRoom = hotelService.addRoom(
      hotelId,
      { roomNumber, type, basePricePerNight, capacity },
      user
    );
    res.status(201).json({ success: true, data: newRoom, message: 'Room added successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update room
// Constraint: Do not allow a booked room's type or number to change while a booking exists for it.
router.put('/:id', (req, res) => {
  try {
    const user = getCallerUser(req);
    const updated = hotelService.updateRoom(req.params.id, req.body, user);
    res.json({ success: true, data: updated, message: 'Room updated successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get room by ID
router.get('/:id', (req, res) => {
  try {
    const room = roomRepository.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
