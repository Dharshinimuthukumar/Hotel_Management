/**
 * User Models
 * Demonstrates: Encapsulation and Inheritance
 */

class User {
  /**
   * @param {string} id - Unique identifier
   * @param {string} name - Full name
   * @param {string} email - Email address
   * @param {string} phone - Contact phone number
   * @param {string} role - 'GUEST' | 'ADMIN' | 'HOTEL_MANAGER'
   */
  constructor(id, name, email, phone, role, password = 'password123') {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.role = role;
    this.password = password;
    this.createdAt = new Date().toISOString();
  }

  validatePassword(candidatePassword) {
    if (!candidatePassword) return false;
    return this.password === candidatePassword;
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  isHotelManager() {
    return this.role === 'HOTEL_MANAGER';
  }

  isGuest() {
    return this.role === 'GUEST';
  }
}

class Guest extends User {
  constructor(id, name, email, phone, idProofType, idProofNumber, address = '', password = 'guest123') {
    super(id, name, email, phone, 'GUEST', password);
    this.idProofType = idProofType; // e.g., Aadhaar, Passport, Driving License
    this.idProofNumber = idProofNumber;
    this.address = address;
  }
}

class Admin extends User {
  constructor(id, name, email, phone, password = 'admin123') {
    super(id, name, email, phone, 'ADMIN', password);
  }
}

class HotelManager extends User {
  constructor(id, name, email, phone, hotelId = null, password = 'manager123') {
    super(id, name, email, phone, 'HOTEL_MANAGER', password);
    this.hotelId = hotelId; // ID of hotel managed by this manager
  }
}

module.exports = {
  User,
  Guest,
  Admin,
  HotelManager
};
