/**
 * User Repository (In-Memory)
 */
const { Guest, Admin, HotelManager } = require('../models/User');

class UserRepository {
  constructor() {
    this.users = [];
    this.seedUsers();
  }

  seedUsers() {
    this.users = [
      new Guest(
        'user_guest_1',
        'Priya Sharma',
        'priya@example.com',
        '9876543210',
        'Aadhaar',
        '1234-5678-9012',
        'Indiranagar, Bengaluru',
        'guest123'
      ),
      new Guest(
        'user_guest_2',
        'Rohan Verma',
        'rohan@example.com',
        '9811122233',
        'Passport',
        'Z1234567',
        'Bandra West, Mumbai',
        'guest123'
      ),
      new HotelManager(
        'user_mgr_1',
        'Rajesh Nair (Manager)',
        'rajesh@grandpalace.com',
        '9822233344',
        'hotel_1',
        'manager123'
      ),
      new HotelManager(
        'user_mgr_2',
        'Vikram Malhotra (Manager)',
        'vikram@azure.com',
        '9833344455',
        'hotel_2',
        'manager123'
      ),
      new Admin(
        'user_admin_1',
        'Ananya Iyer (Admin)',
        'admin@hotelbooking.com',
        '9900011122',
        'admin123'
      )
    ];
  }

  findAll() {
    return this.users;
  }

  findById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  findByEmail(email) {
    if (!email) return null;
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  authenticate(email, password) {
    if (!email || !password) return null;
    const user = this.findByEmail(email);
    if (!user) return null;
    if (user.validatePassword(password)) {
      return user;
    }
    return null;
  }

  create(user) {
    this.users.push(user);
    return user;
  }
}

// Export singleton instance
module.exports = new UserRepository();
