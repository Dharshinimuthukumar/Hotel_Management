/**
 * Pricing Service
 * Business Rules:
 * 1. Nightly calculation across checkInDate to checkOutDate.
 * 2. 20% surcharge on Friday and Saturday nights.
 * 3. GST: 12% if room's base nightly rate is < Rs. 7,500; 18% if >= Rs. 7,500.
 * 4. GST rule consistency: GST is calculated on the room subtotal including the weekend surcharge.
 */

class PricingService {
  /**
   * Determine whether a date falls on a weekend night (Friday or Saturday)
   * In hotel billing, Friday night = checking in Friday, staying through Saturday morning.
   * Saturday night = checking in Saturday, staying through Sunday morning.
   * @param {Date} dateObj
   * @returns {boolean}
   */
  isWeekendNight(dateObj) {
    const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    return day === 5 || day === 6;
  }

  /**
   * Calculate number of nights between two YYYY-MM-DD date strings
   * @param {string} checkInStr
   * @param {string} checkOutStr
   * @returns {number}
   */
  calculateNights(checkInStr, checkOutStr) {
    const checkIn = new Date(checkInStr + 'T00:00:00');
    const checkOut = new Date(checkOutStr + 'T00:00:00');
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return nights;
  }

  /**
   * Calculate detailed pricing breakdown for a selection of rooms over a stay period
   * @param {Array<Room>} rooms - Array of Room instances (Single, Double, Deluxe, Suite)
   * @param {string} checkInDate - YYYY-MM-DD
   * @param {string} checkOutDate - YYYY-MM-DD
   * @returns {Object} Pricing breakdown
   */
  calculateBookingPrice(rooms, checkInDate, checkOutDate) {
    const nights = this.calculateNights(checkInDate, checkOutDate);
    if (nights <= 0) {
      throw new Error('Check-out date must be strictly after check-in date.');
    }
    if (nights > 15) {
      throw new Error('Maximum stay duration allowed is 15 nights.');
    }

    let overallBaseSubtotal = 0;
    let overallWeekendSurcharge = 0;
    let overallGst = 0;
    const roomBreakdowns = [];

    // Iterate through each room
    for (const room of rooms) {
      let roomBaseSubtotal = 0;
      let roomWeekendSurcharge = 0;
      const nightlyDetails = [];

      const cursorDate = new Date(checkInDate + 'T00:00:00');
      for (let i = 0; i < nights; i++) {
        const isWeekend = this.isWeekendNight(cursorDate);
        const baseRate = room.basePricePerNight;
        const actualRate = room.getNightlyRate(isWeekend);
        const surcharge = actualRate - baseRate;

        roomBaseSubtotal += baseRate;
        roomWeekendSurcharge += surcharge;

        nightlyDetails.push({
          nightIndex: i + 1,
          date: cursorDate.toISOString().split('T')[0],
          isWeekend,
          baseRate,
          surcharge,
          actualRate
        });

        // Advance cursor by 1 day
        cursorDate.setDate(cursorDate.getDate() + 1);
      }

      // Room subtotal including weekend surcharge
      const roomSubtotalWithWeekend = roomBaseSubtotal + roomWeekendSurcharge;

      // GST tier based on room's base tariff (< 7500 -> 12%, >= 7500 -> 18%)
      const gstRate = room.getGSTRate();
      // Consistent rule: GST applied to room subtotal (base + weekend surcharge)
      const roomGst = Math.round(roomSubtotalWithWeekend * gstRate);
      const roomGrandTotal = roomSubtotalWithWeekend + roomGst;

      overallBaseSubtotal += roomBaseSubtotal;
      overallWeekendSurcharge += roomWeekendSurcharge;
      overallGst += roomGst;

      roomBreakdowns.push({
        roomId: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        basePricePerNight: room.basePricePerNight,
        nights,
        gstRatePercent: gstRate * 100,
        roomBaseSubtotal,
        roomWeekendSurcharge,
        roomSubtotalWithWeekend,
        roomGst,
        roomGrandTotal,
        nightlyDetails
      });
    }

    const subtotalWithWeekend = overallBaseSubtotal + overallWeekendSurcharge;
    const grandTotal = subtotalWithWeekend + overallGst;

    return {
      nights,
      overallBaseSubtotal,
      overallWeekendSurcharge,
      subtotalWithWeekend,
      overallGst,
      grandTotal,
      gstRuleExplanation: 'GST tier (12% or 18%) determined by room base price (< Rs. 7,500 = 12%, >= Rs. 7,500 = 18%), calculated on room subtotal including 20% weekend surcharges.',
      roomBreakdowns
    };
  }
}

// Export singleton instance
module.exports = new PricingService();
