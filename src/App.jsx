import React, { useEffect, useMemo, useRef, useState } from 'react';
import { businesses, demoDate } from './data/businesses.js';
import { buildBookingIndex, formatTime, getAvailableSlots, getHours, isValidDate, validateBooking } from './booking.js';
import { loadBookings, storageKey } from './storage.js';

const weekdays = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];

function formatDate(date) {
  return isValidDate(date)
    ? new Intl.DateTimeFormat('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
    : 'Изберете дата';
}

function Filters({ business, date, resourceId, groupSize, onDate, onResource, onGroupSize }) {
  return <div className="filters">
    <label>Дата<input type="date" value={date} onChange={(event) => onDate(event.target.value)} required /></label>
    <label>{business.resourceLabel}<select value={resourceId} onChange={(event) => onResource(event.target.value)}>
      <option value="">Всички</option>
      {business.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.capacity} {resource.capacity === 1 ? 'човек' : 'души'}</option>)}
    </select></label>
    <label>Брой гости<input type="number" min="1" max={Math.max(...business.resources.map((resource) => resource.capacity))} step="1" value={groupSize} onChange={(event) => onGroupSize(event.target.value)} required /></label>
  </div>;
}

function ReservationCard({ booking, business, onEdit, onCancel, editing }) {
  const resource = business.resources.find((item) => item.id === booking.resourceId);
  return <article className={`reservation ${editing ? 'is-editing' : ''}`}>
    <div className="reservation-top"><span className="time-range">{formatTime(booking.start)} <span>– {formatTime(booking.start + business.duration)}</span></span><span className="badge">Потвърдена</span></div>
    <h3>{booking.customerName}</h3>
    <p>{resource.name} · {booking.groupSize} {booking.groupSize === 1 ? 'човек' : 'души'}</p>
    <div className="reservation-actions"><button type="button" onClick={() => onEdit(booking)} aria-label={`Редактирай резервацията на ${booking.customerName}`}>Редактирай</button><button type="button" className="danger-link" onClick={() => onCancel(booking)} aria-label={`Отмени резервацията на ${booking.customerName}`}>Отмени</button></div>
  </article>;
}

