/**
 * Review Service
 * Business Rules:
 * 1. Only allow reviews for 'Checked Out' bookings.
 * 2. Review must be submitted within 30 days after checkout.
 * 3. Only one review per booking.
 * 4. Rating between 1 and 5.
 * 5. Recalculate hotel average rating after every review.
 * 6. Flag hotel for admin review if >= 10 reviews and average rating < 2.5.
 */
const Review = require('../models/Review');
const reviewRepository = require('../repositories/reviewRepository');
const bookingRepository = require('../repositories/bookingRepository');
const hotelRepository = require('../repositories/hotelRepository');

class ReviewService {
  /**
   * Add a review for a booking
   * @param {Object} params
   * @param {string} params.bookingId
   * @param {number} params.rating - 1 to 5
   * @param {string} [params.comment='']
   */
  createReview({ bookingId, rating, comment }) {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    // 1. Must be Checked Out
    if (booking.status !== 'Checked Out') {
      throw new Error(`Reviews are only permitted for 'Checked Out' bookings. Current status is '${booking.status}'.`);
    }

    // 2. Check within 30 days of checkout
    const checkoutDate = booking.checkedOutAt ? new Date(booking.checkedOutAt) : new Date(booking.checkOutDate);
    const daysSinceCheckout = (Date.now() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCheckout > 30) {
      throw new Error(`Review window expired. Reviews must be submitted within 30 days of checkout (${daysSinceCheckout.toFixed(1)} days elapsed).`);
    }

    // 3. Only one review per booking
    const existingReview = reviewRepository.findByBookingId(bookingId);
    if (existingReview) {
      throw new Error(`A review has already been submitted for booking ${booking.bookingCode}.`);
    }

    // 4. Rating validation
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      throw new Error('Rating must be between 1 and 5 stars.');
    }

    ReviewService.counter = (ReviewService.counter || 100) + 1;
    const reviewId = 'rev_' + Date.now() + '_' + ReviewService.counter;
    const guestName = booking.guestDetails?.name || 'Verified Guest';
    const guestId = booking.guestId || 'guest_anon';

    const newReview = new Review(
      reviewId,
      booking.id,
      booking.hotelId,
      guestId,
      guestName,
      numRating,
      comment
    );

    reviewRepository.create(newReview);

    // 5 & 6. Recalculate hotel's average rating and flag if needed
    const hotel = hotelRepository.findById(booking.hotelId);
    if (hotel) {
      hotel.addRating(numRating);
    }

    return {
      review: newReview,
      hotelUpdated: hotel ? {
        id: hotel.id,
        name: hotel.name,
        averageRating: hotel.averageRating,
        reviewCount: hotel.reviewCount,
        isFlaggedForReview: hotel.isFlaggedForReview
      } : null
    };
  }

  getReviewsByHotel(hotelId) {
    return reviewRepository.findByHotelId(hotelId);
  }

  getAllReviews() {
    return reviewRepository.findAll();
  }
}

// Export singleton instance
module.exports = new ReviewService();
