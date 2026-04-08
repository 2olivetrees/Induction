const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
'July','August','September','October','November','December'];

let calOffset = 0;
let allEvents = [];
let fetchUrl = null;
let currentView = loadViewPreference(); // 'week', 'month', or 'day'
let activeDateKey = null;

function loadViewPreference() {
  try {
    const saved = localStorage.getItem('cal_view');
    return ['week', 'month', 'day'].includes(saved) ? saved : 'week';
  } catch(e) {
    return 'week';
  }
}

function initCalendar(url){
    fetchUrl = url;
    fetchEvents();
}

function normalizeTimestamp(ts) {
  if (!ts) return ts;
  // Remove Z or timezone offset for local display
  return ts.replace(/Z|([+-]\d{2}:?\d{2})$/, '');
}

function normalizeEventTimestamps(events) {
  return events.map(ev => ({
    ...ev,
    start: normalizeTimestamp(ev.start),
    end: normalizeTimestamp(ev.end),
  }));
}

function applyEventColor(pill, ev) {
  if (!ev.color) return;
  pill.style.background = ev.color;
  if (ev.is_community_event) {
    pill.style.color = '#fff';
    pill.style.borderColor = 'rgba(0,0,0,0.15)';
  }
}

async function fetchEvents(){
    const res = await fetch(fetchUrl);
    const data = await res.json();

    allEvents = normalizeEventTimestamps(data.events);

    renderCalendar();
}

function getWeekStart(off){
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay() + off*7);
    return d;
}

function dateKey(d){
    return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}


function loadDayPrefs() {
  try {
    const saved = localStorage.getItem('cal_days');
    return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4, 5, 6];
  } catch(e) { return [0, 1, 2, 3, 4, 5, 6]; }
}

function toggleView() {
  if (currentView === 'week') {
    currentView = 'month';
  } else if (currentView === 'month') {
    currentView = 'day';
  } else {
    currentView = 'week';
  }
  localStorage.setItem('cal_view', currentView);
  if (currentView !== 'week') {
    calOffset = 0;
  }
  renderCalendar();
}

function setView(view) {
  if (!['day', 'week', 'month'].includes(view)) return;
  currentView = view;
  localStorage.setItem('cal_view', currentView);
  if (currentView !== 'week') {
    calOffset = 0;
  }
  renderCalendar();
}

function updateViewButtons() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
}


function renderMonthlyCalendar() {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  
  document.getElementById('weekLabel').textContent = 
    MONTHS[currentMonth.getMonth()] + ' ' + currentMonth.getFullYear();

  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  // Create day name headers
  for (let i = 0; i < 7; i++) {
    const header = document.createElement('div');
    header.className = 'month-day-header';
    header.textContent = DAYS[i];
    grid.appendChild(header);
  }

  // Get first day of month and last day
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Start from the Sunday before the first day of the month
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());
  
  const today = dateKey(new Date());
  
  // Create 6 weeks of days (42 days total to fill the grid)
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const key = dateKey(currentDate);
    const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth();
    
    const dayCell = document.createElement('div');
    dayCell.className = 'month-day-cell' + 
      (key === today ? ' today' : '') + 
      (isCurrentMonth ? '' : ' other-month');
    
    dayCell.innerHTML = `
      <div class="month-day-num">${currentDate.getDate()}</div>
      <div class="month-events-list" id="el-${key}"></div>
    `;
    
    dayCell.onclick = (e) => {
      if (e.target.closest('.event-pill')) return;
      if (isCurrentMonth) {
        openDayView(key);
      }
    };
    
    grid.appendChild(dayCell);

    // Add events for this day
    const el = dayCell.querySelector('.month-events-list');
    allEvents
      .filter(ev => (ev.start || "").split("T")[0] === key)
      .slice(0, 3) // Limit to 3 events per day in month view
      .forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'event-pill month-event' + (ev.all_day ? ' all-day' : '') + (ev.is_community_event ? ' community' : '');
        pill.textContent = ev.title;
        applyEventColor(pill, ev);
        pill.dataset.id = ev.id;
        pill.dataset.start = ev.start;
        pill.onclick = () => openView(ev);
        el.appendChild(pill);
      });
      
    // Add indicator if there are more events
    const dayEvents = allEvents.filter(ev => ev.start.split("T")[0] === key);
    if (dayEvents.length > 3) {
      const moreIndicator = document.createElement('div');
      moreIndicator.className = 'more-events';
      moreIndicator.textContent = `+${dayEvents.length - 3} more`;
      el.appendChild(moreIndicator);
    }
  }
}

