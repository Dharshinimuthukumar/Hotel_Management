/**
 * Payment and Polymorphic PaymentMethod Models
 * Demonstrates: Abstraction, Polymorphism, and Strategy-like Pattern
 */

class Payment {
  /**
   * @param {string} id
   * @param {string} bookingId
   * @param {number} amount
   * @param {string} method - 'UPI' | 'Card' | 'Pay at Hotel'
   * @param {string} status - 'Paid' | 'Failed' | 'Refunded' | 'Pending'
   * @param {string} transactionId
   * @param {Object} [metadata={}]
   */
  constructor(id, bookingId, amount, method, status, transactionId, metadata = {}) {
    this.id = id;
    this.bookingId = bookingId;
    this.amount = Number(amount);
    this.method = method;
    this.status = status;
    this.transactionId = transactionId;
    this.metadata = metadata;
    this.paymentDate = new Date().toISOString();
    this.refundDetails = null;
  }

  markRefunded(refundAmount, reason) {
    this.status = 'Refunded';
    this.refundDetails = {
      refundAmount,
      reason,
      refundedAt: new Date().toISOString()
    };
  }
}

/**
 * Base Abstraction for Payment Methods
 */
class PaymentMethod {
  constructor(name) {
    if (new.target === PaymentMethod) {
      throw new Error('PaymentMethod is an abstract class and cannot be instantiated directly.');
    }
    this.name = name;
  }

  /**
   * Polymorphic payment processing interface
   * @param {number} amount
   * @param {Object} details
   * @param {Object} booking
   * @returns {{ success: boolean, status: string, transactionId: string, message: string }}
   */
  process(amount, details, booking) {
    throw new Error('process() must be implemented by subclass.');
  }
}

/**
 * UPI Payment implementation
 */
class UPIPaymentMethod extends PaymentMethod {
  constructor() {
    super('UPI');
  }

  process(amount, details = {}, booking) {
    const upiId = (details.upiId || '').trim();
    if (!upiId || !upiId.includes('@')) {
      return {
        success: false,
        status: 'Failed',
        transactionId: null,
        message: 'Invalid UPI ID. Format should be username@bank (e.g. guest@upi).'
      };
    }

    // Allow user to test simulation failure
    if (details.simulateFailure === true || upiId.toLowerCase().includes('fail')) {
      return {
        success: false,
        status: 'Failed',
        transactionId: `TXN-FAIL-${Date.now()}`,
        message: 'Simulated UPI bank server timeout / insufficient funds.'
      };
    }

    return {
      success: true,
      status: 'Paid',
      transactionId: `UPI-TXN-${Date.now().toString().slice(-6)}`,
      message: `UPI payment of Rs. ${amount.toLocaleString('en-IN')} successful for ${upiId}.`
    };
  }
}

/**
 * Credit/Debit Card Payment implementation
 */
class CardPaymentMethod extends PaymentMethod {
  constructor() {
    super('Card');
  }

  process(amount, details = {}, booking) {
    const cardNumber = (details.cardNumber || '').replace(/\s+/g, '');
    const cvv = (details.cvv || '').trim();

    if (!/^\d{16}$/.test(cardNumber)) {
      return {
        success: false,
        status: 'Failed',
        transactionId: null,
        message: 'Invalid Card Number. Must be 16 digits.'
      };
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return {
        success: false,
        status: 'Failed',
        transactionId: null,
        message: 'Invalid CVV. Must be 3 or 4 digits.'
      };
    }

    if (details.simulateFailure === true || cardNumber.endsWith('0000')) {
      return {
        success: false,
        status: 'Failed',
        transactionId: `TXN-FAIL-${Date.now()}`,
        message: 'Simulated Card declined by issuing bank.'
      };
    }

    return {
      success: true,
      status: 'Paid',
      transactionId: `CARD-TXN-${Date.now().toString().slice(-6)}`,
      message: `Card payment of Rs. ${amount.toLocaleString('en-IN')} successful.`
    };
  }
}

/**
 * Pay at Hotel implementation
 * Constraint: Allowed only for stays of up to 2 nights
 */
class PayAtHotelPaymentMethod extends PaymentMethod {
  constructor() {
    super('Pay at Hotel');
  }

  process(amount, details = {}, booking) {
    if (!booking) {
      return {
        success: false,
        status: 'Failed',
        transactionId: null,
        message: 'Booking details required to validate Pay at Hotel.'
      };
    }

    if (booking.totalNights > 2) {
      return {
        success: false,
        status: 'Failed',
        transactionId: null,
        message: `Pay at Hotel is only permitted for stays up to 2 nights. Your stay is ${booking.totalNights} nights.`
      };
    }

    return {
      success: true,
      status: 'Pending',
      transactionId: `PAH-VOUCHER-${Date.now().toString().slice(-6)}`,
      message: `Pay at Hotel confirmed. Rs. ${amount.toLocaleString('en-IN')} to be collected during check-in.`
    };
  }
}

module.exports = {
  Payment,
  PaymentMethod,
  UPIPaymentMethod,
  CardPaymentMethod,
  PayAtHotelPaymentMethod
};
