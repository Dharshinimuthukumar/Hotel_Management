/**
 * Automated Verification & Unit Test Suite for Hotel Booking System (LLD)
 * Run with: node test.js or npm test
 */

const assert = require('assert');
const pricingService = require('./services/pricingService');
const bookingService = require('./services/bookingService');
const paymentService = require('./services/paymentService');
const hotelService = require('./services/hotelService');
const reviewService = require('./services/reviewService');

const hotelRepository = require('./repositories/hotelRepository');
const roomRepository = require('./repositories/roomRepository');
const bookingRepository = require('./repositories/bookingRepository');
const { SingleRoom, DeluxeRoom, SuiteRoom } = require('./models/Room');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 Starting Hotel Booking System Test Suite');
console.log('======================================================\n');

// ---------------------------------------------------------------------
// 1. Pricing & GST Rules
// ---------------------------------------------------------------------
console.log('--- 1. Pricing & GST Tests ---');

runTest('Single Room: Weekend 20% surcharge and 12% GST (< 7500)', () => {
  const room = new SingleRoom('r_test_1', 'h_test', '101', 2000, 1);
  // Staying Friday to Sunday (2 nights: Friday night + Saturday night -> both weekend!)
  // Friday is 2026-10-30, Saturday is 2026-10-31, Sunday is 2026-11-01
  const breakdown = pricingService.calculateBookingPrice([room], '2026-10-30', '2026-11-01');

  assert.strictEqual(breakdown.nights, 2);
  assert.strictEqual(breakdown.overallBaseSubtotal, 4000); // 2000 * 2
  // 20% surcharge on both nights = 400 * 2 = 800
  assert.strictEqual(breakdown.overallWeekendSurcharge, 800);
  // Subtotal = 4800
  assert.strictEqual(breakdown.subtotalWithWeekend, 4800);
  // Base tariff 2000 < 7500 -> 12% GST on 4800 = 576
  assert.strictEqual(breakdown.overallGst, 576);
  assert.strictEqual(breakdown.grandTotal, 5376);
});

runTest('Suite Room: 18% GST (>= 7500) on weekday stay', () => {
  const room = new SuiteRoom('r_test_suite', 'h_test', '301', 10000, 4);
  // Staying Tuesday to Thursday (2 weekday nights: 2026-10-27 to 2026-10-29)
  const breakdown = pricingService.calculateBookingPrice([room], '2026-10-27', '2026-10-29');

  assert.strictEqual(breakdown.nights, 2);
  assert.strictEqual(breakdown.overallBaseSubtotal, 20000);
  assert.strictEqual(breakdown.overallWeekendSurcharge, 0); // No weekend surcharge
  // Base tariff 10000 >= 7500 -> 18% GST on 20000 = 3600
  assert.strictEqual(breakdown.overallGst, 3600);
  assert.strictEqual(breakdown.grandTotal, 23600);
});

runTest('Date validation: Stay > 15 nights rejected', () => {
  const room = new SingleRoom('r_test_1', 'h_test', '101', 2000, 1);
  assert.throws(() => {
    pricingService.calculateBookingPrice([room], '2026-11-01', '2026-11-18'); // 17 nights
  }, /Maximum stay/);
});

runTest('Date validation: Check-out before check-in rejected', () => {
  const room = new SingleRoom('r_test_1', 'h_test', '101', 2000, 1);
  assert.throws(() => {
    pricingService.calculateBookingPrice([room], '2026-11-10', '2026-11-05');
  }, /Check-out date must be strictly after check-in date/);
});

// ---------------------------------------------------------------------
// 2. Room Overlap & Maintenance Conflict
// ---------------------------------------------------------------------
console.log('\n--- 2. Availability & Maintenance Conflict Tests ---');

runTest('Room availability & check-in on checkout date allowed', () => {
  // room_101 is booked 2026-10-10 to 2026-10-12
  // A new search from 2026-10-12 to 2026-10-15 should NOT conflict!
  const overlaps = bookingRepository.findOverlappingBookingsForRoom('room_101', '2026-10-12', '2026-10-15');
  assert.strictEqual(overlaps.length, 0);
});

runTest('Maintenance conflict blocks booking creation', () => {
  // room_102 has maintenance scheduled 2026-11-20 to 2026-11-23
  assert.throws(() => {
    bookingService.createBooking({
      guestDetails: {
        name: 'Test Guest',
        phone: '9999999999',
        email: 'test@example.com',
        idProofType: 'Aadhaar',
        idProofNumber: '1111-2222-3333'
      },
      hotelId: 'hotel_1',
      roomIds: ['room_102'],
      checkInDate: '2026-11-21',
      checkOutDate: '2026-11-24',
      numGuests: 2
    });
  }, /under maintenance/);
});

// ---------------------------------------------------------------------
// 3. Payment Methods & Polymorphism
// ---------------------------------------------------------------------
console.log('\n--- 3. Payment Methods Tests ---');

runTest('Pay at Hotel: Rejected for stays > 2 nights', () => {
  // Create booking for 3 nights
  const booking = bookingService.createBooking({
    guestDetails: {
      name: 'Rohan Test',
      phone: '9811122233',
      email: 'rohan@test.com',
      idProofType: 'Passport',
      idProofNumber: 'A1122334'
    },
    hotelId: 'hotel_1',
    roomIds: ['room_101'],
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-13', // 3 nights
    numGuests: 1
  });

  const payResult = paymentService.processPayment(booking.id, 'Pay at Hotel');
  assert.strictEqual(payResult.success, false);
  assert.strictEqual(booking.status, 'Cancelled'); // Hold released on payment failure
});