function renderCalendar(){

  const calendarEl = document.querySelector('.calendar');
  const header = document.getElementById("calendarHeader");
  const allDay = document.getElementById("allDayGrid");
  const body = document.getElementById("calendarBody");
  const monthGrid = document.getElementById("weekGrid");

  if(!calendarEl || !header || !allDay || !body || !monthGrid){
      console.error("Calendar containers missing");
      return;
  }

  calendarEl.classList.toggle('day-view', currentView === 'day');

  if(currentView === "month"){

      header.style.display = "none";
      allDay.style.display = "none";
      body.parentElement.style.display = "none";

      monthGrid.style.display = "grid";
      renderMonthlyCalendar();

  } else if (currentView === 'day') {
      header.style.display = "grid";
      allDay.style.display = "grid";
      body.parentElement.style.display = "block";
      monthGrid.style.display = "none";
      renderDailyCalendar();

  } else {
      header.style.display = "grid";
      allDay.style.display = "grid";
      body.parentElement.style.display = "block";
      monthGrid.style.display = "none";
      renderWeeklyCalendar();
  }
  updateViewButtons();
}

function renderWeeklyCalendar() {

  const ws = getWeekStart(calOffset);
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);

  document.getElementById('weekLabel').textContent =
    MONTHS[ws.getMonth()] + ' ' + ws.getDate() + ' – ' +
    (ws.getMonth() !== we.getMonth() ? MONTHS[we.getMonth()] + ' ' : '') +
    we.getDate() + ', ' + we.getFullYear();

  const today = dateKey(new Date());

  const header = document.getElementById("calendarHeader");
  const allDay = document.getElementById("allDayGrid");
  const body = document.getElementById("calendarBody");

  header.innerHTML = "";
  allDay.innerHTML = "";
  body.innerHTML = "";

  // HEADER ROW
  const spacer = document.createElement("div");
  header.appendChild(spacer);

  for (let i = 0; i < 7; i++) {

    const d = new Date(ws);
    d.setDate(ws.getDate() + i);

    const head = document.createElement("div");
    head.className = "day-head";
    head.textContent = DAYS[d.getDay()] + " " + d.getDate();
    head.style.cursor = "pointer";
    head.onclick = () => openDayView(dateKey(d));

    header.appendChild(head);

  }

  // ALL DAY ROW
  const spacer2 = document.createElement("div");
  allDay.appendChild(spacer2);

  const allDayCols = [];

  for (let i = 0; i < 7; i++) {

    const col = document.createElement("div");
    col.className = "all-day-col";

    allDay.appendChild(col);
    allDayCols.push(col);

  }

  // TIME COLUMN
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";
  body.appendChild(timeCol);

  // DAY COLUMNS
  const dayCols = [];

  for (let i = 0; i < 7; i++) {

    const col = document.createElement("div");
    col.className = "day-col";

    const d = new Date(ws);
    d.setDate(ws.getDate() + i);

    if (dateKey(d) === today) col.classList.add("today");

    body.appendChild(col);
    dayCols.push(col);

  }

  // BUILD HOURS
  for (let h = 0; h < 24; h++) {

    const label = document.createElement("div");
    label.className = "time-slot";
    label.textContent = h + ":00";

    timeCol.appendChild(label);

    dayCols.forEach((col, i) => {

      const slot = document.createElement("div");
      slot.className = "time-slot";

      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      const key = dateKey(d);

      slot.addEventListener("click", function(e) {
        e.stopPropagation();
        openAdd(key, h);
      });

      col.appendChild(slot);

    });

  }

  // ADD EVENTS
  for (let i = 0; i < 7; i++) {

    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const key = dateKey(d);

    const dayEvents = allEvents.filter(ev => (ev.start || "").split("T")[0] === key);

    const allDayEvents = dayEvents.filter(ev => ev.all_day);
    const timedEvents = dayEvents.filter(ev => !ev.all_day);

    // ALL DAY EVENTS
    allDayEvents.forEach(ev => {

      const pill = document.createElement("div");
      pill.className = "event-pill all-day" + (ev.is_community_event ? " community" : "");
      pill.textContent = ev.title;
      applyEventColor(pill, ev);

      pill.onclick = () => openView(ev);

      allDayCols[i].appendChild(pill);

    });

    // TIMED EVENTS
    timedEvents.forEach(ev => {

      const pill = document.createElement("div");
      pill.className = "event-pill timed-event" + (ev.is_community_event ? " community" : "");
      pill.textContent = ev.title;
      applyEventColor(pill, ev);

      const start = new Date(ev.start);
      const end = new Date(ev.end || new Date(start.getTime() + 60*60000));

      const duration = (end - start) / 60000;

      const hour = start.getHours();
      const minute = start.getMinutes();

      const slotHeight = 50;
      const minuteHeight = slotHeight / 60;

      const top = (hour * slotHeight) + (minute * minuteHeight);
      const height = Math.max(duration * minuteHeight, 24);

      pill.style.position = "absolute";
      pill.style.top = `${top}px`;
      pill.style.height = `${height}px`;
      pill.style.left = "3px";
      pill.style.right = "3px";

      pill.onclick = () => openView(ev);

      dayCols[i].appendChild(pill);

    });

  }

  // COLUMN CLICK (ADD EVENT)
  dayCols.forEach((col, i) => {

    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const key = dateKey(d);

    col.onclick = (e) => {

      if (e.target.closest(".event-pill")) return;
      openAdd(key);

    };

  });

  // DEFAULT SCROLL 8AM
  scrollToDefaultHour();
}

