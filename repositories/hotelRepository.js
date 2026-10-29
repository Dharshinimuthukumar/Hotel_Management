/**
 * Hotel Repository (In-Memory)
 */
const Hotel = require('../models/Hotel');

class HotelRepository {
  constructor() {
    this.hotels = [];
    this.seedHotels();
  }

  seedHotels() {
    this.hotels = [
      new Hotel(
        'hotel_1',
        'The Grand Heritage Palace',
        'Jaipur',
        'Near Hawa Mahal, Amer Road',
        5
      ),
      new Hotel(
        'hotel_2',
        'Azure Beachfront Resort',
        'Goa',
        'Calangute Beach Road, North Goa',
        4
      ),
      new Hotel(
        'hotel_3',
        'Emerald Heights Executive Hotel',
        'Bengaluru',
        '100 Feet Road, Indiranagar',
        4
      ),
      new Hotel(
        'hotel_4',
        'The Royal Orchid Residency',
        'Bengaluru',
        'Whitefield Main Road, Whitefield',
        3
      ),
      new Hotel(
        'hotel_5',
        'Silicon Palms Business Suites',
        'Bengaluru',
        'Electronic City Phase 1',
        4
      )
    ];
  }

  findAll() {
    return this.hotels;
  }

  findById(id) {
    return this.hotels.find((h) => h.id === id) || null;
  }

  findByCity(city) {
    if (!city) return this.hotels;
    const cleanCity = city.trim().toLowerCase();
    return this.hotels.filter((h) => h.city.toLowerCase() === cleanCity);
  }

  create(hotel) {
    this.hotels.push(hotel);
    return hotel;
  }

  update(id, updates) {
    const hotel = this.findById(id);
    if (!hotel) return null;
    Object.assign(hotel, updates);
    return hotel;
  }

  delete(id) {
    const index = this.hotels.findIndex((h) => h.id === id);
    if (index === -1) return false;
    this.hotels.splice(index, 1);
    return true;
  }
}

// Export singleton instance
module.exports = new HotelRepository();
