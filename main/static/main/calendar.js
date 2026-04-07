const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

let calOffset = 0;
let allEvents = [];

function getWeekStart(off) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + off * 7);
  return d;
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function loadDayPrefs() {
  try {
    const saved = localStorage.getItem('cal_days');
    return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4, 5, 6];
  } catch(e) { return [0, 1, 2, 3, 4, 5, 6]; }
}

async function fetchEvents() {
  try {
    const res = await fetch('/events/');
    const data = await res.json();
    allEvents = data.events;
    renderCalendar();
  } catch(e) {
    console.error('Failed to fetch events', e);
  }
}

function renderCalendar() {
  const ws = getWeekStart(calOffset);
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);

  document.getElementById('weekLabel').textContent =
    MONTHS[ws.getMonth()] + ' ' + ws.getDate() + ' – ' +
    (ws.getMonth() !== we.getMonth() ? MONTHS[we.getMonth()] + ' ' : '') +
    we.getDate() + ', ' + we.getFullYear();

  const today = dateKey(new Date());
  const visibleDays = loadDayPrefs();
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    if (!visibleDays.includes(i)) continue;
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const key = dateKey(d);

    const col = document.createElement('div');
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
      .filter(ev => ev.date === key)
      .forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'event-pill' + (ev.is_community_event ? ' community' : '');
        pill.textContent = ev.is_community_event ? '★ ' + ev.title : ev.title;
        pill.onclick = () => openView(ev);
        el.appendChild(pill);
      });
  }
}

function openAdd(key) {
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal">
      <h3>New event</h3>
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

  await fetch('/events/create/', {
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
      ${ev.is_community_event ? `<p style="font-size:12px;color:#185FA5;margin-bottom:8px;">★ ${ev.community_name}</p>` : ''}
      <div class="event-detail-body">${ev.notes || '<em style="color:#aaa">No notes</em>'}</div>
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

function changeWeek(dir) {
  calOffset = dir === 0 ? 0 : calOffset + dir;
  renderCalendar();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

fetchEvents();