function renderDailyCalendar() {
  const key = activeDateKey || dateKey(new Date());
  const dateParts = key.split('-');
  const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
  const today = dateKey(new Date());

  document.getElementById('weekLabel').textContent =
    DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();

  const header = document.getElementById('calendarHeader');
  const allDay = document.getElementById('allDayGrid');
  const body = document.getElementById('calendarBody');

  header.innerHTML = '';
  allDay.innerHTML = '';
  body.innerHTML = '';

  const spacer = document.createElement('div');
  header.appendChild(spacer);

  const head = document.createElement('div');
  head.className = 'day-head';
  head.textContent = DAYS[d.getDay()] + ' ' + d.getDate();
  header.appendChild(head);

  const spacer2 = document.createElement('div');
  allDay.appendChild(spacer2);

  const allDayCol = document.createElement('div');
  allDayCol.className = 'all-day-col';
  if (key === today) allDayCol.classList.add('today');
  allDay.appendChild(allDayCol);

  const timeCol = document.createElement('div');
  timeCol.className = 'time-col';
  body.appendChild(timeCol);

  const dayCol = document.createElement('div');
  dayCol.className = 'day-col';
  if (key === today) dayCol.classList.add('today');
  body.appendChild(dayCol);

  for (let h = 0; h < 24; h++) {
    const label = document.createElement('div');
    label.className = 'time-slot';
    label.textContent = h + ':00';
    timeCol.appendChild(label);

    const slot = document.createElement('div');
    slot.className = 'time-slot';
    slot.addEventListener('click', function(e) {
      e.stopPropagation();
      openAdd(key, h);
    });
    dayCol.appendChild(slot);
  }

  const dayEvents = allEvents.filter(ev => (ev.start || '').split('T')[0] === key);
  const allDayEvents = dayEvents.filter(ev => ev.all_day);
  const timedEvents = dayEvents.filter(ev => !ev.all_day);

  allDayEvents.forEach(ev => {
    const pill = document.createElement('div');
    pill.className = 'event-pill all-day' + (ev.is_community_event ? ' community' : '');
    pill.textContent = ev.title;
    applyEventColor(pill, ev);
    pill.onclick = () => openView(ev);
    allDayCol.appendChild(pill);
  });

  timedEvents.forEach(ev => {
    const pill = document.createElement('div');
    pill.className = 'event-pill timed-event' + (ev.is_community_event ? ' community' : '');
    pill.textContent = ev.title;
    applyEventColor(pill, ev);
    const start = new Date(ev.start);
    const end = new Date(ev.end || new Date(start.getTime() + 60 * 60000));
    const duration = (end - start) / 60000;
    const hour = start.getHours();
    const minute = start.getMinutes();
    const slotHeight = 50;
    const minuteHeight = slotHeight / 60;
    const top = (hour * slotHeight) + (minute * minuteHeight);
    const height = Math.max(duration * minuteHeight, 24);
    pill.style.position = 'absolute';
    pill.style.top = `${top}px`;
    pill.style.height = `${height}px`;
    pill.style.left = '3px';
    pill.style.right = '3px';
    pill.onclick = () => openView(ev);
    dayCol.appendChild(pill);
  });

  dayCol.onclick = (e) => {
    if (e.target.closest('.event-pill')) return;
    openAdd(key);
  };

  scrollToDefaultHour();
}

