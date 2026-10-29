/**
 * Maintenance Repository (In-Memory)
 */
const Maintenance = require('../models/Maintenance');

class MaintenanceRepository {
  constructor() {
    this.maintenances = [];
    this.seedMaintenance();
  }

  seedMaintenance() {
    // Seed a sample maintenance window: Room 102 in Jaipur undergoes AC servicing next month
    this.maintenances = [
      new Maintenance(
        'maint_1',
        'hotel_1',
        'room_102',
        '2026-11-20',
        '2026-11-23',
        'AC Servicing & Deep Cleaning',
        'user_mgr_1'
      )
    ];
  }

  findAll() {
    return this.maintenances;
  }

  findById(id) {
    return this.maintenances.find((m) => m.id === id) || null;
  }

  findByRoomId(roomId) {
    return this.maintenances.filter((m) => m.roomId === roomId);
  }

  findByHotelId(hotelId) {
    return this.maintenances.filter((m) => m.hotelId === hotelId);
  }

  findOverlappingMaintenance(roomId, startDate, endDate) {
    return this.maintenances.filter(
      (m) => m.roomId === roomId && m.overlaps(startDate, endDate)
    );
  }

  create(maintenance) {
    this.maintenances.push(maintenance);
    return maintenance;
  }

  delete(id) {
    const index = this.maintenances.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.maintenances.splice(index, 1);
    return true;
  }
}

// Export singleton instance
module.exports = new MaintenanceRepository();
