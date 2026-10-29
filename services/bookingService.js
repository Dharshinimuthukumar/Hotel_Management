/**
 * Booking Service
 * Implements room search, hold expiration, booking lifecycle, date changes, check-in/out, and refunds
 */
const Booking = require('../models/Booking');
const bookingRepository = require('../repositories/bookingRepository');
const roomRepository = require('../repositories/roomRepository');
const hotelRepository = require('../repositories/hotelRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');
const paymentRepository = require('../repositories/paymentRepository');
const pricingService = require('./pricingService');

class BookingService {
  /**
   * Helper to format current date as YYYY-MM-DD
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Process expired holds and no-shows lazily when requests arrive.
   * - Pending Payment bookings expire after 15 minutes.
   * - Confirmed bookings become 'No Show' if guest hasn't checked in by 12:00 PM (noon) on day after check-in.
   */
  processExpiredHoldsAndNoShows(currentTime = Date.now()) {
    const allBookings = bookingRepository.findAll();
    for (const booking of allBookings) {
      // 1. Release expired 15-minute pending payment holds
      if (booking.status === 'Pending Payment' && booking.isExpired(currentTime)) {
        booking.status = 'Cancelled';
        booking.cancellationDetails = {
          cancelledAt: new Date(currentTime).toISOString(),
          cancelledBy: 'SYSTEM',
          refundAmount: 0,
          refundPercentage: 0,
          reason: 'Expired: 15-minute payment hold window elapsed without payment completion.'
        };
      }

      // 2. Process No Shows: If Confirmed and current time > noon on day after check-in
      if (booking.status === 'Confirmed') {
        const noShowCutoff = booking.getNoShowCutoffDateTime().getTime();
        if (currentTime > noShowCutoff) {
          booking.status = 'No Show';
          booking.cancellationDetails = {
            cancelledAt: new Date(currentTime).toISOString(),
            cancelledBy: 'SYSTEM',
            refundAmount: 0,
            refundPercentage: 0,
            reason: 'Marked No Show: Guest did not check in by 12:00 PM on the day after check-in.'
          };
        }
      }
    }
  }

  /**
   * Search available rooms
   * Constraints:
   * - City, check-in, check-out, number of guests.
   * - Check-out must be after check-in.
   * - Check-in cannot be in the past.
   * - Maximum stay is 15 nights.
   * - Check-in on checkout date of previous booking is permitted.
   * - Sort available rooms by price ascending.
   */
  searchAvailableRooms({ city, checkInDate, checkOutDate, numGuests = 1 }) {
    this.processExpiredHoldsAndNoShows();

    if (!city || !checkInDate || !checkOutDate) {
      throw new Error('City, check-in date, and check-out date are required.');
    }

    const todayStr = this.getTodayString();
    if (checkInDate < todayStr) {
      throw new Error(`Check-in date (${checkInDate}) cannot be in the past. Today is ${todayStr}.`);
    }

    if (checkOutDate <= checkInDate) {
      throw new Error('Check-out date must be strictly after check-in date.');
    }

    const nights = pricingService.calculateNights(checkInDate, checkOutDate);
    if (nights > 15) {
      throw new Error('Maximum stay is 15 nights.');
    }

    const guests = Number(numGuests) || 1;

    // Get hotels in the city
    const matchingHotels = hotelRepository.findByCity(city);
    const hotelMap = new Map(matchingHotels.map((h) => [h.id, h]));

    // Check all active rooms in these hotels
    const availableRooms = [];

    for (const hotel of matchingHotels) {
      const hotelRooms = roomRepository.findByHotelId(hotel.id);

      for (const room of hotelRooms) {
        // Room capacity check: room can accommodate the guests (or individual room capacity)
        if (room.capacity < guests && guests <= 4) {
          // If searching for up to 4 guests, check if single room fits
          // Still show rooms that can accommodate, or rooms where room.capacity >= guests
          continue;
        }

        // Check for conflicting active bookings (intervals [start, end) do not overlap if start2 >= end1)
        const overlappingBookings = bookingRepository.findOverlappingBookingsForRoom(
          room.id,
          checkInDate,
          checkOutDate
        );
        if (overlappingBookings.length > 0) {
          continue;
        }

        // Check for conflicting maintenance
        const overlappingMaint = maintenanceRepository.findOverlappingMaintenance(
          room.id,
          checkInDate,
          checkOutDate
        );
        if (overlappingMaint.length > 0) {
          continue;
        }

        // Room is available! Calculate pricing estimate for this stay
        const pricing = pricingService.calculateBookingPrice([room], checkInDate, checkOutDate);

        availableRooms.push({
          roomId: room.id,
          roomNumber: room.roomNumber,
          type: room.type,
          capacity: room.capacity,
          basePricePerNight: room.basePricePerNight,
          hotelId: hotel.id,
          hotelName: hotel.name,
          city: hotel.city,
          address: hotel.address,
          starRating: hotel.starRating,
          averageRating: hotel.averageRating,
          totalPriceForStay: pricing.grandTotal,
          pricingBreakdown: pricing
        });
      }
    }

    // Sort available rooms by price ascending
    availableRooms.sort((a, b) => a.totalPriceForStay - b.totalPriceForStay);

    return availableRooms;
  }

