/**
 * Review Repository (In-Memory)
 */
const Review = require('../models/Review');

class ReviewRepository {
  constructor() {
    this.reviews = [];
    this.seedReviews();
  }

  seedReviews() {
    this.reviews = [
      new Review(
        'rev_1',
        'bk_seed_checked_out',
        'hotel_1',
        'user_guest_1',
        'Priya Sharma',
        5,
        'Splendid palace ambiance! The royal courtyard breakfast was unforgettable.'
      )
    ];
  }

  findAll() {
    return this.reviews;
  }

  findById(id) {
    return this.reviews.find((r) => r.id === id) || null;
  }

  findByHotelId(hotelId) {
    return this.reviews.filter((r) => r.hotelId === hotelId);
  }

  findByBookingId(bookingId) {
    return this.reviews.find((r) => r.bookingId === bookingId) || null;
  }

  create(review) {
    this.reviews.push(review);
    return review;
  }
}

// Export singleton instance
module.exports = new ReviewRepository();