export default function App() {
  const [initial] = useState(() => loadBookings({ getItem: (key) => window.localStorage.getItem(key) }));
  const [bookings, setBookings] = useState(initial.bookings);
  const [storageError, setStorageError] = useState(initial.error);
  const [businessId, setBusinessId] = useState(businesses[0].id);
  const [date, setDate] = useState(demoDate);
  const [resourceId, setResourceId] = useState('');
  const [groupSize, setGroupSize] = useState('1');
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedResource, setSelectedResource] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const bookingSection = useRef(null);
  const business = businesses.find((item) => item.id === businessId);
  const hours = getHours(business, date);

  // Customer name and slot selection are deliberately absent from these dependencies.
  const index = useMemo(() => buildBookingIndex(bookings), [bookings]);
  const slots = useMemo(() => getAvailableSlots(business, date, resourceId, Number(groupSize), index, editingId), [business, date, resourceId, groupSize, index, editingId]);
  const visibleBookings = useMemo(() => bookings.filter((booking) => booking.businessId === businessId && booking.date === date).sort((a, b) => a.start - b.start || a.customerName.localeCompare(b.customerName, 'bg')), [bookings, businessId, date]);
  const selectedSlot = slots.find((slot) => slot.start === selectedStart);
  const eligibleResources = business.resources.filter((resource) => selectedSlot?.resourceIds.includes(resource.id));

  useEffect(() => {
    // Seed once. A persisted [] stays empty on every later visit.
    if (initial.error) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(initial.bookings)); }
    catch { setStorageError('Браузърът не разрешава запис. Разрешете localStorage и презаредете.'); }
  }, [initial]);

  function clearSelection() {
    setSelectedStart(null);
    setSelectedResource('');
    setError('');
    setNotice('');
  }

  function resetForm() {
    clearSelection();
    setEditingId(null);
    setCustomerName('');
  }

  function switchBusiness(id) {
    setBusinessId(id);
    setResourceId('');
    setGroupSize('1');
    resetForm();
  }

  function commit(next) {
    if (storageError) return false;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setBookings(next);
      return true;
    } catch {
      setStorageError('Промяната не е записана. Проверете свободното място и разрешенията за localStorage, после презаредете.');
      return false;
    }
  }

  function submit(event) {
    event.preventDefault();
    if (!isValidDate(date)) { setError('Изберете валидна дата.'); return; }
    if (!Number.isInteger(Number(groupSize)) || Number(groupSize) < 1) { setError('Броят гости трябва да е цяло положително число.'); return; }
    const maxCapacity = Math.max(...business.resources.filter((resource) => !resourceId || resource.id === resourceId).map((resource) => resource.capacity));
    if (Number(groupSize) > maxCapacity) { setError(`Капацитетът за този избор е до ${maxCapacity} души. Намалете броя гости или сменете ресурса.`); return; }
    if (!getHours(business, date)) { setError('Обектът е затворен на избраната дата.'); return; }
    const candidate = {
      id: editingId ?? window.crypto.randomUUID(), businessId, date,
      resourceId: selectedResource, start: selectedStart,
      customerName: customerName.trim(), groupSize: Number(groupSize),
    };
    if (selectedStart === null || !selectedResource) { setError('Първо изберете свободен час и ресурс.'); return; }
    const validationError = validateBooking(business, candidate, index, editingId);
    if (validationError) { setError(validationError); return; }
    const next = editingId ? bookings.map((booking) => booking.id === editingId ? candidate : booking) : [...bookings, candidate];
    if (commit(next)) {
      const wasEditing = Boolean(editingId);
      resetForm();
      setNotice(wasEditing ? 'Промените по резервацията са запазени.' : 'Резервацията е създадена успешно. Часът е запазен за вас.');
    }
  }

  function editBooking(booking) {
    setEditingId(booking.id);
    setDate(booking.date);
    setResourceId(booking.resourceId);
    setGroupSize(String(booking.groupSize));
    setSelectedStart(booking.start);
    setSelectedResource(booking.resourceId);
    setCustomerName(booking.customerName);
    setError('');
    setNotice('');
    bookingSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bookingSection.current?.focus({ preventScroll: true });
  }

  function cancelBooking(booking) {
    if (!window.confirm(`Да отменим ли резервацията на ${booking.customerName} за ${formatDate(booking.date)} в ${formatTime(booking.start)}?`)) return;
    if (commit(bookings.filter((item) => item.id !== booking.id))) {
      if (editingId === booking.id) resetForm();
      setNotice('Резервацията е отменена. Часът отново е свободен.');
    }
  }

  return <>
    <header className="site-header"><div className="header-inner"><a className="logo" href="./"><span className="logo-icon">▦</span><span>Резервирай<span className="logo-dot">.</span></span></a><span className="project-tag">УЧЕБЕН ПРОЕКТ <span>2026</span></span></div></header>
    <main className="page">
      <div className="intro"><div><p className="eyebrow">ЕДНА СИСТЕМА. МНОГО ВЪЗМОЖНОСТИ.</p><h1>Всяка среща започва<br />със запазен час<span>.</span></h1><p className="intro-copy">Универсална система за резервации</p></div><div className="demo-note"><span className="demo-symbol">◷</span><div><strong>Готово за демонстрация</strong><p>Примерни данни · Запис в браузъра</p><button className="text-button" onClick={() => { setDate(demoDate); resetForm(); }}>Демо дата: {formatDate(demoDate)}</button></div></div></div>
      <nav className="business-tabs" aria-label="Избор на бизнес">{businesses.map((item) => <button key={item.id} className={item.id === businessId ? 'business-tab active' : 'business-tab'} aria-pressed={item.id === businessId} onClick={() => switchBusiness(item.id)}><span className="business-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.name}</strong><small>{item.brand}</small></span><span className="tab-check" aria-hidden="true">{item.id === businessId ? '✓' : '+'}</span></button>)}</nav>
      {storageError && <p className="message error" role="alert">{storageError}</p>}
      <div className="workspace-grid">
        <section className="booking-panel card" ref={bookingSection} tabIndex="-1" aria-labelledby="booking-title">
          <div className="panel-heading"><div><p className="eyebrow">{business.brand}</p><h2 id="booking-title">{editingId ? 'Редакция на резервация' : 'Запазете своето време'}</h2><p>{business.description}</p></div><span className="duration-pill">◷ {business.duration} мин.</span></div>
          {editingId && <div className="edit-banner">Редактирате съществуваща резервация.<button onClick={resetForm}>Откажи редакцията</button></div>}
          <form onSubmit={submit} noValidate>
            <Filters business={business} date={date} resourceId={resourceId} groupSize={groupSize}
              onDate={(value) => { setDate(value); clearSelection(); }}
              onResource={(value) => { setResourceId(value); clearSelection(); }}
              onGroupSize={(value) => { setGroupSize(value); clearSelection(); }} />
            <div className="slots-heading"><h3>Свободни начални часове</h3><span>{hours ? `${formatTime(hours[0])} – ${formatTime(hours[1])}` : 'Неработен ден'}</span></div>
            <p className="field-hint">Изберете час. Всеки запис запазва целия ресурс за {business.duration} минути.</p>
            {slots.length ? <div className="slots" aria-label="Свободни часове">{slots.map((slot) => <button type="button" key={slot.start} aria-pressed={selectedStart === slot.start} className={`slot ${selectedStart === slot.start ? 'selected' : ''}`} onClick={() => { setSelectedStart(slot.start); setSelectedResource(slot.resourceIds[0]); setError(''); setNotice(''); }}><strong>{formatTime(slot.start)}</strong><span>{slot.resourceIds.length} {slot.resourceIds.length === 1 ? 'свободен ресурс' : 'свободни ресурса'}</span></button>)}</div> : <div className="empty-state"><span aria-hidden="true">◷</span><h3>{!isValidDate(date) ? 'Изберете валидна дата' : !hours ? 'Днес обектът почива' : 'Няма свободни часове'}</h3><p>{!hours ? 'Изберете друг ден от календара.' : 'Променете датата, ресурса или броя гости.'}</p></div>}
            <div className="customer-section"><h3>Данни за резервацията</h3><div className="customer-fields"><label>Име на клиент<input value={customerName} onChange={(event) => { setCustomerName(event.target.value); setError(''); }} placeholder="Напр. Елена Иванова" autoComplete="name" minLength="2" maxLength="80" required /></label><label>Избран {business.resourceLabel.toLowerCase()}<select value={selectedResource} disabled={!selectedSlot} onChange={(event) => setSelectedResource(event.target.value)} required><option value="">Първо изберете час</option>{eligibleResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label></div>
            <p className="selection-summary">{selectedSlot && selectedResource ? `${formatDate(date)} · ${formatTime(selectedStart)} – ${formatTime(selectedStart + business.duration)} · ${groupSize} ${Number(groupSize) === 1 ? 'човек' : 'души'}` : 'Изберете свободен час, за да продължите.'}</p>
            {error && <p className="message error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={Boolean(storageError)}>{editingId ? 'Запази промените' : 'Потвърди резервацията'}</button>
            <p className="privacy-note">Демо приложение. Използвайте измислени имена.</p></div>
          </form>
          <div className="message-region" role="status" aria-live="polite">{notice && <p className="message success">✓ {notice}</p>}</div>
        </section>
        <aside className="sidebar"><section className="card reservations-panel" aria-labelledby="reservations-title"><div className="aside-heading"><h2 id="reservations-title">Резервации</h2><span className="count-badge">{visibleBookings.length}</span></div><p className="aside-date">{formatDate(date)} · {business.name}</p><div className="reservation-list">{visibleBookings.length ? visibleBookings.map((booking) => <ReservationCard key={booking.id} business={business} booking={booking} onEdit={editBooking} onCancel={cancelBooking} editing={editingId === booking.id} />) : <div className="empty-reservations"><span aria-hidden="true">▦</span><h3>Денят е свободен</h3><p>Резервациите за тази дата ще се покажат тук.</p></div>}</div></section>
        <details className="hours-panel card"><summary>Работно време <span>по дни</span></summary><dl>{weekdays.map((day, dayIndex) => <div key={day} className={isValidDate(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === dayIndex ? 'current-day' : ''}><dt>{day}</dt><dd>{business.hours[dayIndex] ? business.hours[dayIndex].map(formatTime).join(' – ') : 'Почивен ден'}</dd></div>)}</dl></details>
        <p className="sidebar-note">Един ресурс. Една резервация.<br />Без застъпване, с място за всеки.</p></aside>
      </div>
      <footer><span>Резервирай. <span>Учебна разработка</span></span><span>React + Vite · Данните остават в този браузър</span></footer>
    </main>
  </>;
}
