import { Booking, Driver, Vehicle } from '../models/index.js';
import { BLOCKING_STATUSES } from '../models/constants.js';

/**
 * Keep the one-to-one vehicle ⇄ driver default assignment consistent in both
 * collections. Passing driverId=null unassigns.
 */
export async function setVehicleDriver(vehicleId, driverId) {
  await Driver.updateMany({ assignedVehicle: vehicleId, _id: { $ne: driverId } }, { assignedVehicle: null });
  if (driverId) {
    await Vehicle.updateMany({ assignedDriver: driverId, _id: { $ne: vehicleId } }, { assignedDriver: null });
    await Driver.updateOne({ _id: driverId }, { assignedVehicle: vehicleId });
  }
  await Vehicle.updateOne({ _id: vehicleId }, { assignedDriver: driverId || null });
}

export async function setDriverVehicle(driverId, vehicleId) {
  if (vehicleId) await setVehicleDriver(vehicleId, driverId);
  else {
    await Vehicle.updateMany({ assignedDriver: driverId }, { assignedDriver: null });
    await Driver.updateOne({ _id: driverId }, { assignedVehicle: null });
  }
}

/** Upcoming or ongoing bookings that still need this resource. */
export function activeBookingsFor(field, id) {
  return Booking.countDocuments({
    [field]: id,
    status: { $in: [...BLOCKING_STATUSES, 'pending'] },
    tripEndAt: { $gte: new Date() },
  });
}
