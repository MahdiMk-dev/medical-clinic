(function () {
  const API_BASE = (location.origin.includes('localhost'))
    ? (location.protocol + '//' + location.host.replace(/\/$/, '') + '/medical_clinic/api')
    : (location.origin + '/api');

  // -------------------- Auth --------------------
  function getToken() { return localStorage.getItem('token') || sessionStorage.getItem('token') || ''; }
  function authHeaders(){ const t=getToken(); return t?{'Authorization':'Bearer '+t}:{ }; }
  if (!getToken()) { location.href = '/medical_clinic/login.html'; return; }

  // -------------------- Toast --------------------
  function toast(msg, ok = false) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      // Styling comes from CSS (#toast-root, .ok-toast, .error-toast)
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.role = 'alert';
    el.className = ok ? 'ok-toast' : 'error-toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }

  // -------------------- Utils --------------------
  function toSqlDateTime(d) {
    const p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  async function safeJson(resp) { try { return await resp.json(); } catch { return null; } }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function two(n){ return String(n).padStart(2,'0'); }
  function formatRange(start, end){
    if (!(start instanceof Date) || !(end instanceof Date)) return '';
    return `${two(start.getHours())}:${two(start.getMinutes())}–${two(end.getHours())}:${two(end.getMinutes())}`;
  }
  function doctorLabel(name){
    if (!name) return '';
    const t = String(name).trim();
    return /^dr\.?\s/i.test(t) ? t.replace(/^dr\.?\s*/i, 'Dr. ') : `Dr. ${t}`;
  }

  // -------------------- Data helpers --------------------
  let roomResources = [];
  let doctorOptions = [];

  function formatRoomTitle(id, name) {
    const base = `Room ${id}`;
    if (!name) return base;
    const cleaned = String(name).replace(new RegExp(`^\\s*Room\\s*${id}\\s*[—-]?\\s*`, 'i'), '').trim();
    return cleaned ? `${base} — ${cleaned}` : base;
  }
  async function loadRooms() {
    try {
      const res = await fetch(`${API_BASE}/rooms.php?list=1`, { headers: { 'Content-Type':'application/json', ...authHeaders() } });
      if (!res.ok) throw new Error();
      const data = await res.json(); const arr = data?.rooms || data || [];
      return arr.map(r => ({ id: String(r.id), title: formatRoomTitle(r.id, r.name) }))
                .filter((r, i, a) => a.findIndex(x => x.id === r.id) === i);
    } catch { toast('Failed to load rooms'); return []; }
  }
  async function loadDoctors() {
    try {
      const res = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: { 'Content-Type':'application/json', ...authHeaders() } });
      if (!res.ok) throw new Error();
      const data = await res.json(); const arr = data?.doctors || data || [];
      return arr.map(d => ({ id: String(d.id), name: d.name || `${d.fName||''} ${d.lName||''}`.trim() }));
    } catch { toast('Failed to load doctors'); return []; }
  }
  function roomTitleById(idStr){
    const r = roomResources.find(r => r.id === String(idStr));
    return r ? r.title : (idStr ? `Room ${idStr}` : '');
  }

  // -------------------- Optional Scheduler --------------------
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  async function loadSchedulerPlugins() {
    const base = 'https://cdn.jsdelivr.net/npm/@fullcalendar';
    await loadScriptOnce(`${base}/resource@6.1.15/index.global.min.js`);
    await loadScriptOnce(`${base}/resource-timegrid@6.1.15/index.global.min.js`);
    return !!(window.FullCalendar && FullCalendar.ResourceTimeGrid);
  }
  function hasScheduler() { return !!(window.FullCalendar && FullCalendar.ResourceTimeGrid); }

  // -------------------- Filters --------------------
  let selectedRoomId = '';
  let selectedDoctorId = '';

  function insertFiltersUI(calendar){
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const wrap = document.createElement('div');
    // These layout tweaks are not in the CSS; keep minimal inline for placement in topbar
    wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.marginLeft='12px';

    const roomSel = document.createElement('select');
    const docSel  = document.createElement('select');
    // Light padding to match UI—specific to these ad-hoc controls
    roomSel.style.padding = docSel.style.padding = '6px';
    roomSel.title='Filter by room'; docSel.title='Filter by doctor';
    roomSel.innerHTML = `<option value="">All rooms</option>`;
    docSel.innerHTML  = `<option value="">All doctors</option>`;
    (async () => {
      roomResources = await loadRooms();
      for (const r of roomResources) {
        const opt = document.createElement('option'); opt.value=r.id; opt.textContent=r.title; roomSel.appendChild(opt);
      }
      doctorOptions = await loadDoctors();
      for (const d of doctorOptions) {
        const opt = document.createElement('option'); opt.value=d.id; opt.textContent=d.name || `Doctor ${d.id}`; docSel.appendChild(opt);
      }
    })();
    roomSel.addEventListener('change', async (e) => { selectedRoomId = e.target.value || ''; applyResourceFilter(calendar); calendar.refetchEvents(); });
    docSel.addEventListener('change', (e) => { selectedDoctorId = e.target.value || ''; calendar.refetchEvents(); });
    const rightControls = bar.querySelector('div[style*="margin-left:auto"]');
    if (rightControls) bar.insertBefore(wrap, rightControls); else bar.appendChild(wrap);
    wrap.appendChild(roomSel); wrap.appendChild(docSel);
  }
  function applyResourceFilter(calendar){
    if (!hasScheduler()) return;
    const provider = () => {
      if (!selectedRoomId) return roomResources;
      const r = roomResources.find(r => r.id === selectedRoomId);
      return r ? [r] : [];
    };
    calendar.setOption('resources', provider);
    if (typeof calendar.refetchResources === 'function') calendar.refetchResources();
    const v = calendar.view?.type || 'resourceTimeGridDay';
    calendar.changeView(v);
    setTimeout(() => calendar.updateSize(), 0);
  }

  // -------------------- Event source & normalization --------------------
  function normalizeEvent(ev){
    const roomId =
      ev.resourceId || ev.roomId || ev.roomID ||
      ev.extendedProps?.roomId || ev.extendedProps?.roomID;
    const roomName =
      ev.roomName || ev.extendedProps?.roomName || ev.extendedProps?.room || '';
    const doctor = ev.extendedProps?.doctor || ev.doctor || '';
    const doctorId =
      ev.doctorId || ev.doctorID || ev.extendedProps?.doctorId || ev.extendedProps?.doctorID;
    const status = ev.extendedProps?.status || ev.status || '';

    return {
      ...ev,
      resourceId: roomId ? String(roomId) : undefined,
      extendedProps: {
        ...(ev.extendedProps || {}),
        doctor,
        doctorId: doctorId ? String(doctorId) : undefined,
        roomId: roomId ? String(roomId) : undefined,
        roomName: roomName || (roomId ? roomTitleById(String(roomId)).replace(/^Room\s*\d+\s*—\s*/, '') : ''),
        status
      }
    };
  }

  async function fetchEvents(info, success, failure) {
    try {
      const url = `${API_BASE}/appointments_range.php?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
      if (res.status === 401) { toast('Session expired. Please sign in again.'); setTimeout(()=>location.href='/medical_clinic/login.html', 900); return; }
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      let events = await res.json();
      events = (events || []).map(normalizeEvent);
      const filtered = events.filter(ev => {
        const xp = ev.extendedProps || {};
        if (selectedRoomId && String(xp.roomId) !== String(selectedRoomId)) return false;
        if (selectedDoctorId && String(xp.doctorId) !== String(selectedDoctorId)) return false;
        return true;
      });
      success(filtered);
    } catch (e) { console.error(e); failure(e); toast('Failed to load appointments'); }
  }

  // -------------------- Move / Resize --------------------
  async function moveOrResize(calendar, id, start, end) {
    const body = { id: Number(id), start: toSqlDateTime(start), end: toSqlDateTime(end) };
    try {
      const res = await fetch(`${API_BASE}/appointment_move.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (res.status === 401) { toast('Session expired. Please sign in again.'); setTimeout(()=>location.href='/medical_clinic/login.html', 900); return false; }
      if (res.status === 409) { const err = await safeJson(res); toast(err?.error || 'Overlapping with another appointment'); return false; }
      if (!res.ok) { toast('Failed to update appointment'); return false; }
      toast('Appointment updated', true);
      return true;
    } catch (e) { console.error(e); toast('Network error'); return false; }
    finally { calendar.refetchEvents(); }
  }

  // -------------------- Status & Cancel APIs --------------------
  function dbToUiStatus(db) {
    const s = String(db || '').toLowerCase();
    if (s === 'rescheduled') return 'checked in';
    if (s === 'completed')   return 'checked out';
    return 'scheduled';
  }
  async function changeStatus(id, uiStatus) {
    const res = await fetch(`${API_BASE}/appointment_status.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id, status: uiStatus })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Status update failed');
    return true;
  }
  async function cancelAppointment(id) {
    const res = await fetch(`${API_BASE}/appointment_cancel.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Cancel failed');
    return true;
  }

  // -------------------- Edit Modal --------------------
  let editModalEl = null;
  function ensureEditModal(){
    if (editModalEl) return editModalEl;
    const el = document.createElement('div');
    el.className = 'cal-mini-modal hidden';
    el.innerHTML = `
      <div class="cal-mm-backdrop"></div>
      <div class="cal-mm-card">
        <header><div>Edit appointment</div><button type="button" class="cal-mm-close">×</button></header>
        <form class="cal-mm-body">
          <input type="hidden" name="id">
          <label>Date <input type="date" name="date" required></label>
          <div class="cal-mm-row">
            <label>From <input type="time" name="from" required></label>
            <label>To <input type="time" name="to" required></label>
          </div>
          <div class="cal-mm-actions">
            <div class="cal-mm-msg"></div>
            <button type="button" class="btn-secondary cal-mm-cancel">Cancel</button>
            <button type="submit" class="btn-primary">Save</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);
    editModalEl = el;
    const close = () => { el.classList.add('hidden'); };
    el.querySelector('.cal-mm-backdrop').addEventListener('click', close);
    el.querySelector('.cal-mm-close').addEventListener('click', close);
    el.querySelector('.cal-mm-cancel').addEventListener('click', close);
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const id   = Number(fd.get('id'));
      const date = String(fd.get('date'));
      const from = String(fd.get('from'));
      const to   = String(fd.get('to'));
      const msg  = el.querySelector('.cal-mm-msg');
      msg.textContent = 'Saving…';
      try {
        const res = await fetch(`${API_BASE}/appointment_update.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ id, date, from, to })
        });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || j.ok !== true) { msg.textContent = j.error || 'Update failed'; return; }
        msg.textContent = 'Saved.'; setTimeout(() => { close(); calendar.refetchEvents(); }, 250);
      } catch (err) { msg.textContent = 'Failed to save.'; }
    });
    return el;
  }
  function openEditModalForEvent(ev){
    const el = ensureEditModal();
    el.classList.remove('hidden');
    const f  = el.querySelector('form');
    f.querySelector('[name="id"]').value = ev.id;
    const d = new Date(ev.start);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    const d2 = new Date(ev.end); const hh2 = String(d2.getHours()).padStart(2,'0'), mm2 = String(d2.getMinutes()).padStart(2,'0');
    f.querySelector('[name="date"]').value = `${y}-${m}-${da}`;
    f.querySelector('[name="from"]').value = `${hh}:${mm}`;
    f.querySelector('[name="to"]').value   = `${hh2}:${mm2}`;
  }

  // -------------------- Create Modal (empty-slot) --------------------
  let createModalEl = null;
  function ensureCreateModal(){
    if (createModalEl) return createModalEl;
    const el = document.createElement('div');
    el.className = 'cal-mini-modal hidden';
    el.innerHTML = `
      <div class="cal-mm-backdrop"></div>
      <div class="cal-mm-card">
        <header><div>Create appointment</div><button type="button" class="cal-mm-close">×</button></header>
        <form class="cal-mm-body">
          <div class="cal-mm-row">
            <label>Date <input type="date" name="date" required></label>
            <label>Type <input type="text" name="type" placeholder="Consultation"></label>
          </div>
          <div class="cal-mm-row">
            <label>From <input type="time" name="from" required></label>
            <label>To <input type="time" name="to" required></label>
          </div>
          <div class="cal-mm-row">
            <label>Doctor
              <select name="doctorId" required class="cal-mm-list"><option value="">Loading…</option></select>
            </label>
            <label>Room
              <select name="roomId" required class="cal-mm-list"><option value="">Loading…</option></select>
            </label>
          </div>
          <label>Patient
            <div class="cal-mm-row">
              <input type="text" name="psearch" placeholder="Search by name/phone…">
              <select name="patientId" required class="cal-mm-list">
                <option value="">Select patient…</option>
              </select>
            </div>
          </label>
          <label>Summary <input type="text" name="summary" placeholder="Summary (optional)"></label>
          <label>Comment <textarea name="comment" rows="2" placeholder="Notes…"></textarea></label>
          <div class="cal-mm-actions">
            <div class="cal-mm-msg"></div>
            <button type="button" class="btn-secondary cal-mm-cancel">Cancel</button>
            <button type="submit" class="btn-primary">Create</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);
    createModalEl = el;

    const close = () => { el.classList.add('hidden'); };
    el.querySelector('.cal-mm-backdrop').addEventListener('click', close);
    el.querySelector('.cal-mm-close').addEventListener('click', close);
    el.querySelector('.cal-mm-cancel').addEventListener('click', close);
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Populate doctors/rooms when opened
    el.addEventListener('open-create', async () => {
      const f = el.querySelector('form');
      const docSel  = f.querySelector('[name="doctorId"]');
      const roomSel = f.querySelector('[name="roomId"]');
      if (!doctorOptions.length) doctorOptions = await loadDoctors();
      if (!roomResources.length) roomResources = await loadRooms();
      docSel.innerHTML  = `<option value="">Select doctor…</option>` + doctorOptions.map(d => `<option value="${d.id}">${escapeHtml(d.name||('Doctor '+d.id))}</option>`).join('');
      roomSel.innerHTML = `<option value="">Select room…</option>` + roomResources.map(r => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join('');
    });

    // Patient search
    async function searchPatients(q){
      try{
        const url = `${API_BASE}/patients.php?list=1&q=${encodeURIComponent(q||'')}`;
        const res = await fetch(url, { headers: { 'Content-Type':'application/json', ...authHeaders() } });
        const j = await res.json().catch(()=>({}));
        const arr = j?.patients || [];
        return arr.map(p => ({ id:String(p.id), name: p.name || '' }));
      }catch{ return []; }
    }
    const f = el.querySelector('form');
    const pInput = f.querySelector('[name="psearch"]');
    const pSel   = f.querySelector('[name="patientId"]');

    async function refillPatients(q){
      const list = await searchPatients(q);
      pSel.innerHTML = `<option value="">Select patient…</option>` + list.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (#${p.id})</option>`).join('');
    }
    pInput.addEventListener('input', () => { const q=pInput.value.trim(); refillPatients(q); });
    // initial
    refillPatients('');

    // Submit create
    f.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(f);
      const payload = {
        patientId: Number(fd.get('patientId') || 0),
        doctorId:  Number(fd.get('doctorId')  || 0),
        roomId:    Number(fd.get('roomId')    || 0),
        date:      String(fd.get('date') || ''),
        from_time: String(fd.get('from') || ''),
        to_time:   String(fd.get('to')   || ''),
        type:      (String(fd.get('type') || 'Consultation')).trim() || 'Consultation',
        summary:   String(fd.get('summary') || ''),
        comment:   String(fd.get('comment') || '')
      };
      const msg = el.querySelector('.cal-mm-msg');
      msg.textContent = 'Creating…';
      try{
        const res = await fetch(`${API_BASE}/appointment_create.php`, {
          method:'POST',
          headers: { 'Content-Type':'application/json', ...authHeaders() },
          body: JSON.stringify(payload)
        });
        const j = await res.json().catch(()=>({}));
        if (res.status === 409) { msg.textContent = j?.error || 'Time conflict'; return; }
        if (!res.ok || j.ok !== true) { msg.textContent = j?.error || 'Create failed'; return; }
        msg.textContent = 'Created.';
        setTimeout(()=>{ el.classList.add('hidden'); calendar.refetchEvents(); }, 250);
      }catch(err){ msg.textContent = 'Network error'; }
    });

    return el;
  }
  function openCreateModalAt(dateStr, timeStr){
    const el = ensureCreateModal();
    const f  = el.querySelector('form');
    const d  = dateStr || new Date().toISOString().slice(0,10);
    const t  = timeStr || '09:00:00';
    const from = t.slice(0,5);
    // default +30 minutes
    const [hh, mm] = from.split(':').map(n=>parseInt(n,10));
    const end = new Date(`${d}T${from}:00`);
    end.setMinutes(end.getMinutes()+30);
    const to = `${two(end.getHours())}:${two(end.getMinutes())}`;

    f.querySelector('[name="date"]').value = d;
    f.querySelector('[name="from"]').value = from;
    f.querySelector('[name="to"]').value   = to;
    f.querySelector('[name="type"]').value = 'Consultation';
    f.querySelector('[name="summary"]').value = '';
    f.querySelector('[name="comment"]').value = '';
    f.querySelector('[name="patientId"]').value = '';
    f.querySelector('[name="psearch"]').value   = '';

    el.classList.remove('hidden');
    el.dispatchEvent(new CustomEvent('open-create'));
  }

  // -------------------- Context Menu --------------------
  let ctxMenuEl = null;
  function closeCtxMenu() { if (ctxMenuEl) ctxMenuEl.remove(); ctxMenuEl = null; }
  function positionCard(card, x, y){
    const pad = 8; let left = x + 2, top = y + 2;
    requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      if (left + r.width > window.innerWidth - pad) left = window.innerWidth - r.width - pad;
      if (top + r.height > window.innerHeight - pad) top = window.innerHeight - r.height - pad;
      card.style.left = `${left}px`; card.style.top = `${top}px`;
    });
  }

  function openCtxMenuForEvent(calendar, e, ev) {
    closeCtxMenu();
    const uiStatus = dbToUiStatus(ev.extendedProps?.status);
    const items = [];
    if (uiStatus === 'scheduled') {
      items.push({ key:'check-in', label:'Check in' });
    } else if (uiStatus === 'checked in') {
      items.push({ key:'cancel-check-in', label:'Cancel check in' });
      items.push({ key:'check-out', label:'Check out' });
    } else if (uiStatus === 'checked out') {
      items.push({ key:'cancel-check-out', label:'Cancel check out' });
    }
    items.push({ key:'edit', label:'Edit appointment…' });
    items.push({ key:'cancel', label:'Cancel appointment', danger:true });

    const wrapper = document.createElement('div');
    wrapper.className = 'cal-ctx';
    wrapper.innerHTML = `<div class="cal-ctx-card">
      ${items.map(it => `<button class="cal-ctx-item${it.danger?' danger':''}" data-key="${it.key}">${it.label}</button>`).join('')}
    </div>`;
    document.body.appendChild(wrapper); ctxMenuEl = wrapper;

    positionCard(wrapper.querySelector('.cal-ctx-card'), e.clientX, e.clientY);

    const closer = (ev2) => { if (!wrapper.contains(ev2.target)) { closeCtxMenu(); cleanup(); } };
    const esc    = (ev2) => { if (ev2.key === 'Escape') { closeCtxMenu(); cleanup(); } };
    function cleanup(){ document.removeEventListener('mousedown', closer, true); document.removeEventListener('keydown', esc, true); }
    setTimeout(()=>{ document.addEventListener('mousedown', closer, true); document.addEventListener('keydown', esc, true); }, 0);

    wrapper.querySelectorAll('.cal-ctx-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        try {
          if (key === 'check-in')             { await changeStatus(ev.id, 'checked in');  toast('Marked as checked in', true); calendar.refetchEvents(); }
          else if (key === 'cancel-check-in') { await changeStatus(ev.id, 'scheduled');   toast('Check in canceled', true);   calendar.refetchEvents(); }
          else if (key === 'check-out')       { await changeStatus(ev.id, 'checked out'); toast('Marked as checked out', true); calendar.refetchEvents(); }
          else if (key === 'cancel-check-out'){ await changeStatus(ev.id, 'checked in');  toast('Checkout canceled', true);   calendar.refetchEvents(); }
          else if (key === 'edit')            { openEditModalForEvent(ev); }
          else if (key === 'cancel')          {
            if (!confirm('Cancel this appointment?')) return;
            await cancelAppointment(ev.id);
            toast('Appointment canceled', true);
            location.href = '/medical_clinic/public/html/waitlist.html';
            return;
          }
        } catch (err) { toast(err.message || 'Action failed'); }
        finally { closeCtxMenu(); }
      });
    });
  }

  // -------------------- Calendar init --------------------
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    height: 'parent',
    initialView: 'timeGridWeek',
    nowIndicator: true,
    editable: true,
    selectable: false,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    eventTimeFormat:   { hour: '2-digit', minute: '2-digit', hour12: false },
    slotMinTime:       '07:00:00',
    slotMaxTime:       '22:00:00',
    slotDuration:      '00:10:00',
    snapDuration:      '00:15:00',
    slotLabelInterval: '00:15:00',
    slotLabelFormat:   { hour: '2-digit', minute: '2-digit', hour12: false },
    expandRows:        true,

    eventSources: [{ events: fetchEvents }],

    eventDrop:   async (info) => { const ok = await moveOrResize(calendar, info.event.id, info.event.start, info.event.end); if (!ok) info.revert(); },
    eventResize: async (info) => { const ok = await moveOrResize(calendar, info.event.id, info.event.start, info.event.end); if (!ok) info.revert(); },

