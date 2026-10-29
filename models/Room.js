/**
 * Room Models
 * Demonstrates: Inheritance, Abstraction, and Polymorphic Pricing
 */

class Room {
  /**
   * @param {string} id - Unique room ID
   * @param {string} hotelId - ID of parent hotel
   * @param {string} roomNumber - Room number (unique within hotel)
   * @param {string} type - 'Single' | 'Double' | 'Deluxe' | 'Suite'
   * @param {number} capacity - Max guests
   * @param {number} basePricePerNight - Base nightly tariff in INR
   */
  constructor(id, hotelId, roomNumber, type, capacity, basePricePerNight) {
    if (new.target === Room) {
      throw new Error('Room is an abstract base class and cannot be instantiated directly.');
    }
    this.id = id;
    this.hotelId = hotelId;
    this.roomNumber = roomNumber;
    this.type = type;
    this.capacity = capacity;
    this.basePricePerNight = Number(basePricePerNight);
    this.isActive = true;
  }

  /**
   * Polymorphic method to calculate nightly rate with weekend surcharge (20% for Fri/Sat)
   * @param {boolean} isWeekend - True if Friday or Saturday night
   * @returns {number}
   */
  getNightlyRate(isWeekend = false) {
    if (isWeekend) {
      // 20% surcharge on Friday and Saturday nights
      return Math.round(this.basePricePerNight * 1.20);
    }
    return this.basePricePerNight;
  }

  /**
   * GST slab determination:
   * 12% if room base price is < Rs. 7,500; otherwise 18%.
   * GST is applied on the billed subtotal (including weekend surcharge).
   * @returns {number} 0.12 or 0.18
   */
  getGSTRate() {
    return this.basePricePerNight < 7500 ? 0.12 : 0.18;
  }
}

class SingleRoom extends Room {
  constructor(id, hotelId, roomNumber, basePricePerNight = 2500, capacity = 1) {
    super(id, hotelId, roomNumber, 'Single', capacity, basePricePerNight);
  }
}

class DoubleRoom extends Room {
  constructor(id, hotelId, roomNumber, basePricePerNight = 4500, capacity = 2) {
    super(id, hotelId, roomNumber, 'Double', capacity, basePricePerNight);
  }
}

class DeluxeRoom extends Room {
  constructor(id, hotelId, roomNumber, basePricePerNight = 7000, capacity = 3) {
    super(id, hotelId, roomNumber, 'Deluxe', capacity, basePricePerNight);
  }
}

class SuiteRoom extends Room {
  constructor(id, hotelId, roomNumber, basePricePerNight = 12000, capacity = 4) {
    super(id, hotelId, roomNumber, 'Suite', capacity, basePricePerNight);
  }
}

/**
 * Factory helper function to instantiate the correct room subclass based on type
 */
function createRoomInstance(id, hotelId, roomNumber, type, basePricePerNight, capacity) {
  const normalizedType = (type || '').trim().toLowerCase();
  switch (normalizedType) {
    case 'single':
      return new SingleRoom(id, hotelId, roomNumber, basePricePerNight, capacity || 1);
    case 'double':
      return new DoubleRoom(id, hotelId, roomNumber, basePricePerNight, capacity || 2);
    case 'deluxe':
      return new DeluxeRoom(id, hotelId, roomNumber, basePricePerNight, capacity || 3);
    case 'suite':
      return new SuiteRoom(id, hotelId, roomNumber, basePricePerNight, capacity || 4);
    default:
      throw new Error(`Invalid room type: ${type}. Must be Single, Double, Deluxe, or Suite.`);
  }
}

module.exports = {
  Room,
  SingleRoom,
  DoubleRoom,
  DeluxeRoom,
  SuiteRoom,
  createRoomInstance
};
