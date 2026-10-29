/**
 * User Routes
 * Provides demo user profiles and role identification
 */
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Login endpoint
// POST /api/users/login -> { email, password }
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const userProfile = authService.login(email, password);
    res.json({
      success: true,
      data: userProfile,
      message: `Welcome back, ${userProfile.name}!`
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message
    });
  }
});

// Get all demo users (sanitized)
router.get('/', (req, res) => {
  try {
    const users = userRepository.findAll().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      hotelId: u.hotelId || null
    }));
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user by ID
router.get('/:id', (req, res) => {
  try {
    const user = authService.getUserProfile(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