eventClassNames: (arg) => {
  const raw = String(arg.event.extendedProps?.status || '').toLowerCase().trim();
  // Accept BOTH DB-side and UI-side status strings
  if (raw === 'rescheduled' || raw === 'checked in' || raw === 'checked-in') {
    return ['ev-checked-in'];
  }
  if (raw === 'completed' || raw === 'checked out' || raw === 'checked-out') {
    return ['ev-checked-out'];
  }
  if (raw === 'canceled' || raw === 'cancelled') {
    return ['ev-canceled'];
  }
  return ['ev-scheduled'];
},

    eventDidMount: (arg) => {
      const patient = arg.event.title || '';
      const timeTxt = arg.timeText || formatRange(arg.event.start, arg.event.end);
      const room = (() => {
        const xp = arg.event.extendedProps || {};
        const rid = xp.roomId || xp.roomID || arg.event.getResources?.()[0]?.id;
        const resArr = (arg.event.getResources?.() || []);
        if (resArr.length && resArr[0]?.title) return resArr[0].title;
        const name = xp.roomName || xp.room || '';
        if (!rid && !name) return '';
        const title = roomTitleById(rid || '');
        return title || (name ? `Room — ${name}` : '');
      })();
      const docLbl  = doctorLabel(arg.event.extendedProps?.doctor || '');
      arg.el.title = [patient, timeTxt, room, docLbl].filter(Boolean).join(', ');

      // Right-click on event (capture to beat FC handlers)
      arg.el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        openCtxMenuForEvent(calendar, e, arg.event);
        return false;
      }, { capture: true });
    },

    eventContent: (arg) => {
      const patient = arg.event.title || '';
      const timeTxt = arg.timeText || formatRange(arg.event.start, arg.event.end);
      const xp = arg.event.extendedProps || {};
      const roomLbl = (() => {
        const rid = xp.roomId || xp.roomID || arg.event.getResources?.()[0]?.id;
        const resArr = (arg.event.getResources?.() || []);
        if (resArr.length && resArr[0]?.title) return resArr[0].title;
        const name = xp.roomName || xp.room || '';
        if (!rid && !name) return '';
        const title = roomTitleById(rid || '');
        return title || (name ? `Room — ${name}` : '');
      })();
      const docLbl  = doctorLabel(xp.doctor || '');
      const details = [timeTxt, roomLbl, docLbl].filter(Boolean).join(', ');
      const html = `
        <div class="fc-event-main-custom">
          ${patient ? `<div class="fc-ev-patient">${escapeHtml(patient)}</div>` : ''}
          <div class="fc-ev-details">${escapeHtml(details)}</div>
        </div>`;
      return { html };
    }
  });

  calendar.render();
  setTimeout(() => calendar.updateSize(), 0);
  window.addEventListener('resize', () => calendar.updateSize());

  // -------------------- EMPTY-SLOT right-click (capture-level, works in all views) --------------------
  calendarEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.fc-event')) return;

    let date = '';
    let time = '';
    const col = e.target.closest('.fc-timegrid-col');
    const row = e.target.closest('.fc-timegrid-slot');
    if (col) date = col.getAttribute('data-date') || col.dataset?.date || '';
    if (row) time = row.getAttribute('data-time') || row.dataset?.time || '';

    if (!date) {
      const day = e.target.closest('.fc-daygrid-day');
      if (day) {
        date = day.getAttribute('data-date') || day.dataset?.date || '';
        time = '09:00:00';
      }
    }

    if (!date) return;

    e.preventDefault();
    e.stopPropagation();

    openCtxMenuForEmpty(calendar, e, date, time);
  }, { capture: true });

  // Empty-slot menu → Create
  function openCtxMenuForEmpty(calendar, e, dateStr, timeStr){
    closeCtxMenu();
    const wrapper = document.createElement('div');
    wrapper.className = 'cal-ctx';
    wrapper.innerHTML = `<div class="cal-ctx-card">
      <button class="cal-ctx-item" data-key="create">Create appointment…</button>
    </div>`;
    document.body.appendChild(wrapper); ctxMenuEl = wrapper;
    positionCard(wrapper.querySelector('.cal-ctx-card'), e.clientX, e.clientY);

    const closer = (ev) => { if (!wrapper.contains(ev.target)) { closeCtxMenu(); cleanup(); } };
    const esc    = (ev) => { if (ev.key === 'Escape') { closeCtxMenu(); cleanup(); } };
    function cleanup(){ document.removeEventListener('mousedown', closer, true); document.removeEventListener('keydown', esc, true); }
    setTimeout(()=>{ document.addEventListener('mousedown', closer, true); document.addEventListener('keydown', esc, true); }, 0);

    wrapper.querySelector('[data-key="create"]').addEventListener('click', () => {
      closeCtxMenu();
      openCreateModalAt(dateStr, timeStr);
    });
  }

  // -------------------- Topbar buttons --------------------
  document.getElementById('todayBtn')?.addEventListener('click', () => calendar.today());
  document.getElementById('weekBtn')?.addEventListener('click', () => calendar.changeView('timeGridWeek'));
  document.getElementById('dayBtn')?.addEventListener('click', async () => {
    try {
      if (!hasScheduler()) {
        const ok = await loadSchedulerPlugins();
        if (!ok) throw new Error('Scheduler plugins not available');
      }
      calendar.setOption('schedulerLicenseKey', 'GPL-My-Project-Is-Open-Source');
      if (!roomResources.length) roomResources = await loadRooms();
      const provider = () => {
        if (!selectedRoomId) return roomResources;
        const r = roomResources.find(r => r.id === selectedRoomId);
        return r ? [r] : [];
      };
      calendar.setOption('resources', provider);
      if (typeof calendar.refetchResources === 'function') calendar.refetchResources();
      calendar.changeView('resourceTimeGridDay');
      setTimeout(() => calendar.updateSize(), 0);
    } catch (e) {
      console.warn('Falling back to normal day view:', e);
      calendar.changeView('timeGridDay'); setTimeout(() => calendar.updateSize(), 0);
    }
  });

  insertFiltersUI(calendar);
})();