  /**
   * Create a new booking
   * Constraints:
   * - Requires guest name, phone, email, ID proof type, ID proof number.
   * - 1 to 3 rooms at the same hotel.
   * - Never allow overlapping bookings for the same room.
   * - Pending Payment status with 15-minute hold.
   */
  createBooking({ guestDetails, hotelId, roomIds, checkInDate, checkOutDate, numGuests = 1 }) {
    this.processExpiredHoldsAndNoShows();

    // Validate guest details
    if (!guestDetails || !guestDetails.name || !guestDetails.phone || !guestDetails.email || !guestDetails.idProofType || !guestDetails.idProofNumber) {
      throw new Error('Guest name, phone, email, ID proof type, and ID proof number are all required.');
    }

    // Validate room count
    if (!Array.isArray(roomIds) || roomIds.length < 1 || roomIds.length > 3) {
      throw new Error('A booking must contain between 1 and 3 rooms at the same hotel.');
    }

    // Validate hotel existence
    const hotel = hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new Error(`Hotel ${hotelId} does not exist.`);
    }

    // Validate dates
    const todayStr = this.getTodayString();
    if (checkInDate < todayStr) {
      throw new Error(`Check-in date cannot be in the past. Today is ${todayStr}.`);
    }
    if (checkOutDate <= checkInDate) {
      throw new Error('Check-out date must be after check-in date.');
    }
    const nights = pricingService.calculateNights(checkInDate, checkOutDate);
    if (nights > 15) {
      throw new Error('Maximum stay duration is 15 nights.');
    }

    // Validate rooms belong to this hotel and have no conflicts
    const selectedRooms = [];
    for (const roomId of roomIds) {
      const room = roomRepository.findById(roomId);
      if (!room || room.hotelId !== hotelId) {
        throw new Error(`Room ${roomId} does not belong to hotel ${hotel.name}.`);
      }

      // Check overlapping bookings
      const overlaps = bookingRepository.findOverlappingBookingsForRoom(roomId, checkInDate, checkOutDate);
      if (overlaps.length > 0) {
        throw new Error(`Room ${room.roomNumber} is unavailable for selected dates (conflicts with booking ${overlaps[0].bookingCode}).`);
      }

      // Check maintenance
      const maint = maintenanceRepository.findOverlappingMaintenance(roomId, checkInDate, checkOutDate);
      if (maint.length > 0) {
        throw new Error(`Room ${room.roomNumber} is under maintenance from ${maint[0].startDate} to ${maint[0].endDate}.`);
      }

      selectedRooms.push(room);
    }

    // Calculate pricing with weekend surcharge and tiered GST
    const priceBreakdown = pricingService.calculateBookingPrice(selectedRooms, checkInDate, checkOutDate);

    // Monotonic counter to guarantee uniqueness
    BookingService.bookingCounter = (BookingService.bookingCounter || 1000) + 1;
    const bookingId = 'bk_' + Date.now() + '_' + BookingService.bookingCounter;
    const bookingCode = 'BK-' + BookingService.bookingCounter;

    const booking = new Booking({
      id: bookingId,
      bookingCode,
      guestId: guestDetails.guestId || 'guest_' + Date.now().toString().slice(-4),
      guestDetails: {
        name: guestDetails.name.trim(),
        phone: guestDetails.phone.trim(),
        email: guestDetails.email.trim(),
        idProofType: guestDetails.idProofType.trim(),
        idProofNumber: guestDetails.idProofNumber.trim()
      },
      hotelId,
      roomIds,
      checkInDate,
      checkOutDate,
      totalNights: nights,
      numGuests: Number(numGuests) || 1,
      priceBreakdown,
      totalAmount: priceBreakdown.grandTotal,
      status: 'Pending Payment'
    });

