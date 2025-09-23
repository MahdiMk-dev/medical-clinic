(function () {
  // === CONFIG: make sure these URLs match your local setup ===
  const API_LIST  = 'http://localhost/medical_clinic/api/appointments.php';
  const API_DOCS  = 'http://localhost/medical_clinic/api/doctors.php';
  const API_ROOMS = 'http://localhost/medical_clinic/api/rooms.php';
  const API_EDIT  = 'http://localhost/medical_clinic/api/appointment_update.php';

  // === SAFE DOM GET ===
  function $id(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing DOM element #${id}`);
    return el;
  }

  // Try to bind DOM. If anything is missing, show a helpful error in console and bail.
  let dateInput, searchInput, statusSel, typeSel, refreshBtn, tbody, table, statusMsg;
  let modal, editId, editDate, editFrom, editTo, editDoc, editRoom, editSum, editCom, editMsg, editClose, editCancel, editForm;

  try {
    dateInput   = $id('dateInput');
    searchInput = $id('searchInput');
    statusSel   = $id('statusFilter');
    typeSel     = $id('typeFilter');
    refreshBtn  = $id('refreshBtn');
    tbody       = $id('apptBody');
    table       = $id('apptTable');
    statusMsg   = $id('statusMsg');

    modal     = $id('editModal');
    editId    = $id('editId');
    editDate  = $id('editDate');
    editFrom  = $id('editFrom');
    editTo    = $id('editTo');
    editDoc   = $id('editDoctor');
    editRoom  = $id('editRoom');
    editSum   = $id('editSummary');
    editCom   = $id('editComment');
    editMsg   = $id('editMsg');
    editClose = $id('editClose');
    editCancel= $id('editCancel');
    editForm  = $id('editForm');
  } catch (domErr) {
    console.error(domErr);
    return; // HTML is missing required elements – stop here
  }

  // === AUTH GATE ===
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.warn('No token found; redirecting to login.');
    window.location.href = '/medical_clinic/public/html/login.html';
    return;
  }

  // === STATE ===
  let sortBy = 'time';
  let sortDir = 'asc';
  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.value = todayStr;

  // Lookup caches
  let doctorsCache = [];
  let roomsCache   = [];

  // === HELPERS ===
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function cssSafe(s) { return String(s).replace(/\s+/g, '-'); }

  async function apiGet(url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    return data;
  }

  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    return data;
  }

  // === LOAD LOOKUPS ===
  async function loadDoctors() {
    try {
      const data = await apiGet(`${API_DOCS}`);
      doctorsCache = Array.isArray(data?.doctors) ? data.doctors : [];
      editDoc.innerHTML = doctorsCache.length
        ? doctorsCache.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')
        : `<option value="">(no doctors)</option>`;
    } catch (e) {
      console.error('Doctors load failed:', e);
      editDoc.innerHTML = `<option value="">(no doctors)</option>`;
    }
  }

  async function loadRooms() {
    try {
      const data = await apiGet(`${API_ROOMS}`);
      roomsCache = Array.isArray(data?.rooms) ? data.rooms : [];
      editRoom.innerHTML = roomsCache.length
        ? roomsCache.map(r => `<option value="${r.id}">Room ${r.id}${r.type ? ' — ' + escapeHtml(r.type) : ''}</option>`).join('')
        : `<option value="">(no rooms)</option>`;
    } catch (e) {
      console.error('Rooms load failed:', e);
      editRoom.innerHTML = `<option value="">(no rooms)</option>`;
    }
  }

  async function ensureLookupsLoaded() {
    if (!doctorsCache.length) await loadDoctors();
    if (!roomsCache.length)   await loadRooms();
  }

  // === LOAD TABLE ===
  async function load() {
    statusMsg.textContent = 'Loading…';
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Loading…</td></tr>`;

    const params = new URLSearchParams({
      date: dateInput.value,
      q: searchInput.value.trim(),
      status: statusSel.value,
      type: typeSel.value,
      sort_by: sortBy,
      sort_dir: sortDir
    });

    try {
      const data = await apiGet(`${API_LIST}?${params.toString()}`);
      const rows = Array.isArray(data?.appointments) ? data.appointments : [];
      renderTable(rows);
      statusMsg.textContent = `${rows.length} appointment(s) on ${dateInput.value}`;
    } catch (err) {
      console.error('Appointments load failed:', err);
      statusMsg.textContent = err.message || 'Failed to load appointments.';
      tbody.innerHTML = `<tr><td colspan="8" class="empty">Unable to load data</td></tr>`;
      // if unauthorized, redirect to login
      if ((err.message || '').includes('401')) {
        setTimeout(() => { window.location.href = '/medical_clinic/public/html/login.html'; }, 900);
      }
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty">No appointments</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.time || ''}</td>
        <td>${escapeHtml(r.patient_name || '')}</td>
        <td>${escapeHtml(r.doctor_name || '')}</td>
        <td>${escapeHtml(r.room ?? '')}</td>
        <td>${escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${cssSafe(r.status || '')}">${escapeHtml(r.status || '')}</span></td>
        <td>${escapeHtml(r.summary || '')}</td>
        <td>
          <button class="small-btn js-edit">Edit</button>
        </td>
      </tr>
    `).join('');

    // bind edit buttons
    tbody.querySelectorAll('.js-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = tr.getAttribute('data-id');
        await openEdit(id, tr);
      });
    });
  }

  // === EDIT MODAL ===
  async function openEdit(id, tr) {
    await ensureLookupsLoaded();

    // Guard: table must have expected columns
    if (tr.children.length < 7) {
      console.warn('Unexpected table structure; cannot open editor.');
      return;
    }

    // Pull current values from row text
    const timeText   = (tr.children[0].textContent || '').trim(); // "09:00–09:30"
    const [from, to] = timeText.split('–');
    const doctorName = (tr.children[2].textContent || '').trim();
    const roomText   = (tr.children[3].textContent || '').trim(); // we display room id as text

    // Find matching doctor/room from caches
    const foundDoc  = doctorsCache.find(d => d.name === doctorName);
    const foundRoom = roomsCache.find(r => String(r.id) === roomText);

    // Prefill (leave blank values as '' so backend COALESCE can keep old when empty)
    editId.value   = id;
    editDate.value = $id('dateInput').value || '';
    editFrom.value = from || '';
    editTo.value   = to   || '';
    editDoc.value  = (foundDoc?.id || doctorsCache[0]?.id || '');
    editRoom.value = (foundRoom?.id || roomsCache[0]?.id   || '');
    editSum.value  = (tr.children[6].textContent || '').trim();
    editCom.value  = '';

    editMsg.textContent = '';
    showModal(true);
  }

  function showModal(show) {
    if (show) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    } else {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  editClose.addEventListener('click', () => showModal(false));
  editCancel.addEventListener('click', () => showModal(false));
  modal.querySelector('.modal-backdrop').addEventListener('click', () => showModal(false));

  // Save (Option A: send fields; backend COALESCE keeps old if empty/null)
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = 'Saving…';

    const payload = {
      id: Number(editId.value),
      // If blank -> send null (server will COALESCE to keep old)
      date:      editDate.value || null,
      from_time: editFrom.value || null,
      to_time:   editTo.value   || null,
      doctorId:  editDoc.value  ? Number(editDoc.value)  : null,
      roomId:    editRoom.value ? Number(editRoom.value) : null,
      summary:   editSum.value, // empty string -> treated as "keep old" by server code
      comment:   editCom.value
    };

    try {
      const data = await apiPost(API_EDIT, payload);
      editMsg.textContent = 'Saved!';
      showModal(false);
      load();
    } catch (err) {
      console.error('Save failed:', err);
      editMsg.textContent = err.message || 'Error saving';
    }
  });

  // === SORT / FILTER ===
  table.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (key === sortBy) sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
      else { sortBy = key; sortDir = 'asc'; }
      load();
    });
  });

  dateInput.addEventListener('change', load);
  searchInput.addEventListener('input', debounce(load, 300));
  statusSel.addEventListener('change', load);
  typeSel.addEventListener('change', load);
  refreshBtn.addEventListener('click', load);

  // === INITIAL LOAD ===
  load();
})();
