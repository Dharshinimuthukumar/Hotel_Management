/**
 * Booking Model
 * Encapsulates booking lifecycle, statuses, expiration, and refund calculation
 */

class Booking {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.bookingCode - Human readable booking ref (e.g., BK-1001)
   * @param {string} params.guestId
   * @param {Object} params.guestDetails - { name, phone, email, idProofType, idProofNumber }
   * @param {string} params.hotelId
   * @param {string[]} params.roomIds - Array of 1 to 3 room IDs
   * @param {string} params.checkInDate - YYYY-MM-DD
   * @param {string} params.checkOutDate - YYYY-MM-DD
   * @param {number} params.totalNights
   * @param {number} params.numGuests
   * @param {Object} params.priceBreakdown - { baseSubtotal, weekendSurchargeTotal, gstTotal, grandTotal, roomBreakdowns }
   * @param {number} params.totalAmount
   * @param {string} [params.status='Pending Payment']
   */
  constructor({
    id,
    bookingCode,
    guestId,
    guestDetails,
    hotelId,
    roomIds,
    checkInDate,
    checkOutDate,
    totalNights,
    numGuests,
    priceBreakdown,
    totalAmount,
    status = 'Pending Payment'
  }) {
    this.id = id;
    this.bookingCode = bookingCode;
    this.guestId = guestId;
    this.guestDetails = guestDetails;
    this.hotelId = hotelId;
    this.roomIds = roomIds;
    this.checkInDate = checkInDate;
    this.checkOutDate = checkOutDate;
    this.totalNights = totalNights;
    this.numGuests = numGuests;
    this.priceBreakdown = priceBreakdown;
    this.totalAmount = totalAmount;
    this.status = status; // 'Pending Payment' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled' | 'No Show'
    
    this.createdAt = new Date().toISOString();
    // 15-minute hold for Pending Payment bookings
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    this.checkedInAt = null;
    this.checkedOutAt = null;
    this.cancellationDetails = null;
    this.paymentId = null;
  }

  /**
   * Check if a pending payment booking has expired
   * @param {number} [currentTime=Date.now()]
   * @returns {boolean}
   */
  isExpired(currentTime = Date.now()) {
    if (this.status !== 'Pending Payment') return false;
    return new Date(this.expiresAt).getTime() <= currentTime;
  }

  /**
   * Check-in time is 2:00 PM (14:00) on the check-in date
   * @returns {Date}
   */
  getCheckInDateTime() {
    const [y, m, d] = this.checkInDate.split('-').map(Number);
    // 14:00 (2 PM) local time
    return new Date(y, m - 1, d, 14, 0, 0);
  }

  /**
   * Noon (12:00 PM) on the day after check-in date for No Show detection
   * @returns {Date}
   */
  getNoShowCutoffDateTime() {
    const [y, m, d] = this.checkInDate.split('-').map(Number);
    // Day after check-in at 12:00 PM (noon)
    return new Date(y, m - 1, d + 1, 12, 0, 0);
  }

  /**
   * Date changes allowed for Confirmed bookings only when requested > 48h before check-in
   * @param {number} [currentTime=Date.now()]
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canChangeDates(currentTime = Date.now()) {
    if (this.status !== 'Confirmed') {
      return { allowed: false, reason: `Date change only permitted for Confirmed bookings. Current status is ${this.status}.` };
    }
    const checkInTime = this.getCheckInDateTime().getTime();
    const hoursRemaining = (checkInTime - currentTime) / (1000 * 60 * 60);

    if (hoursRemaining <= 48) {
      return {
        allowed: false,
        reason: `Date change must be requested more than 48 hours before check-in (2:00 PM on ${this.checkInDate}). Hours remaining: ${hoursRemaining.toFixed(1)}h.`
      };
    }
    return { allowed: true };
  }

  /**
   * Calculate cancellation refund based on time remaining before check-in (2 PM on check-in date)
   * - Hotel cancellation: 100% refund
   * - Guest cancellation > 48h before check-in: 100% refund
   * - Guest cancellation 24h to 48h before check-in: 50% refund
   * - Guest cancellation < 24h before check-in: 0% refund
   * @param {'GUEST' | 'HOTEL'} cancelledBy
   * @param {number} [currentTime=Date.now()]
   * @returns {{ refundPercentage: number, refundAmount: number, message: string }}
   */
  calculateRefund(cancelledBy, currentTime = Date.now()) {
    if (cancelledBy === 'HOTEL') {
      return {
        refundPercentage: 100,
        refundAmount: this.totalAmount,
        message: 'Hotel cancelled the booking. 100% full refund issued.'
      };
    }

    const checkInTime = this.getCheckInDateTime().getTime();
    const hoursRemaining = (checkInTime - currentTime) / (1000 * 60 * 60);

    if (hoursRemaining > 48) {
      return {
        refundPercentage: 100,
        refundAmount: this.totalAmount,
        message: `Cancelled > 48 hours before check-in (${hoursRemaining.toFixed(1)}h remaining). 100% refund issued.`
      };
    } else if (hoursRemaining >= 24) {
      const refund = Math.round(this.totalAmount * 0.50);
      return {
        refundPercentage: 50,
        refundAmount: refund,
        message: `Cancelled between 24 and 48 hours before check-in (${hoursRemaining.toFixed(1)}h remaining). 50% refund issued.`
      };
    } else {
      return {
        refundPercentage: 0,
        refundAmount: 0,
        message: `Cancelled less than 24 hours before check-in (${hoursRemaining.toFixed(1)}h remaining). No refund applicable.`
      };
    }
  }
}

module.exports = Booking;