function openDayView(dateKey) {
  activeDateKey = dateKey;
  currentView = 'day';
  localStorage.setItem('cal_view', currentView);
  renderCalendar();
}

function openAdd(dateKey, hour=null){

  activeDateKey = dateKey;

  let start;

  if(hour !== null){
    start = new Date(`${dateKey}T${String(hour).padStart(2,'0')}:00`);
  } else {
    start = new Date(dateKey + "T09:00");
  }

  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  showModal(`
    <div class="modal">
      <h3>Add Event</h3>

      <input id="ev-title" placeholder="Title">
      <div id="title-error" style="color:red"></div>

      <label>
        <input type="checkbox" id="ev-all-day" onchange="toggleAllDay()"> All day
      </label>

      <div id="time-fields">

        <label>Start</label>
        <input type="datetime-local" id="ev-start" value="${formatLocalDatetime(start)}">

        <label>End</label>
        <input type="datetime-local" id="ev-end" value="${formatLocalDatetime(end)}">

      </div>

      <textarea id="ev-body" placeholder="Notes"></textarea>

      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveAdd()">Save</button>
      </div>

    </div>
  `);

}

async function saveAdd() {

  const titleInput = document.getElementById('ev-title');
  const errorBox = document.getElementById('title-error');
  const title = titleInput.value.trim();
  if(!title){

    errorBox.textContent = "Event title is required";
    titleInput.classList.add("input-error");

    titleInput.focus();
    return;
  }
  errorBox.textContent = "";
  titleInput.classList.remove("input-error");
  const notes = document.getElementById('ev-body').value;

  const start = document.getElementById('ev-start').value || activeDateKey;
  const end = document.getElementById('ev-end').value || null;
  const all_day = document.getElementById('ev-all-day').checked;

  const communityId = window.COMMUNITY_ID;
  let url;
  let payload;

  if (communityId) {
    url = `/community/${communityId}/events/create/`;
    payload = { title, notes, start, end, all_day };
  } else {
    url = '/events/create/';
    payload = { title, notes, start, end, all_day };
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify(payload)
  });

  closeModal();
  fetchEvents();
}


function openView(ev) {
  showModal(`
  <div class="modal">
    <h3>${ev.title}</h3>
    ${ev.is_community_event ? `<p style="font-size:12px;color:#185FA5;margin-bottom:8px;">★ ${ev.community_name}</p>` : ''}
    <div class="event-detail-body">${ev.notes || '<em style="color:#aaa">No notes</em>'}</div>

    <div class="modal-actions">
      <button class="btn-danger" onclick="deleteEvent(${ev.id})">Delete</button>
      <button onclick='openEdit(${JSON.stringify(ev)})'>Edit</button>
      <button onclick="closeModal()">Close</button>
    </div>
  </div>
  `);
}