    bookingRepository.create(booking);
    return booking;
  }

  /**
   * Cancel booking
   * Rules:
   * - Hotel cancellation: 100% refund
   * - Guest cancellation > 48h before check-in: 100% refund
   * - Guest cancellation 24-48h before check-in: 50% refund
   * - Guest cancellation < 24h before check-in: 0% refund
   */
  cancelBooking(bookingId, cancelledBy = 'GUEST', reason = 'Customer requested cancellation') {
    this.processExpiredHoldsAndNoShows();

    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    if (booking.status === 'Cancelled' || booking.status === 'Checked Out' || booking.status === 'No Show') {
      throw new Error(`Cannot cancel booking with current status: ${booking.status}.`);
    }

    // If booking was still Pending Payment, cancel immediately with 0 refund
    if (booking.status === 'Pending Payment') {
      booking.status = 'Cancelled';
      booking.cancellationDetails = {
        cancelledAt: new Date().toISOString(),
        cancelledBy,
        refundAmount: 0,
        refundPercentage: 0,
        reason: reason || 'Pending booking cancelled before payment.'
      };
      return {
        booking,
        refund: { refundPercentage: 0, refundAmount: 0, message: 'Pending booking cancelled. No payment had been made.' }
      };
    }

    // For Confirmed or Checked In bookings, calculate refund
    const refundInfo = booking.calculateRefund(cancelledBy);
    booking.status = 'Cancelled';
    booking.cancellationDetails = {
      cancelledAt: new Date().toISOString(),
      cancelledBy,
      refundAmount: refundInfo.refundAmount,
      refundPercentage: refundInfo.refundPercentage,
      reason
    };

    // Update payment record if a payment exists
    if (booking.paymentId) {
      const payment = paymentRepository.findById(booking.paymentId);
      if (payment) {
        payment.markRefunded(refundInfo.refundAmount, refundInfo.message);
      }
    }

    return {
      booking,
      refund: refundInfo
    };
  }

  /**
   * Change booking dates
   * Constraint: "Allow date changes for Confirmed bookings only when requested more than 48 hours before check-in and the new dates are available."
   */
  changeBookingDates(bookingId, newCheckIn, newCheckOut) {
    this.processExpiredHoldsAndNoShows();

    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    // Validate 48 hours rule
    const eligibility = booking.canChangeDates();
    if (!eligibility.allowed) {
      throw new Error(eligibility.reason);
    }

    // Validate new dates
    const todayStr = this.getTodayString();
    if (newCheckIn < todayStr) {
      throw new Error(`New check-in date cannot be in the past. Today is ${todayStr}.`);
    }
    if (newCheckOut <= newCheckIn) {
      throw new Error('New check-out date must be after new check-in date.');
    }
    const nights = pricingService.calculateNights(newCheckIn, newCheckOut);
    if (nights > 15) {
      throw new Error('Maximum stay duration is 15 nights.');
    }

    // Check availability of the existing rooms for the new dates
    const selectedRooms = [];
    for (const roomId of booking.roomIds) {
      const room = roomRepository.findById(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found.`);
      }

      // Check overlapping bookings excluding this current booking
      const overlaps = bookingRepository.findOverlappingBookingsForRoom(
        roomId,
        newCheckIn,
        newCheckOut,
        booking.id
      );
      if (overlaps.length > 0) {
        throw new Error(`Room ${room.roomNumber} is not available for the new dates (conflicts with booking ${overlaps[0].bookingCode}).`);
      }

      // Check maintenance
      const maint = maintenanceRepository.findOverlappingMaintenance(roomId, newCheckIn, newCheckOut);
      if (maint.length > 0) {
        throw new Error(`Room ${room.roomNumber} has scheduled maintenance on selected new dates.`);
      }

      selectedRooms.push(room);
    }

    // Recalculate price
    const newPricing = pricingService.calculateBookingPrice(selectedRooms, newCheckIn, newCheckOut);

    booking.checkInDate = newCheckIn;
    booking.checkOutDate = newCheckOut;
    booking.totalNights = nights;
    booking.priceBreakdown = newPricing;
    booking.totalAmount = newPricing.grandTotal;

    return booking;
  }

  /**
   * Check in guest
   * Constraint: "Check-in is allowed only on the check-in date after ID verification."
   */
  checkIn(bookingId, idVerified = true) {
    this.processExpiredHoldsAndNoShows();

    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    if (booking.status !== 'Confirmed') {
      throw new Error(`Check-in is only allowed for Confirmed bookings. Current status is '${booking.status}'.`);
    }

    const todayStr = this.getTodayString();
    if (booking.checkInDate !== todayStr) {
      throw new Error(`Check-in is only allowed on the check-in date (${booking.checkInDate}). Today is ${todayStr}.`);
    }

    if (!idVerified) {
      throw new Error('Guest ID proof verification must be completed before check-in.');
    }

    booking.status = 'Checked In';
    booking.checkedInAt = new Date().toISOString();
    return booking;
  }

  /**
   * Check out guest
   * Constraint: "Check-out changes the booking status and makes the room available for future non-overlapping dates."
   */
  checkOut(bookingId) {
    this.processExpiredHoldsAndNoShows();

    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    if (booking.status !== 'Checked In') {
      throw new Error(`Check-out is only allowed for 'Checked In' bookings. Current status is '${booking.status}'.`);
    }

    booking.status = 'Checked Out';
    booking.checkedOutAt = new Date().toISOString();
    return booking;
  }

  getAllBookings() {
    this.processExpiredHoldsAndNoShows();
    return bookingRepository.findAll();
  }

  getBookingById(bookingId) {
    this.processExpiredHoldsAndNoShows();
    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }
    const hotel = hotelRepository.findById(booking.hotelId);
    const rooms = booking.roomIds.map((id) => roomRepository.findById(id)).filter(Boolean);
    const payment = booking.paymentId ? paymentRepository.findById(booking.paymentId) : null;

    return {
      ...booking,
      hotel,
      rooms,
      payment
    };
  }
}

// Export singleton instance
module.exports = new BookingService();
