/**
 * Hotel Service
 * Implements business rules for Hotel, Room, and Maintenance management
 */
const Hotel = require('../models/Hotel');
const { createRoomInstance } = require('../models/Room');
const Maintenance = require('../models/Maintenance');
const hotelRepository = require('../repositories/hotelRepository');
const roomRepository = require('../repositories/roomRepository');
const bookingRepository = require('../repositories/bookingRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');

class HotelService {
  /**
   * Helper to verify user permissions
   */
  assertManagerOrAdmin(user, targetHotelId = null) {
    if (!user) {
      throw new Error('Authentication required.');
    }
    if (user.role === 'ADMIN') return true;
    if (user.role === 'HOTEL_MANAGER') {
      if (targetHotelId && user.hotelId && user.hotelId !== targetHotelId) {
        throw new Error('Hotel Managers can only manage their assigned hotel.');
      }
      return true;
    }
    throw new Error('Permission denied. Only Admins or Hotel Managers can perform this action.');
  }

  getAllHotels(city = null) {
    const hotels = city ? hotelRepository.findByCity(city) : hotelRepository.findAll();
    return hotels.map((h) => {
      const rooms = roomRepository.findByHotelId(h.id);
      return {
        ...h,
        roomsCount: rooms.length,
        rooms
      };
    });
  }

  getHotelById(id) {
    const hotel = hotelRepository.findById(id);
    if (!hotel) {
      throw new Error(`Hotel with ID ${id} not found.`);
    }
    const rooms = roomRepository.findByHotelId(hotel.id);
    const maintenance = maintenanceRepository.findByHotelId(hotel.id);
    return {
      ...hotel,
      rooms,
      maintenance
    };
  }

  /**
   * Add a new hotel
   * Constraint: Must have name, city, address, star rating 1-5, and at least one room.
   */
  createHotel(hotelData, user) {
    this.assertManagerOrAdmin(user);

    const { name, city, address, starRating, initialRooms } = hotelData;
    if (!Array.isArray(initialRooms) || initialRooms.length === 0) {
      throw new Error('A hotel must be created with at least one room.');
    }

    HotelService.counter = (HotelService.counter || 100) + 1;
    const hotelId = 'hotel_' + Date.now() + '_' + HotelService.counter;
    const newHotel = new Hotel(hotelId, name, city, address, starRating);
    hotelRepository.create(newHotel);

    // Add initial rooms
    const createdRooms = [];
    for (const r of initialRooms) {
      const roomId = `room_${hotelId}_${r.roomNumber}`;
      const roomInstance = createRoomInstance(
        roomId,
        hotelId,
        r.roomNumber,
        r.type,
        r.basePricePerNight,
        r.capacity
      );
      roomRepository.create(roomInstance);
      createdRooms.push(roomInstance);
    }

    return {
      ...newHotel,
      rooms: createdRooms
    };
  }

  /**
   * Delete a hotel
   * Constraint: Do not delete a hotel with upcoming bookings.
   */
  deleteHotel(hotelId, user) {
    this.assertManagerOrAdmin(user, hotelId);

    const todayStr = new Date().toISOString().split('T')[0];
    const hasUpcoming = bookingRepository.hasUpcomingBookingsForHotel(hotelId, todayStr);
    if (hasUpcoming) {
      throw new Error('Cannot delete hotel: It has active or upcoming bookings.');
    }

    const deleted = hotelRepository.delete(hotelId);
    if (!deleted) {
      throw new Error('Hotel not found or already deleted.');
    }
    return { success: true, message: 'Hotel deleted successfully.' };
  }

  /**
   * Add a room to an existing hotel
   * Constraint: Room number must be unique within the hotel.
   */
  addRoom(hotelId, roomData, user) {
    this.assertManagerOrAdmin(user, hotelId);

    const hotel = hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new Error(`Hotel ${hotelId} does not exist.`);
    }

    const existingRoom = roomRepository.findByHotelAndNumber(hotelId, roomData.roomNumber);
    if (existingRoom) {
      throw new Error(`Room number ${roomData.roomNumber} already exists in ${hotel.name}.`);
    }

    const roomId = `room_${hotelId}_${roomData.roomNumber}`;
    const newRoom = createRoomInstance(
      roomId,
      hotelId,
      roomData.roomNumber,
      roomData.type,
      roomData.basePricePerNight,
      roomData.capacity
    );

    roomRepository.create(newRoom);
    return newRoom;
  }

  /**
   * Update room details
   * Constraint: "Do not allow a booked room's type or number to change while a booking exists for it."
   */
  updateRoom(roomId, updates, user) {
    const room = roomRepository.findById(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found.`);
    }
    this.assertManagerOrAdmin(user, room.hotelId);

    // Check if any active/upcoming bookings exist for this room
    const todayStr = new Date().toISOString().split('T')[0];
    const farFuture = '2099-12-31';
    const activeBookings = bookingRepository.findOverlappingBookingsForRoom(roomId, todayStr, farFuture);

    if (activeBookings.length > 0) {
      if (updates.roomNumber && updates.roomNumber.toString() !== room.roomNumber.toString()) {
        throw new Error("Cannot change room number while active or upcoming bookings exist for this room.");
      }
      if (updates.type && updates.type.toLowerCase() !== room.type.toLowerCase()) {
        throw new Error("Cannot change room type while active or upcoming bookings exist for this room.");
      }
    }

    // Check unique room number within hotel if changing
    if (updates.roomNumber && updates.roomNumber.toString() !== room.roomNumber.toString()) {
      const conflict = roomRepository.findByHotelAndNumber(room.hotelId, updates.roomNumber);
      if (conflict && conflict.id !== roomId) {
        throw new Error(`Room number ${updates.roomNumber} is already in use at this hotel.`);
      }
    }

    const updated = roomRepository.update(roomId, updates);
    return updated;
  }

  /**
   * Schedule room maintenance
   * Constraints:
   * - Scheduled by Manager/Admin
   * - Do not allow bookings that overlap maintenance
   */
  scheduleMaintenance(hotelId, roomId, startDate, endDate, reason, user) {
    this.assertManagerOrAdmin(user, hotelId);

    const room = roomRepository.findById(roomId);
    if (!room || room.hotelId !== hotelId) {
      throw new Error('Room not found in the specified hotel.');
    }

    // Check for overlapping maintenance windows
    const existingMaint = maintenanceRepository.findOverlappingMaintenance(roomId, startDate, endDate);
    if (existingMaint.length > 0) {
      throw new Error(`Room already has maintenance scheduled from ${existingMaint[0].startDate} to ${existingMaint[0].endDate}.`);
    }

    // Check for conflicting active bookings
    const overlappingBookings = bookingRepository.findOverlappingBookingsForRoom(roomId, startDate, endDate);
    if (overlappingBookings.length > 0) {
      throw new Error(`Cannot schedule maintenance: Room has conflicting booking (${overlappingBookings[0].bookingCode}) between ${overlappingBookings[0].checkInDate} and ${overlappingBookings[0].checkOutDate}.`);
    }

    const maintId = 'maint_' + Date.now().toString().slice(-6);
    const newMaint = new Maintenance(
      maintId,
      hotelId,
      roomId,
      startDate,
      endDate,
      reason,
      user.id
    );

    maintenanceRepository.create(newMaint);
    return newMaint;
  }

  getMaintenanceByHotel(hotelId) {
    return maintenanceRepository.findByHotelId(hotelId);
  }
}

// Export singleton instance
module.exports = new HotelService();
