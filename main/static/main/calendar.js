const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

let calOffset = 0;

function getWeekStart(off) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + off * 7);
  return d;
}

function dateKey(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function loadEvents() {
  try { return JSON.parse(localStorage.getItem('cal_events') || '{}'); }
  catch (e) { return {}; }
}

function saveEvents(ev) {
  try { localStorage.setItem('cal_events', JSON.stringify(ev)); }
  catch (e) {}
}

function openEdit(key, idx) {
  const ev = loadEvents()[key][idx];
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit event</h3>
      <input id="ev-title" value="${ev.title}" />
      <textarea id="ev-body">${ev.body || ''}</textarea>
      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveEdit('${key}', ${idx})">Save</button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('ev-title').focus(), 50);
}

function saveEdit(key, idx) {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) return;
  const body = document.getElementById('ev-body').value.trim();
  const events = loadEvents();
  events[key][idx] = { title, body };
  saveEvents(events);
  closeModal();
  renderCalendar();
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
  const events = loadEvents();
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
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
    (events[key] || []).forEach((ev, idx) => {
      const pill = document.createElement('div');
      pill.className = 'event-pill';
      pill.textContent = ev.title;
      pill.onclick = () => openView(key, idx);
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

function saveAdd(key) {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) return;
  const body = document.getElementById('ev-body').value.trim();
  const events = loadEvents();
  if (!events[key]) events[key] = [];
  events[key].push({ title, body });
  saveEvents(events);
  closeModal();
  renderCalendar();
}

function openView(key, idx) {
  const ev = loadEvents()[key][idx];
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal">
      <h3>${ev.title}</h3>
      <div class="event-detail-body">${ev.body || '<em style="color:#aaa">No notes</em>'}</div>
      <div class="modal-actions">
        <button class="btn-danger" onclick="deleteEvent('${key}', ${idx})">Delete</button>
        <button onclick="openEdit('${key}', ${idx})">Edit</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
}

function deleteEvent(key, idx) {
  const events = loadEvents();
  events[key].splice(idx, 1);
  if (!events[key].length) delete events[key];
  saveEvents(events);
  closeModal();
  renderCalendar();
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


renderCalendar();

window.addEventListener('storage', (e) => {
  if (e.key === 'cal_events' || e.key === 'cal_days') {
    renderCalendar();
  }
});