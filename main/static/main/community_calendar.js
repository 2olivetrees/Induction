const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

let calOffset = 0;
let allEvents = [];
let viewMode = "week"; // "week" or "month"
let currentDate = new Date();
const communityId = window.COMMUNITY_ID;

function toggleView() {
  viewMode = viewMode === "week" ? "month" : "week";
  calOffset = 0; // optional: reset position when switching
  renderCalendar();
}

function getWeekStart(off) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + off * 7);
  return d;
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function fetchEvents() {
  try {
    const res = await fetch(`/community/${communityId}/events/`);
    const data = await res.json();

    allEvents = data.events.map(ev => ({
      id: ev.id,
      title: ev.title,

      // 👇 convert backend → calendar format
      start: ev.start || (ev.date + "T09:00"),
      end: ev.end || (ev.date + "T10:00"),

      allDay: ev.all_day ?? true
    }));
    console.log(allEvents);
    renderCalendar();
  } catch(e) {
    console.error('Failed to fetch events', e);
  }
}

function renderWeek() {
  const ws = getWeekStart(calOffset);
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);

  document.getElementById('weekLabel').textContent =
    MONTHS[ws.getMonth()] + ' ' + ws.getDate() + ' – ' +
    (ws.getMonth() !== we.getMonth() ? MONTHS[we.getMonth()] + ' ' : '') +
    we.getDate() + ', ' + we.getFullYear();

  const today = dateKey(new Date());
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const key = dateKey(d);

    const col = document.createElement('div');
        for (let h = 0; h < 24; h++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'time-slot';
        hourSlot.dataset.hour = h;
        col.appendChild(hourSlot);
}
    col.className = 'day-col' + (key === today ? ' today' : '');
    col.innerHTML = `
      <div class="day-name">${DAYS[d.getDay()]}</div>
      <div class="day-num">${d.getDate()}</div>
      <div class="events-list" id="el-${key}"></div>
      <button class="add-btn" onclick="openAdd('${key}')">+ add</button>
    `;
    grid.appendChild(col);

    const el = col.querySelector('.events-list');
    allEvents
      .filter(ev => ev.start.startsWith(key))
      .forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'event-pill community';
        pill.textContent = ev.title;
        pill.onclick = () => openView(ev);
        el.appendChild(pill);
      });
  }
}

function renderMonth() {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  const base = new Date();
  base.setMonth(base.getMonth() + calOffset);

  const year = base.getFullYear();
  const month = base.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  document.getElementById('weekLabel').textContent =
    MONTHS[month] + ' ' + year;

  const today = dateKey(new Date());

  // empty cells before month starts
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-col empty';
    grid.appendChild(empty);
  }

  // actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = dateKey(d);

    const col = document.createElement('div');
    col.className = 'day-col' + (key === today ? ' today' : '');

    col.innerHTML = `
      <div class="day-num">${day}</div>
      <div class="events-list" id="el-${key}"></div>
      <button class="add-btn" onclick="openAdd('${key}')">+</button>
    `;

    grid.appendChild(col);

    const el = col.querySelector('.events-list');

    allEvents
      .filter(ev => ev.start.startsWith(key))
      .forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'event-pill community';
        pill.textContent = ev.title;
        pill.onclick = () => openView(ev);
        el.appendChild(pill);
      });
  }
}

function renderCalendar() {
  if (viewMode === "week") {
    renderWeek();
  } else {
    renderMonth();
  }
}

function openAdd(key) {
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal">
      <h3>New community event</h3>
      <input id="ev-title" placeholder="Event title" />
      <textarea id="ev-body" placeholder="Notes (optional)"></textarea>
      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveAdd('${key}')">Save</button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('ev-title').focus(), 50);
}

async function saveAdd(key) {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) return;
  const notes = document.getElementById('ev-body').value.trim();

  await fetch(`/community/${communityId}/events/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ title, notes, date: key })
  });

  closeModal();
  fetchEvents();
}

function openView(ev) {
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal">
      <h3>${ev.title}</h3>
      <div class="event-detail-body">${ev.notes || '<em style="color:#9B8FC4">No notes</em>'}</div>
      <div class="modal-actions">
        <button class="btn-danger" onclick="deleteEvent(${ev.id})">Delete</button>
        <button onclick="openEdit(${ev.id}, '${ev.title}', \`${ev.notes}\`)">Edit</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
}

function openEdit(id, title, notes) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit event</h3>
      <input id="ev-title" value="${title}" />
      <textarea id="ev-body">${notes || ''}</textarea>
      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveEdit(${id})">Save</button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('ev-title').focus(), 50);
}

async function saveEdit(id) {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) return;
  const notes = document.getElementById('ev-body').value.trim();

  await fetch(`/events/${id}/edit/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ title, notes })
  });

  closeModal();
  fetchEvents();
}

async function deleteEvent(id) {
  await fetch(`/events/${id}/delete/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') }
  });

  closeModal();
  fetchEvents();
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
  modal.className = '';
}

function changeWeek(direction) {
  if (viewMode === "week") {
    calOffset += direction;
  } else {
    calOffset += direction; // now represents months instead
  }
  renderCalendar();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}


fetchEvents();