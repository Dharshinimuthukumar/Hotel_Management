/**
 * Hotel Model
 * Encapsulates hotel properties and rating calculation logic
 */

class Hotel {
  /**
   * @param {string} id - Unique hotel id
   * @param {string} name - Hotel name
   * @param {string} city - City where hotel is located
   * @param {string} address - Street address
   * @param {number} starRating - Star rating (1 to 5)
   */
  constructor(id, name, city, address, starRating) {
    if (!name || !city || !address) {
      throw new Error('Hotel name, city, and address are required.');
    }
    if (starRating < 1 || starRating > 5) {
      throw new Error('Star rating must be between 1 and 5.');
    }

    this.id = id;
    this.name = name;
    this.city = city.trim();
    this.address = address.trim();
    this.starRating = Number(starRating);

    // Rating metrics updated dynamically from reviews
    this.averageRating = Number(starRating); // Default starting rating
    this.reviewCount = 0;
    this.isFlaggedForReview = false; // Flagged if >= 10 reviews and avg < 2.5
    this.createdAt = new Date().toISOString();
  }

  /**
   * Update the running average rating when a new review is added
   * @param {number} newRating (1 to 5)
   */
  addRating(newRating) {
    const currentTotal = this.averageRating * this.reviewCount;
    this.reviewCount += 1;
    this.averageRating = Number(((currentTotal + newRating) / this.reviewCount).toFixed(2));

    // Flag for admin review if >= 10 reviews and average < 2.5
    if (this.reviewCount >= 10 && this.averageRating < 2.5) {
      this.isFlaggedForReview = true;
    } else {
      this.isFlaggedForReview = false;
    }
  }
}

module.exports = Hotel;
