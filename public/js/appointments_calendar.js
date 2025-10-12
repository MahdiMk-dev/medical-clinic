(function () {
  const API_BASE = (location.origin.includes('localhost'))
    ? (location.protocol + '//' + location.host.replace(/\/$/, '') + '/medical_clinic/api')
    : (location.origin + '/api');

  // -------------------- Auth helpers --------------------
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }
  function authHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  // -------------------- Toast (always on top) --------------------
  function toast(msg, ok = false) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      Object.assign(root.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        display: 'grid',
        gap: '8px',
        zIndex: '2147483647',
        pointerEvents: 'none'
      });
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.role = 'alert';
    el.className = ok ? 'ok-toast' : 'error-toast';
    el.textContent = msg;
    el.style.pointerEvents = 'auto';
    el.style.zIndex = '2147483647';
    root.appendChild(el);
    setTimeout(() => { el.remove(); }, 4000);
  }

  // -------------------- Guard: must be logged in --------------------
  if (!getToken()) {
    location.href = '/medical_clinic/login.html';
    return;
  }

  // -------------------- Utility --------------------
  function toSqlDateTime(d) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    return `${y}-${m}-${da} ${h}:${mi}:${s}`;
  }
  async function safeJson(resp) {
    try { return await resp.json(); } catch { return null; }
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // === helpers for event rendering ===
  function two(n){ return String(n).padStart(2,'0'); }
  function formatRange(start, end){
    if (!(start instanceof Date) || !(end instanceof Date)) return '';
    const s = `${two(start.getHours())}:${two(start.getMinutes())}`;
    const e = `${two(end.getHours())}:${two(end.getMinutes())}`;
    return `${s}–${e}`;
  }
  // Room title by id from loaded resources (Room N — Name)
  function roomTitleById(idStr){
    const r = roomResources.find(r => r.id === String(idStr));
    return r ? r.title : (idStr ? `Room ${idStr}` : '');
  }
  // Prefer resource header; else event extended props; always include room number
function getRoomLabel(arg){
  const xp = arg.event.extendedProps || {};
  const rid = xp.roomId || xp.roomID || arg.event.getResources?.()[0]?.id;
  // If resource header exists, use it
  const resArr = (arg.event.getResources?.() || []);
  if (resArr.length && resArr[0]?.title) return resArr[0].title;

  const name = xp.roomName || xp.room || '';
  if (!rid && !name) return '';
  return formatRoomTitle(rid || '', name);
}


  // -------------------- Lazy-load Scheduler --------------------
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  async function loadSchedulerPlugins() {
    const base = 'https://cdn.jsdelivr.net/npm/@fullcalendar';
    await loadScriptOnce(`${base}/resource@6.1.15/index.global.min.js`);
    await loadScriptOnce(`${base}/resource-timegrid@6.1.15/index.global.min.js`);
    return !!(window.FullCalendar && FullCalendar.ResourceTimeGrid);
  }
  function hasScheduler() {
    return !!(window.FullCalendar && FullCalendar.ResourceTimeGrid);
  }

  // -------------------- Rooms & Doctors (for filters/resources) --------------------
  let roomResources = []; // [{ id: "1", title: "Room 1 — Pediatrics" }]
  async function loadRooms() {
    try {
      const res = await fetch(`${API_BASE}/rooms.php?list=1`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      if (res.status === 401) {
        let reason = 'Session expired. Please sign in again.';
        try { const err = await res.json(); if (err && err.error) reason = err.error; } catch {}
        toast(reason);
        setTimeout(() => location.href = '/medical_clinic/login.html', 900);
        return [];
      }
      if (!res.ok) throw new Error('Failed to load rooms');
      const data = await res.json();
      const arr = data?.rooms || data || [];
return arr
  .map(r => ({ id: String(r.id), title: formatRoomTitle(r.id, r.name) }))
  // de-dupe by id in case the API returns duplicates
  .filter((r, idx, a) => a.findIndex(x => x.id === r.id) === idx);

    } catch (e) {
      console.error(e);
      toast('Failed to load rooms');
      return [];
    }
  }

  let doctorOptions = []; // [{ id: "5", name: "Dr Jane Doe" }]
  async function loadDoctors(){
    try {
      const res = await fetch(`${API_BASE}/doctors.php?list=1`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      if (!res.ok) throw new Error('Failed to load doctors');
      const data = await res.json();
      const arr = data?.doctors || data || [];
      return arr.map(d => ({ id: String(d.id), name: d.name || `${d.fName||''} ${d.lName||''}`.trim() }));
    } catch(e) {
      console.error(e);
      toast('Failed to load doctors');
      return [];
    }
  }

  // -------------------- Filters state + UI --------------------
  let selectedRoomId = '';   // '' means All
  let selectedDoctorId = ''; // '' means All
function formatRoomTitle(id, name) {
  const base = `Room ${id}`;
  if (!name) return base;
  // strip any existing "Room {id}" prefix (with optional dash/emdash)
  const cleaned = String(name).replace(new RegExp(`^\\s*Room\\s*${id}\\s*[—-]?\\s*`, 'i'), '').trim();
  return cleaned ? `${base} — ${cleaned}` : base;
}

  function insertFiltersUI(){
    const bar = document.querySelector('.topbar');
    if (!bar) return;

    // Wrapper
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '8px';
    wrap.style.marginLeft = '12px';

    const roomSel = document.createElement('select');
    roomSel.id = 'filterRoom';
    roomSel.style.padding = '6px';
    roomSel.title = 'Filter by room';

    const docSel = document.createElement('select');
    docSel.id = 'filterDoctor';
    docSel.style.padding = '6px';
    docSel.title = 'Filter by doctor';

    // Initial "All" options
    roomSel.innerHTML = `<option value="">All rooms</option>`;
    docSel.innerHTML  = `<option value="">All doctors</option>`;

    // Populate async
    (async () => {
      roomResources = await loadRooms();
      for (const r of roomResources) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.title;
        roomSel.appendChild(opt);
      }
      doctorOptions = await loadDoctors();
      for (const d of doctorOptions) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name || `Doctor ${d.id}`;
        docSel.appendChild(opt);
      }
    })();

    roomSel.addEventListener('change', async (e) => {
      selectedRoomId = e.target.value || '';
      applyResourceFilter();
      calendar.refetchEvents();
    });
    docSel.addEventListener('change', (e) => {
      selectedDoctorId = e.target.value || '';
      calendar.refetchEvents();
    });

    wrap.appendChild(roomSel);
    wrap.appendChild(docSel);

    // Insert before the right-side buttons, but after the title
    // Structure in your HTML: [title] [spacer auto] [buttons]; we add before spacer if possible
    const rightControls = bar.querySelector('div[style*="margin-left:auto"]');
    if (rightControls) {
      bar.insertBefore(wrap, rightControls);
    } else {
      bar.appendChild(wrap);
    }
  }

  function applyResourceFilter(){
    // Only relevant in resource (Day) view. If Scheduler present, push a filtered resources list.
    if (!hasScheduler()) return;
    const provider = () => {
      if (!selectedRoomId) return roomResources;
      const r = roomResources.find(r => r.id === selectedRoomId);
      return r ? [r] : [];
    };
    calendar.setOption('resources', provider);
    // Refetch resources if available (scheduler)
    if (typeof calendar.refetchResources === 'function') {
      calendar.refetchResources();
    } else {
      // force re-render of the same view to rebuild columns
      const v = calendar.view?.type || 'resourceTimeGridDay';
      calendar.changeView(v);
    }
    // ensure a size recalculation
    setTimeout(() => calendar.updateSize(), 0);
  }

  // -------------------- Events source (with client-side filtering) --------------------
  async function fetchEvents(info, success, failure) {
    try {
      const url = `${API_BASE}/appointments_range.php?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
      if (res.status === 401) {
        let reason = 'Session expired. Please sign in again.';
        try { const err = await res.json(); if (err && err.error) reason = err.error; } catch {}
        toast(reason);
        setTimeout(() => location.href='/medical_clinic/login.html', 900);
        return;
      }
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      let events = await res.json();

      // Normalize & enrich events
      events = (events || []).map(ev => {
        const roomId =
          ev.resourceId || ev.roomId || ev.roomID ||
          ev.extendedProps?.roomId || ev.extendedProps?.roomID;
        const roomName =
          ev.roomName || ev.extendedProps?.roomName || ev.extendedProps?.room || '';
        const doctor = ev.extendedProps?.doctor || ev.doctor || '';
        const doctorId =
          ev.doctorId || ev.doctorID || ev.extendedProps?.doctorId || ev.extendedProps?.doctorID;

        return {
          ...ev,
          resourceId: roomId ? String(roomId) : undefined, // for Scheduler day view
          extendedProps: {
            ...(ev.extendedProps || {}),
            doctor,
            doctorId: doctorId ? String(doctorId) : undefined,
            roomId: roomId ? String(roomId) : undefined,
            roomName: roomName || (roomId ? roomTitleById(String(roomId)).replace(/^Room\s*\d+\s*—\s*/, '') : '')
          }
        };
      });

      // Client-side filter by room/doctor
      const filtered = events.filter(ev => {
        const xp = ev.extendedProps || {};
        if (selectedRoomId && String(xp.roomId) !== String(selectedRoomId)) return false;
        if (selectedDoctorId && String(xp.doctorId) !== String(selectedDoctorId)) return false;
        return true;
      });

      success(filtered);
    } catch (e) {
      console.error(e);
      failure(e);
      toast('Failed to load appointments');
    }
  }

  // -------------------- Move / Resize handlers --------------------
  async function moveOrResize(id, start, end) {
    const body = { id: Number(id), start: toSqlDateTime(start), end: toSqlDateTime(end) };
    try {
      const res = await fetch(`${API_BASE}/appointment_move.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (res.status === 401) {
        let reason = 'Session expired. Please sign in again.';
        try { const err = await res.json(); if (err && err.error) reason = err.error; } catch {}
        toast(reason);
        setTimeout(() => location.href='/medical_clinic/login.html', 900);
        return false;
      }
      if (res.status === 409) {
        const err = await safeJson(res);
        toast(err?.error || 'Overlapping with another appointment');
        return false;
      }
      if (!res.ok) {
        toast('Failed to update appointment');
        return false;
      }
      toast('Appointment updated', true);
      return true;
    } catch (e) {
      console.error(e);
      toast('Network error');
      return false;
    } finally {
      calendar.refetchEvents();
    }
  }
function doctorLabel(name){
  if (!name) return '';
  const t = String(name).trim();
  // avoid double "Dr." if your API already includes it
  return /^dr\.?\s/i.test(t) ? t.replace(/^dr\.?\s*/i, 'Dr. ') : `Dr. ${t}`;
}

  // -------------------- Calendar init --------------------
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    height: 'parent',
    initialView: 'timeGridWeek',
    nowIndicator: true,
    editable: true,
    selectable: false,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
eventTimeFormat:   { hour: '2-digit', minute: '2-digit', hour12: false },
slotMinTime:       '07:00:00',
slotMaxTime:       '22:00:00',
slotDuration:      '00:10:00',   // each row = 15 mins
snapDuration:      '00:10:00',   // drag/resize snaps to 15 mins
slotLabelInterval: '00:15:00',   // show a label every 30 mins (use '00:15:00' if you want every row labeled)
slotLabelFormat:   { hour: '2-digit', minute: '2-digit', hour12: false },
expandRows:        true,
    

    // Events
    eventSources: [{ events: fetchEvents }],

    // Drag / resize
    eventDrop: async (info) => { const ok = await moveOrResize(info.event.id, info.event.start, info.event.end); if (!ok) info.revert(); },
    eventResize: async (info) => { const ok = await moveOrResize(info.event.id, info.event.start, info.event.end); if (!ok) info.revert(); },

    // Tooltip on hover
eventDidMount: (arg) => {
  const patient = arg.event.title || '';
  const timeTxt = arg.timeText || formatRange(arg.event.start, arg.event.end);
  const roomLbl = getRoomLabel(arg);
  const docLbl  = doctorLabel(arg.event.extendedProps?.doctor || '');
  arg.el.title = [patient, timeTxt, roomLbl, docLbl].filter(Boolean).join(', ');
},


    // In-cell content: time · room / patient / doctor
eventContent: (arg) => {
  const patient = arg.event.title || '';
  const timeTxt = arg.timeText || formatRange(arg.event.start, arg.event.end);
  const roomLbl = getRoomLabel(arg);
  const docLbl  = doctorLabel(arg.event.extendedProps?.doctor || '');

  const details = [timeTxt, roomLbl, docLbl].filter(Boolean).join(', ');

  const html = `
    <div class="fc-event-main-custom">
      ${patient ? `<div class="fc-ev-patient">${escapeHtml(patient)}</div>` : ''}
      <div class="fc-ev-details">${escapeHtml(details)}</div>
    </div>
  `;
  return { html };
},

  });

  // Render and ensure proper sizing after layout
  calendar.render();
  setTimeout(() => calendar.updateSize(), 0);
  window.addEventListener('resize', () => calendar.updateSize());

  // -------------------- Topbar buttons --------------------
  document.getElementById('todayBtn')?.addEventListener('click', () => calendar.today());
  document.getElementById('weekBtn')?.addEventListener('click', () => calendar.changeView('timeGridWeek'));
  document.getElementById('dayBtn')?.addEventListener('click', async () => {
    // Try to load Scheduler on demand for rooms-as-columns day view
    try {
      if (!hasScheduler()) {
        const ok = await loadSchedulerPlugins();
        if (!ok) throw new Error('Scheduler plugins not available');
      }
      calendar.setOption('schedulerLicenseKey', 'GPL-My-Project-Is-Open-Source');

      if (!roomResources.length) {
        roomResources = await loadRooms();
      }
      applyResourceFilter(); // sets resources (filtered by selected room, if any)
      calendar.changeView('resourceTimeGridDay');
      setTimeout(() => calendar.updateSize(), 0);
    } catch (e) {
      console.warn('Falling back to normal day view:', e);
      calendar.changeView('timeGridDay');
      setTimeout(() => calendar.updateSize(), 0);
    }
  });

  // Insert filters and pre-load lists
  insertFiltersUI();

})();