function openEdit(ev) {
  const start = ev.start ? ev.start.slice(0,16) : "";
  const end = ev.end ? ev.end.slice(0,16) : "";

  showModal(`
  <div class="modal">
      <h3>Edit event</h3>

      <input id="ev-title" value="${ev.title}" placeholder="Title">
      <label>
        <input type="checkbox" id="ev-all-day" ${ev.all_day ? "checked" : ""} onchange="toggleAllDay()"> All day
      </label>
      <div id="time-fields">

        <label>Start</label>
        <input type="datetime-local" id="ev-start" value="${start}">

        <label>End</label>
        <input type="datetime-local" id="ev-end" value="${end}">

      </div>

      <input id="ev-location" value="${ev.location || ""}" placeholder="Location">

      <textarea id="ev-body">${ev.notes || ""}</textarea>

      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveEdit(${ev.id})">Save</button>
      </div>
    </div>
  `);
  toggleAllDay();

}

async function saveEdit(id){

  const title = document.getElementById('ev-title').value;
  const notes = document.getElementById('ev-body').value;

  const start = document.getElementById('ev-start').value;
  const end = document.getElementById('ev-end').value;

  const all_day = document.getElementById('ev-all-day').checked;
  const location = document.getElementById('ev-location').value;

  const event = allEvents.find(e => e.id === id);
  const communityId = event && event.is_community_event ? event.community_id : null;

  const url = communityId
    ? `/community/${communityId}/events/${id}/edit/`
    : `/events/${id}/edit/`;

  await fetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-CSRFToken":getCookie('csrftoken')
    },
    body:JSON.stringify({
      title,
      notes,
      start,
      end,
      all_day,
      location
    })
  });

  closeModal();
  fetchEvents();
}

async function deleteEvent(id) {
  // Find the event to check if it's a community event
  const event = allEvents.find(e => e.id === id);
  const communityId = event && event.is_community_event ? event.community_id : null;
  const url = communityId ? `/community/${communityId}/events/${id}/delete/` : `/events/${id}/delete/`;

  await fetch(url, {
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
  if (currentView === 'month') {
    calOffset += dir;
  } else {
    calOffset = dir === 0 ? 0 : calOffset + dir;
  }
  renderCalendar();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}


let activeFilters = new Set(['personal', 'all_communities']);

function toggleFilter(btn) {
  const id = btn.dataset.community;
  if (activeFilters.has(id)) {
    activeFilters.delete(id);
    btn.classList.remove('active');
  } else {
    activeFilters.add(id);
    btn.classList.add('active');
  }
  renderCalendar();
}

// Stub functions for drag and drop (to prevent errors)
function dragStart(e) {
  // Placeholder for drag start functionality
}

function dragEnd(e) {
  // Placeholder for drag end functionality
}

function detectColumnDate(x) {
  // Placeholder for column date detection
  return new Date().toISOString().split('T')[0];
}



function formatLocalDatetime(dt) {
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const hours = String(dt.getHours()).padStart(2, '0');
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function goToday() {
  calOffset = 0;
  renderCalendar();
}

function toggleAllDay(){

  const checked = document.getElementById('ev-all-day').checked;
  const fields = document.getElementById('time-fields');

  if(checked){
    fields.style.display = "none";
  } else {
    fields.style.display = "block";
  }

}

function showModal(content){

  const modal = document.getElementById('modal');
  if(!modal){
    console.error("Modal container missing");
    return;
  }

  modal.style.display = "flex";
  modal.className = "modal-bg";
  modal.innerHTML = content;

}

function scrollToDefaultHour(){

  const scroll = document.getElementById("calendarBody");

  if (scroll) {
    scroll.scrollTop = 8 * 50;
  }

}
