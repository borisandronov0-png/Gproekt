// Weekday keys follow Date.getDay(): 0 = Sunday, 1 = Monday.
// All time values are integer minutes from midnight.
export const businesses = [
  {
    id: 'tattoo', name: 'Тату студио', brand: 'Мастило', icon: '✦',
    description: 'Време за твоята следваща история.',
    resourceLabel: 'Татуист', duration: 90, startInterval: 30,
    resources: [
      { id: 'maya', name: 'Мая Иванова', detail: 'Фини линии и флорални мотиви', capacity: 1 },
      { id: 'alex', name: 'Алекс Петров', detail: 'Геометрия и черно-бял реализъм', capacity: 1 },
      { id: 'niki', name: 'Никола Димов', detail: 'Традиционни и цветни татуировки', capacity: 1 },
    ],
    hours: { 0: null, 1: [600, 1080], 2: [600, 1080], 3: [660, 1140], 4: [600, 1080], 5: [600, 1140], 6: [660, 1020] },
  },
  {
    id: 'restaurant', name: 'Ресторант', brand: 'Градина', icon: '❋',
    description: 'Добра компания. Запазено място.',
    resourceLabel: 'Маса', duration: 90, startInterval: 15,
    resources: [
      { id: 'table-2', name: 'Маса до прозореца', detail: 'Уютно място за двама', capacity: 2 },
      { id: 'table-4', name: 'Маса в градината', detail: 'Зеленина и приятна компания', capacity: 4 },
      { id: 'table-6', name: 'Голяма семейна маса', detail: 'За празници и срещи с приятели', capacity: 6 },
    ],
    hours: { 0: [720, 1260], 1: null, 2: [720, 1320], 3: [720, 1320], 4: [720, 1320], 5: [720, 1380], 6: [660, 1380] },
  },
  {
    id: 'meeting', name: 'Зали за срещи', brand: 'Пространство', icon: '▦',
    description: 'Място за идеи, които си струват.',
    resourceLabel: 'Зала', duration: 60, startInterval: 30,
    resources: [
      { id: 'room-6', name: 'Зала „Искра“', detail: 'Екран, бяла дъска и Wi-Fi', capacity: 6 },
      { id: 'room-12', name: 'Зала „Хоризонт“', detail: 'Проектор и голяма работна маса', capacity: 12 },
    ],
    hours: { 0: null, 1: [540, 1080], 2: [540, 1080], 3: [540, 1200], 4: [540, 1080], 5: [540, 1020], 6: [600, 960] },
  },
];

export const demoDate = '2026-11-26'; // Thursday; also works independently of today's date.

export const sampleBookings = [
  { id: 'sample-t1', businessId: 'tattoo', date: demoDate, resourceId: 'maya', start: 600, customerName: 'Елена Георгиева', groupSize: 1 },
  { id: 'sample-t2', businessId: 'tattoo', date: demoDate, resourceId: 'alex', start: 780, customerName: 'Петър Стоянов', groupSize: 1 },
  { id: 'sample-t3', businessId: 'tattoo', date: demoDate, resourceId: 'niki', start: 900, customerName: 'Даниела Колева', groupSize: 1 },
  { id: 'sample-r1', businessId: 'restaurant', date: demoDate, resourceId: 'table-2', start: 720, customerName: 'Мария Тодорова', groupSize: 2 },
  { id: 'sample-r2', businessId: 'restaurant', date: demoDate, resourceId: 'table-4', start: 1140, customerName: 'Иван Николов', groupSize: 4 },
  { id: 'sample-r3', businessId: 'restaurant', date: demoDate, resourceId: 'table-6', start: 1200, customerName: 'София Василева', groupSize: 5 },
  { id: 'sample-m1', businessId: 'meeting', date: demoDate, resourceId: 'room-6', start: 540, customerName: 'Екип „Дизайн“', groupSize: 5 },
  { id: 'sample-m2', businessId: 'meeting', date: demoDate, resourceId: 'room-12', start: 660, customerName: 'Екип „Развитие“', groupSize: 10 },
  { id: 'sample-m3', businessId: 'meeting', date: demoDate, resourceId: 'room-6', start: 840, customerName: 'Анна Димитрова', groupSize: 3 },
];
