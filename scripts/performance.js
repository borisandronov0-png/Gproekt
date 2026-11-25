import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildBookingIndex, getBookingGroup, overlaps } from '../src/booking.js';

// No randomness: 10 businesses × 100 dates × 10 resources × 8 bookings.
const bookings = [];
for (let business = 0; business < 10; business++) {
  for (let day = 0; day < 100; day++) {
    const date = new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10);
    for (let resource = 0; resource < 10; resource++) {
      for (let slot = 0; slot < 8; slot++) bookings.push({ id: `${business}-${day}-${resource}-${slot}`, businessId: `business-${business}`, date, resourceId: `resource-${resource}`, start: 480 + slot * 60 });
    }
  }
}

const buildStart = performance.now();
const index = buildBookingIndex(bookings);
const buildMilliseconds = performance.now() - buildStart;
const candidates = Array.from({ length: 1000 }, (_, i) => ({
  businessId: `business-${i % 10}`,
  date: new Date(Date.UTC(2026, 0, (i * 7) % 100 + 1)).toISOString().slice(0, 10),
  resourceId: `resource-${Math.floor(i / 10) % 10}`,
  start: 480 + (i % 12) * 60,
}));

function run(useIndex) {
  let examined = 0;
  const start = performance.now();
  const results = candidates.map((candidate) => {
    const group = useIndex ? getBookingGroup(index, candidate.businessId, candidate.date, candidate.resourceId) : bookings;
    // Visit every member to produce stable, hardware-independent counts.
    let conflict = false;
    for (const booking of group) {
      examined++;
      if (booking.businessId === candidate.businessId && booking.date === candidate.date && booking.resourceId === candidate.resourceId && overlaps(candidate.start, 60, booking.start)) conflict = true;
    }
    return conflict;
  });
  return { results, examined, milliseconds: Number((performance.now() - start).toFixed(3)) };
}
const fullScan = run(false);
const indexed = run(true);
assert.deepEqual(indexed.results, fullScan.results);
assert.equal(fullScan.examined, 80000000);
assert.equal(indexed.examined, 8000);
console.log(JSON.stringify({ bookings: bookings.length, queries: candidates.length, groups: index.size, indexBuildExamined: bookings.length, indexBuildMilliseconds: Number(buildMilliseconds.toFixed(3)), fullScan: { examined: fullScan.examined, milliseconds: fullScan.milliseconds }, indexed: { examined: indexed.examined, milliseconds: indexed.milliseconds }, sameResults: true, conflicts: indexed.results.filter(Boolean).length, examinedReduction: fullScan.examined / indexed.examined }, null, 2));
