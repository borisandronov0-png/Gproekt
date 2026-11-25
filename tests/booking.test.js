import test from 'node:test';
import assert from 'node:assert/strict';
import { businesses, demoDate, sampleBookings } from '../src/data/businesses.js';
import { buildBookingIndex, getAvailableSlots, getBookingGroup, hasConflict, isValidDate, overlaps, validateBooking } from '../src/booking.js';
import { loadBookings, storageKey } from '../src/storage.js';

const tattoo = businesses[0];
const base = { id: 'existing', businessId: tattoo.id, date: demoDate, resourceId: 'maya', start: 600, customerName: 'Тестов клиент', groupSize: 1 };
const index = buildBookingIndex([base]);
const candidate = (changes = {}) => ({ ...base, id: 'new', ...changes });

test('overlaps: partial, contained, containing and identical intervals', () => {
  for (const start of [540, 570, 600, 630, 660]) assert.equal(overlaps(start, 90, 600), true);
  assert.equal(overlaps(600, 30, 590, 90), true);
});
test('back-to-back bookings at both ends are allowed', () => {
  assert.equal(overlaps(510, 90, 600), false);
  assert.equal(overlaps(690, 90, 600), false);
  assert.equal(validateBooking(tattoo, candidate({ start: 690 }), index), null);
});
test('creating an overlapping booking is rejected', () => {
  assert.match(validateBooking(tattoo, candidate({ start: 630 }), index), /зает/);
});
test('edit excludes its own ID and can keep the same time', () => {
  assert.equal(validateBooking(tattoo, { ...base, customerName: 'Ново име' }, index, base.id), null);
  assert.equal(getAvailableSlots(tattoo, demoDate, 'maya', 1, index, base.id).some((slot) => slot.start === 600), true);
});
test('edit into another booking is rejected', () => {
  const other = candidate({ id: 'other', start: 780 });
  assert.match(validateBooking(tattoo, { ...base, start: 750 }, buildBookingIndex([base, other]), base.id), /зает/);
});
test('resource capacity cannot be exceeded', () => {
  assert.match(validateBooking(tattoo, candidate({ groupSize: 2 }), index), /Капацитетът/);
  assert.deepEqual(getAvailableSlots(tattoo, demoDate, '', 2, index), []);
  const restaurant = businesses[1];
  assert.match(validateBooking(restaurant, candidate({ businessId: restaurant.id, resourceId: 'table-2', groupSize: 3, start: 720 }), new Map()), /Капацитетът/);
});
test('closed days reject saves and have no slots', () => {
  const date = '2026-11-29';
  assert.match(validateBooking(tattoo, candidate({ date }), index), /затворен/);
  assert.deepEqual(getAvailableSlots(tattoo, date, '', 1, index), []);
});
test('end after closing and start before opening are rejected', () => {
  assert.match(validateBooking(tattoo, candidate({ start: 1020 }), index), /работното време/);
  assert.match(validateBooking(tattoo, candidate({ start: 570 }), index), /работното време/);
  assert.equal(validateBooking(tattoo, candidate({ start: 990 }), index), null);
});
test('off-schedule and fractional start times are rejected', () => {
  assert.match(validateBooking(tattoo, candidate({ start: 701 }), index), /Началните/);
  assert.match(validateBooking(tattoo, candidate({ start: 700.5 }), index), /работното време/);
});
test('different resources, dates and businesses do not conflict', () => {
  for (const changes of [{ resourceId: 'alex' }, { date: '2026-11-27' }]) assert.equal(validateBooking(tattoo, candidate(changes), index), null);
  assert.equal(hasConflict([base], candidate({ businessId: 'other' }), 90), false);
  assert.deepEqual(getBookingGroup(index, 'other', demoDate, 'maya'), []);
});
test('invalid dates, name, group sizes and unknown resource are rejected', () => {
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('not-a-date'), false);
  assert.equal(isValidDate('2028-02-29'), true);
  for (const changes of [{ date: '' }, { customerName: ' ' }, { groupSize: 0 }, { groupSize: 1.5 }, { resourceId: 'missing' }, { businessId: 'missing' }]) assert.ok(validateBooking(tattoo, candidate(changes), index));
});
test('generated slots obey each business duration, interval, hours and capacity', () => {
  const sampleIndex = buildBookingIndex(sampleBookings);
  for (const business of businesses) {
    const slots = getAvailableSlots(business, demoDate, '', 1, sampleIndex);
    assert.ok(slots.length > 0);
    for (const slot of slots) for (const resourceId of slot.resourceIds) {
      assert.equal(validateBooking(business, { businessId: business.id, date: demoDate, resourceId, start: slot.start, groupSize: 1, customerName: 'Тест' }, sampleIndex), null);
    }
  }
});
test('sample data are valid and do not overlap', () => {
  const accepted = [];
  for (const booking of sampleBookings) {
    assert.equal(validateBooking(businesses.find((business) => business.id === booking.businessId), booking, buildBookingIndex(accepted)), null);
    accepted.push(booking);
  }
});
test('new business works with configuration alone', () => {
  const business = { ...tattoo, id: 'fourth', duration: 60, startInterval: 15, resources: [{ id: 'desk', name: 'Бюро', capacity: 2 }] };
  const slots = getAvailableSlots(business, demoDate, '', 2, new Map());
  assert.equal(slots[1].start - slots[0].start, 15);
  assert.equal(validateBooking(business, { ...base, businessId: 'fourth', resourceId: 'desk', groupSize: 2 }, new Map()), null);
});
test('empty saved array remains empty; missing key seeds samples', () => {
  assert.deepEqual(loadBookings({ getItem: () => '[]' }), { bookings: [], error: '' });
  assert.equal(loadBookings({ getItem: () => null }).bookings.length, sampleBookings.length);
  assert.equal(loadBookings({ getItem: (key) => { assert.equal(key, storageKey); return JSON.stringify(sampleBookings); } }).error, '');
});
test('damaged or inaccessible storage reports error without restoring samples', () => {
  for (const storage of [{ getItem: () => '{' }, { getItem: () => '[null]' }, { getItem: () => { throw new Error('denied'); } }]) {
    const result = loadBookings(storage);
    assert.deepEqual(result.bookings, []);
    assert.ok(result.error);
  }
});
