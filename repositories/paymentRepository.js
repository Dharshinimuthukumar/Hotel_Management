/**
 * Payment Repository (In-Memory)
 */
const { Payment } = require('../models/Payment');

class PaymentRepository {
  constructor() {
    this.payments = [];
    this.seedPayments();
  }

  seedPayments() {
    this.payments = [
      new Payment(
        'pay_demo_1',
        'bk_seed_checked_out',
        9856,
        'Card',
        'Paid',
        'CARD-TXN-998811',
        { last4: '4242' }
      ),
      new Payment(
        'pay_demo_2',
        'bk_seed_confirmed_1',
        16520,
        'UPI',
        'Paid',
        'UPI-TXN-774411',
        { upiId: 'priya@okaxis' }
      )
    ];
  }

  findAll() {
    return this.payments;
  }

  findById(id) {
    return this.payments.find((p) => p.id === id) || null;
  }

  findByBookingId(bookingId) {
    return this.payments.filter((p) => p.bookingId === bookingId);
  }

  create(payment) {
    this.payments.push(payment);
    return payment;
  }

  update(id, updates) {
    const payment = this.findById(id);
    if (!payment) return null;
    Object.assign(payment, updates);
    return payment;
  }
}

// Export singleton instance
module.exports = new PaymentRepository();