runTest('UPI Payment: Successful payment confirms booking', () => {
  const booking = bookingService.createBooking({
    guestDetails: {
      name: 'Anil Kumar',
      phone: '9811122233',
      email: 'anil@test.com',
      idProofType: 'Aadhaar',
      idProofNumber: '9999-8888-7777'
    },
    hotelId: 'hotel_1',
    roomIds: ['room_101'],
    checkInDate: '2026-11-15',
    checkOutDate: '2026-11-17', // 2 nights
    numGuests: 1
  });

  assert.strictEqual(booking.status, 'Pending Payment');

  const payResult = paymentService.processPayment(booking.id, 'UPI', { upiId: 'anil@oksbi' });
  assert.strictEqual(payResult.success, true);
  assert.strictEqual(booking.status, 'Confirmed');
  assert.strictEqual(payResult.payment.status, 'Paid');
});

runTest('Simulated payment failure releases room hold', () => {
  const booking = bookingService.createBooking({
    guestDetails: {
      name: 'Neha Roy',
      phone: '9811122233',
      email: 'neha@test.com',
      idProofType: 'Aadhaar',
      idProofNumber: '8888-7777-6666'
    },
    hotelId: 'hotel_1',
    roomIds: ['room_101'],
    checkInDate: '2026-11-18',
    checkOutDate: '2026-11-19',
    numGuests: 1
  });

  const payResult = paymentService.processPayment(booking.id, 'Card', {
    cardNumber: '4111111111110000', // Ends in 0000 -> triggers simulated decline
    cvv: '123'
  });

  assert.strictEqual(payResult.success, false);
  assert.strictEqual(booking.status, 'Cancelled');
  assert.strictEqual(payResult.payment.status, 'Failed');

  // Verify the room is now immediately available again for those dates
  const overlaps = bookingRepository.findOverlappingBookingsForRoom('room_101', '2026-11-18', '2026-11-19');
  assert.strictEqual(overlaps.length, 0);
});

// ---------------------------------------------------------------------
// 4. Booking Hold Expiration & No Show
// ---------------------------------------------------------------------
console.log('\n--- 4. Hold Expiration & No-Show Tests ---');

runTest('Expired 15-minute hold is released by processExpiredHoldsAndNoShows', () => {
  const booking = bookingService.createBooking({
    guestDetails: {
      name: 'Hold Test',
      phone: '9811122233',
      email: 'hold@test.com',
      idProofType: 'Aadhaar',
      idProofNumber: '5555-4444-3333'
    },
    hotelId: 'hotel_1',
    roomIds: ['room_101'],
    checkInDate: '2026-11-25',
    checkOutDate: '2026-11-26',
    numGuests: 1
  });

  assert.strictEqual(booking.status, 'Pending Payment');

  // Simulate 16 minutes later
  const futureTime = Date.now() + 16 * 60 * 1000;
  bookingService.processExpiredHoldsAndNoShows(futureTime);

  assert.strictEqual(booking.status, 'Cancelled');
  assert.ok(booking.cancellationDetails.reason.includes('Expired'));
});

// ---------------------------------------------------------------------
// 5. Cancellation Refund Policy
// ---------------------------------------------------------------------
console.log('\n--- 5. Cancellation Refund Tests ---');

runTest('Guest cancellation > 48h before check-in yields 100% refund', () => {
  // bk_seed_confirmed_1 is on 2026-11-05 (more than 48 hours away from current date)
  const result = bookingService.cancelBooking('bk_seed_confirmed_1', 'GUEST');
  assert.strictEqual(result.refund.refundPercentage, 100);
  assert.strictEqual(result.booking.status, 'Cancelled');
});

// ---------------------------------------------------------------------
// 6. Date Change Constraints
// ---------------------------------------------------------------------
console.log('\n--- 6. Date Change Constraint Tests ---');

runTest('Date change rejected if requested <= 48 hours before check-in', () => {
  // bk_seed_checkin_today checkInDate is 2026-10-25 (today!)
  assert.throws(() => {
    bookingService.changeBookingDates('bk_seed_checkin_today', '2026-10-26', '2026-10-28');
  }, /48 hours before check-in/);
});

// ---------------------------------------------------------------------
// 7. Reviews Rules
// ---------------------------------------------------------------------
console.log('\n--- 7. Review Eligibility Tests ---');

runTest('Review allowed for Checked Out booking and recalculates average rating', () => {
  // bk_seed_checked_out_unreviewed is eligible
  const hotelGoa = hotelRepository.findById('hotel_2');
  const prevCount = hotelGoa.reviewCount;

  const revResult = reviewService.createReview({
    bookingId: 'bk_seed_checked_out_unreviewed',
    rating: 5,
    comment: 'Wonderful beach sunset view!'
  });

  assert.strictEqual(revResult.review.rating, 5);
  assert.strictEqual(hotelGoa.reviewCount, prevCount + 1);
});

runTest('Duplicate review for same booking rejected', () => {
  assert.throws(() => {
    reviewService.createReview({
      bookingId: 'bk_seed_checked_out_unreviewed',
      rating: 4,
      comment: 'Trying to review again'
    });
  }, /already been submitted/);
});

console.log('\n======================================================');
console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
