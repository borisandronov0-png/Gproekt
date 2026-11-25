import { businesses, sampleBookings } from './data/businesses.js';
import { buildBookingIndex, validateBooking } from './booking.js';

export const storageKey = 'universal-reservations-v1';

export function loadBookings(storage) {
  try {
    const saved = storage.getItem(storageKey);
    // An empty saved array is intentional: never restore cancelled samples.
    if (saved === null) return { bookings: structuredClone(sampleBookings), error: '' };
    const bookings = JSON.parse(saved);
    if (!Array.isArray(bookings)) throw new Error('Invalid storage');
    const index = buildBookingIndex(bookings);
    const ids = new Set();
    for (const booking of bookings) {
      const business = businesses.find((item) => item.id === booking?.businessId);
      if (!business || typeof booking.id !== 'string' || !booking.id || ids.has(booking.id) || validateBooking(business, booking, index, booking.id)) throw new Error('Invalid booking');
      ids.add(booking.id);
    }
    return { bookings, error: '' };
  } catch {
    return { bookings: [], error: 'Запазените данни не могат да се прочетат. Презаредете след проверка на localStorage; данните няма да бъдат презаписани.' };
  }
}
