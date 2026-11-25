export function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function getHours(business, date) {
  if (!isValidDate(date)) return null;
  return business.hours[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? null;
}

export function bookingKey(businessId, date, resourceId) {
  return JSON.stringify([businessId, date, resourceId]);
}

export function buildBookingIndex(bookings) {
  const index = new Map();
  for (const booking of bookings) {
    const key = bookingKey(booking.businessId, booking.date, booking.resourceId);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(booking);
  }
  return index;
}

export function getBookingGroup(index, businessId, date, resourceId) {
  return index.get(bookingKey(businessId, date, resourceId)) ?? [];
}

// Half-open intervals allow one appointment to begin when another ends.
export function overlaps(start, duration, otherStart, otherDuration = duration) {
  return start < otherStart + otherDuration && start + duration > otherStart;
}

export function hasConflict(bookings, candidate, duration, excludeId = null) {
  return bookings.some((booking) =>
    booking.id !== excludeId &&
    booking.businessId === candidate.businessId &&
    booking.date === candidate.date &&
    booking.resourceId === candidate.resourceId &&
    overlaps(candidate.start, duration, booking.start),
  );
}

// The same validation runs on create and edit. No React or storage dependency.
export function validateBooking(business, candidate, index, excludeId = null) {
  if (candidate.businessId !== business.id) return 'Невалиден бизнес.';
  if (!isValidDate(candidate.date)) return 'Изберете валидна дата.';
  const resource = business.resources.find((item) => item.id === candidate.resourceId);
  if (!resource) return 'Изберете валиден ресурс.';
  if (!Number.isInteger(candidate.groupSize) || candidate.groupSize < 1) return 'Броят гости трябва да е цяло положително число.';
  if (candidate.groupSize > resource.capacity) return `Капацитетът на този ресурс е ${resource.capacity} души.`;
  if (typeof candidate.customerName !== 'string' || candidate.customerName.trim().length < 2 || candidate.customerName.trim().length > 80) return 'Въведете име между 2 и 80 знака.';
  const hours = getHours(business, candidate.date);
  if (!hours) return 'Обектът е затворен на избраната дата.';
  const [open, close] = hours;
  if (!Number.isInteger(candidate.start) || candidate.start < open || candidate.start + business.duration > close) return 'Часът трябва да е изцяло в работното време.';
  if ((candidate.start - open) % business.startInterval !== 0) return `Началните часове са през ${business.startInterval} минути от отварянето.`;
  const group = getBookingGroup(index, business.id, candidate.date, resource.id);
  if (hasConflict(group, candidate, business.duration, excludeId)) return 'Този час вече е зает. Изберете друг.';
  return null;
}

export function getAvailableSlots(business, date, resourceId, groupSize, index, excludeId = null) {
  const hours = getHours(business, date);
  if (!hours || !Number.isInteger(groupSize) || groupSize < 1) return [];
  const slots = [];
  for (let start = hours[0]; start + business.duration <= hours[1]; start += business.startInterval) {
    const availableResources = business.resources.filter((resource) => {
      if (resourceId && resource.id !== resourceId) return false;
      if (resource.capacity < groupSize) return false;
      const candidate = { businessId: business.id, date, resourceId: resource.id, start };
      return !hasConflict(getBookingGroup(index, business.id, date, resource.id), candidate, business.duration, excludeId);
    });
    if (availableResources.length) slots.push({ start, resourceIds: availableResources.map((resource) => resource.id) });
  }
  return slots;
}
