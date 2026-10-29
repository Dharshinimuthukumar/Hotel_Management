/**
 * Maintenance Model
 * Encapsulates room maintenance schedules
 */

class Maintenance {
  /**
   * @param {string} id
   * @param {string} hotelId
   * @param {string} roomId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {string} reason
   * @param {string} scheduledBy - Manager ID
   */
  constructor(id, hotelId, roomId, startDate, endDate, reason, scheduledBy) {
    if (!hotelId || !roomId || !startDate || !endDate) {
      throw new Error('Hotel, room, start date, and end date are required for maintenance.');
    }
    if (new Date(endDate) <= new Date(startDate)) {
      throw new Error('Maintenance end date must be after start date.');
    }

    this.id = id;
    this.hotelId = hotelId;
    this.roomId = roomId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.reason = reason || 'Routine Room Maintenance';
    this.scheduledBy = scheduledBy;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Check if this maintenance window overlaps with a query date range [start, end)
   * A maintenance ends on endDate; if a booking starts on endDate, they don't overlap.
   * Standard interval overlap: start1 < end2 && end1 > start2
   * @param {string} queryStart
   * @param {string} queryEnd
   * @returns {boolean}
   */
  overlaps(queryStart, queryEnd) {
    return this.startDate < queryEnd && this.endDate > queryStart;
  }
}

module.exports = Maintenance;
