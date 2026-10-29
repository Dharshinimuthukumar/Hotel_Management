/**
 * Review Model
 * Encapsulates guest review data and validation
 */

class Review {
  /**
   * @param {string} id
   * @param {string} bookingId
   * @param {string} hotelId
   * @param {string} guestId
   * @param {string} guestName
   * @param {number} rating - 1 to 5
   * @param {string} [comment='']
   */
  constructor(id, bookingId, hotelId, guestId, guestName, rating, comment = '') {
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    this.id = id;
    this.bookingId = bookingId;
    this.hotelId = hotelId;
    this.guestId = guestId;
    this.guestName = guestName;
    this.rating = numRating;
    this.comment = (comment || '').trim();
    this.createdAt = new Date().toISOString();
  }
}

module.exports = Review;
