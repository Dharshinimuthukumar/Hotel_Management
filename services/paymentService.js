/**
 * Payment Service
 * Implements payment execution using polymorphic payment methods: UPI, Card, Pay at Hotel
 */
const {
  Payment,
  UPIPaymentMethod,
  CardPaymentMethod,
  PayAtHotelPaymentMethod
} = require('../models/Payment');
const paymentRepository = require('../repositories/paymentRepository');
const bookingRepository = require('../repositories/bookingRepository');
const bookingService = require('./bookingService');

class PaymentService {
  constructor() {
    // Registry of available payment method strategies (Polymorphism)
    this.strategies = {
      UPI: new UPIPaymentMethod(),
      Card: new CardPaymentMethod(),
      'Pay at Hotel': new PayAtHotelPaymentMethod()
    };
  }

  /**
   * Process payment for a booking
   * @param {string} bookingId
   * @param {string} method - 'UPI' | 'Card' | 'Pay at Hotel'
   * @param {Object} paymentDetails - e.g. { upiId, cardNumber, cvv, simulateFailure }
   */
  processPayment(bookingId, method, paymentDetails = {}) {
    bookingService.processExpiredHoldsAndNoShows();

    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    if (booking.status !== 'Pending Payment') {
      throw new Error(`Payment can only be processed for 'Pending Payment' bookings. Current status is '${booking.status}'.`);
    }

    const strategy = this.strategies[method];
    if (!strategy) {
      throw new Error(`Unsupported payment method: ${method}. Supported methods: UPI, Card, Pay at Hotel.`);
    }

    // Execute polymorphic payment
    const result = strategy.process(booking.totalAmount, paymentDetails, booking);

    PaymentService.counter = (PaymentService.counter || 100) + 1;
    const paymentId = 'pay_' + Date.now() + '_' + PaymentService.counter;
    const paymentRecord = new Payment(
      paymentId,
      booking.id,
      booking.totalAmount,
      method,
      result.status,
      result.transactionId || `TXN-FAILED-${Date.now().toString().slice(-4)}`,
      paymentDetails
    );

    paymentRepository.create(paymentRecord);
    booking.paymentId = paymentId;

    if (result.success) {
      // Payment succeeded! Confirm the booking
      booking.status = 'Confirmed';
      return {
        success: true,
        booking,
        payment: paymentRecord,
        message: result.message
      };
    } else {
      // Payment failed! Release pending hold immediately
      booking.status = 'Cancelled';
      booking.cancellationDetails = {
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'SYSTEM',
        refundAmount: 0,
        refundPercentage: 0,
        reason: `Payment failure (${method}): ${result.message}`
      };

      return {
        success: false,
        booking,
        payment: paymentRecord,
        error: result.message
      };
    }
  }

  getPaymentByBookingId(bookingId) {
    return paymentRepository.findByBookingId(bookingId);
  }

  getAllPayments() {
    return paymentRepository.findAll();
  }
}

// Export singleton instance
module.exports = new PaymentService();
