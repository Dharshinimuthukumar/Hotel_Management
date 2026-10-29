/**
 * Room Repository (In-Memory)
 */
const {
  SingleRoom,
  DoubleRoom,
  DeluxeRoom,
  SuiteRoom
} = require('../models/Room');

class RoomRepository {
  constructor() {
    this.rooms = [];
    this.seedRooms();
  }

  seedRooms() {
    this.rooms = [
      // Hotel 1 - Jaipur (The Grand Heritage Palace)
      new SingleRoom('room_101', 'hotel_1', '101', 2800, 1),
      new DoubleRoom('room_102', 'hotel_1', '102', 4800, 2),
      new DeluxeRoom('room_201', 'hotel_1', '201', 7200, 3),
      new SuiteRoom('room_301', 'hotel_1', '301', 14000, 4),

      // Hotel 2 - Goa (Azure Beachfront Resort)
      new DoubleRoom('room_202_1', 'hotel_2', '101', 5200, 2),
      new DeluxeRoom('room_202_2', 'hotel_2', '201', 8200, 3),
      new SuiteRoom('room_202_3', 'hotel_2', '301', 16000, 4),

      // Hotel 3 - Bengaluru (Emerald Heights)
      new SingleRoom('room_301_1', 'hotel_3', '101', 3200, 1),
      new DoubleRoom('room_301_2', 'hotel_3', '102', 5500, 2),
      new DeluxeRoom('room_301_3', 'hotel_3', '201', 7800, 3),

      // Hotel 4 - Bengaluru (Royal Orchid Residency)
      new SingleRoom('room_401_1', 'hotel_4', '101', 2200, 1),
      new DoubleRoom('room_401_2', 'hotel_4', '102', 3800, 2),

      // Hotel 5 - Bengaluru (Silicon Palms Business Suites)
      new DoubleRoom('room_501_1', 'hotel_5', '101', 4200, 2),
      new SuiteRoom('room_501_2', 'hotel_5', '201', 9500, 4)
    ];
  }

  findAll() {
    return this.rooms;
  }

  findById(id) {
    return this.rooms.find((r) => r.id === id) || null;
  }

  findByHotelId(hotelId) {
    return this.rooms.filter((r) => r.hotelId === hotelId && r.isActive);
  }

  findByHotelAndNumber(hotelId, roomNumber) {
    return this.rooms.find(
      (r) => r.hotelId === hotelId && r.roomNumber.toString() === roomNumber.toString() && r.isActive
    ) || null;
  }

  create(room) {
    this.rooms.push(room);
    return room;
  }

  update(id, updates) {
    const room = this.findById(id);
    if (!room) return null;
    Object.assign(room, updates);
    return room;
  }

  delete(id) {
    const room = this.findById(id);
    if (!room) return false;
    room.isActive = false; // Soft delete
    return true;
  }
}

// Export singleton instance
module.exports = new RoomRepository();
