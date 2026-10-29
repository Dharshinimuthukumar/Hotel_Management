/**
 * Booking Repository (In-Memory)
 */
const Booking = require('../models/Booking');

class BookingRepository {
  constructor() {
    this.bookings = [];
    this.seedBookings();
  }

  seedBookings() {
    // 1. A completed booking (Checked Out) that already has a review
    const b1 = new Booking({
      id: 'bk_seed_checked_out',
      bookingCode: 'BK-1001',
      guestId: 'user_guest_1',
      guestDetails: {
        name: 'Priya Sharma',
        phone: '9876543210',
        email: 'priya@example.com',
        idProofType: 'Aadhaar',
        idProofNumber: '1234-5678-9012'
      },
      hotelId: 'hotel_1',
      roomIds: ['room_101'],
      checkInDate: '2026-10-10',
      checkOutDate: '2026-10-12',
      totalNights: 2,
      numGuests: 1,
      priceBreakdown: {
        baseSubtotal: 5600,
        weekendSurchargeTotal: 560,
        gstTotal: 739,
        grandTotal: 6899,
        roomBreakdowns: []
      },
      totalAmount: 6899,
      status: 'Checked Out'
    });
    b1.checkedInAt = '2026-10-10T14:15:00.000Z';
    b1.checkedOutAt = '2026-10-12T10:30:00.000Z';
    b1.paymentId = 'pay_demo_1';

    // 2. A completed booking (Checked Out) eligible for a NEW review
    const b2 = new Booking({
      id: 'bk_seed_checked_out_unreviewed',
      bookingCode: 'BK-1002',
      guestId: 'user_guest_2',
      guestDetails: {
        name: 'Rohan Verma',
        phone: '9811122233',
        email: 'rohan@example.com',
        idProofType: 'Passport',
        idProofNumber: 'Z1234567'
      },
      hotelId: 'hotel_2',
      roomIds: ['room_202_1'],
      checkInDate: '2026-10-18',
      checkOutDate: '2026-10-20',
      totalNights: 2,
      numGuests: 2,
      priceBreakdown: {
        baseSubtotal: 10400,
        weekendSurchargeTotal: 1040,
        gstTotal: 1373,
        grandTotal: 12813,
        roomBreakdowns: []
      },
      totalAmount: 12813,
      status: 'Checked Out'
    });
    b2.checkedInAt = '2026-10-18T14:05:00.000Z';
    b2.checkedOutAt = '2026-10-20T10:45:00.000Z';

    // 3. A Confirmed upcoming booking > 48h away (can test date change or full cancellation)
    const b3 = new Booking({
      id: 'bk_seed_confirmed_1',
      bookingCode: 'BK-1003',
      guestId: 'user_guest_1',
      guestDetails: {
        name: 'Priya Sharma',
        phone: '9876543210',
        email: 'priya@example.com',
        idProofType: 'Aadhaar',
        idProofNumber: '1234-5678-9012'
      },
      hotelId: 'hotel_1',
      roomIds: ['room_201'],
      checkInDate: '2026-11-05',
      checkOutDate: '2026-11-07',
      totalNights: 2,
      numGuests: 2,
      priceBreakdown: {
        baseSubtotal: 14400,
        weekendSurchargeTotal: 1440,
        gstTotal: 1901,
        grandTotal: 17741,
        roomBreakdowns: []
      },
      totalAmount: 17741,
      status: 'Confirmed'
    });
    b3.paymentId = 'pay_demo_2';

    // 4. A Confirmed booking for check-in TODAY (2026-10-25) to test check-in action
    const b4 = new Booking({
      id: 'bk_seed_checkin_today',
      bookingCode: 'BK-1004',
      guestId: 'user_guest_2',
      guestDetails: {
        name: 'Rohan Verma',
        phone: '9811122233',
        email: 'rohan@example.com',
        idProofType: 'Passport',
        idProofNumber: 'Z1234567'
      },
      hotelId: 'hotel_3',
      roomIds: ['room_301_2'],
      checkInDate: '2026-10-25',
      checkOutDate: '2026-10-27',
      totalNights: 2,
      numGuests: 2,
      priceBreakdown: {
        baseSubtotal: 11000,
        weekendSurchargeTotal: 1100,
        gstTotal: 1452,
        grandTotal: 13552,
        roomBreakdowns: []
      },
      totalAmount: 13552,
      status: 'Confirmed'
    });

    this.bookings = [b1, b2, b3, b4];
  }

  findAll() {
    return this.bookings;
  }

  findById(id) {
    return this.bookings.find((b) => b.id === id) || null;
  }

  findByGuestId(guestId) {
    return this.bookings.filter((b) => b.guestId === guestId);
  }

  findByHotelId(hotelId) {
    return this.bookings.filter((b) => b.hotelId === hotelId);
  }

  /**
   * Find bookings that overlap with a given room and date range [startDate, endDate)
   * Only active bookings (Pending Payment or Confirmed or Checked In) count as conflicts.
   * A room can be booked on the same day another guest checks out.
   */
  findOverlappingBookingsForRoom(roomId, startDate, endDate, excludeBookingId = null) {
    const activeStatuses = ['Pending Payment', 'Confirmed', 'Checked In'];
    return this.bookings.filter((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (!activeStatuses.includes(b.status)) return false;
      if (!b.roomIds.includes(roomId)) return false;

      // Date interval overlap: start1 < end2 && end1 > start2
      return b.checkInDate < endDate && b.checkOutDate > startDate;
    });
  }

  hasUpcomingBookingsForHotel(hotelId, todayStr) {
    const activeStatuses = ['Pending Payment', 'Confirmed', 'Checked In'];
    return this.bookings.some(
      (b) =>
        b.hotelId === hotelId &&
        activeStatuses.includes(b.status) &&
        b.checkOutDate >= todayStr
    );
  }

  create(booking) {
    this.bookings.push(booking);
    return booking;
  }

  update(id, updates) {
    const booking = this.findById(id);
    if (!booking) return null;
    Object.assign(booking, updates);
    return booking;
  }
}

// Export singleton instance
module.exports = new BookingRepository();
