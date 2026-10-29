/**
 * Authentication Service
 * Business Rules:
 * 1. Validates presence and format of email & password.
 * 2. Authenticates credentials against UserRepository.
 * 3. Returns safe user profile data (excludes raw password).
 */
const userRepository = require('../repositories/userRepository');

class AuthService {
  /**
   * Authenticate user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Object} Safe user profile
   */
  login(email, password) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new Error('Email address is required.');
    }

    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Password is required.');
    }

    const user = userRepository.authenticate(cleanEmail, password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Return sanitized profile object
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hotelId: user.hotelId || null,
      idProofType: user.idProofType || null,
      idProofNumber: user.idProofNumber || null
    };
  }

  /**
   * Get user profile by ID
   * @param {string} userId
   * @returns {Object|null}
   */
  getUserProfile(userId) {
    const user = userRepository.findById(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hotelId: user.hotelId || null,
      idProofType: user.idProofType || null,
      idProofNumber: user.idProofNumber || null
    };
  }
}

// Export singleton instance
module.exports = new AuthService();
