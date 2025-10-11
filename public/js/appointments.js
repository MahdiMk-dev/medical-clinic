(function () {
  // --- API endpoints ---
  const API_BASE   = '/medical_clinic/api';
  const API_LIST   = `${API_BASE}/appointments.php`;
  const API_DOCS   = `${API_BASE}/doctors.php`;
  const API_ROOMS  = `${API_BASE}/rooms.php`;
  const API_EDIT   = `${API_BASE}/appointment_update.php`;
  const API_CANCEL = `${API_BASE}/appointment_cancel.php`;
  const API_STATUS = `${API_BASE}/appointment_status.php`;

  // --- Elements ---
  const dateInput   = document.getElementById('dateInput');
  const searchInput = document.getElementById('searchInput');
  const statusSel   = document.getElementById('statusFilter');
  const typeSel     = document.getElementById('typeFilter');
  const refreshBtn  = document.getElementById('refreshBtn');

  const table   = document.getElementById('apptTable');
  const tbody   = document.getElementById('apptBody');
  const statusMsg = document.getElementById('statusMsg');

  // Modal
  const modal      = document.getElementById('editModal');
  const editForm   = document.getElementById('editForm');
  const editClose  = document.getElementById('editClose');
  const editCancel = document.getElementById('editCancel');
  const editMsg    = document.getElementById('editMsg');

  const editId     = document.getElementById('editId');
  const editDate   = document.getElementById('editDate');
  const editFrom   = document.getElementById('editFrom');
  const editTo     = document.getElementById('editTo');
  const editDoc    = document.getElementById('editDoctor');
  const editRoom   = document.getElementById('editRoom');
  const editSum    = document.getElementById('editSummary');
  const editCom    = document.getElementById('editComment');

  // --- Auth gate ---
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { window.location.href = '/medical_clinic/public/html/login.html'; return; }

  // --- Local caches ---
  let doctorsCache = [];
  let roomsCache   = [];

  // --- UI/DB status mapping - DISPLAY ONLY ---
  // DB -> UI (for display and row color)
  function dbToUiStatus(dbStatus) {
    const s = String(dbStatus || '').toLowerCase();
    if (s === 'rescheduled') return 'checked in';
    if (s === 'completed')   return 'checked out';
    return s || 'scheduled';
  }

  // Actions per UI status (includes the new "Cancel checkout")
  function statusButtons(uiStatus) {
    const s = String(uiStatus || '').toLowerCase();
    if (s === 'scheduled') {
      return `<button class="btn-link status-checkin" title="Mark as checked in">Check in</button>`;
    }
    if (s === 'checked in') {
      return `
        <button class="btn-link status-checkout" title="Mark as checked out">Check out</button>
        <button class="btn-link status-cancel-checkin" title="Revert to scheduled">Cancel check in</button>
      `;
    }
    if (s === 'checked out') {
      return `
        <button class="btn-link status-cancel-checkout" title="Revert to checked in">Cancel checkout</button>
      `;
    }
    return ``;
  }

  // --- Helpers ---
  function setLoading(message) {
    statusMsg.textContent = message || 'Loading…';
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Loading…</td></tr>`;
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function cssSafe(s) { return String(s||'').trim().replace(/\s+/g, '-').toLowerCase(); }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  async function loadDoctors() {
    const res = await fetch(`${API_DOCS}?list=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to load doctors');
    const data = await res.json();
    doctorsCache = data?.doctors || [];
    editDoc.innerHTML = `<option value="">Select doctor…</option>` + doctorsCache.map(d =>
      `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }

  async function loadRooms() {
    const res = await fetch(`${API_ROOMS}?list=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to load rooms');
    const data = await res.json();
    roomsCache = data?.rooms || [];
    editRoom.innerHTML = `<option value="">Select room…</option>` + roomsCache.map(r =>
      `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  }

  async function fetchList() {
    const params = new URLSearchParams({
      date:   dateInput.value,
      q:      searchInput.value.trim(),
      status: statusSel.value,
      type:   typeSel.value
    });
    const res = await fetch(`${API_LIST}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      statusMsg.textContent = 'Session expired. Please sign in again.';
      setTimeout(() => (window.location.href = '/medical_clinic/public/html/login.html'), 900);
      return [];
    }
    const data = await res.json().catch(()=>({}));
    const all  = data?.appointments || [];
    return all.filter(a => !/^cancelled?$/i.test(String(a.status||'')));
  }

  function renderTable(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">No appointments</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const uiStatus = dbToUiStatus(r.status);
      const rowClass = `status-${cssSafe(uiStatus)}`;
      return `
      <tr data-id="${r.id}" class="${rowClass}">
        <td>${escapeHtml((r.from_time||'') + '–' + (r.to_time||''))}</td>
        <td>${escapeHtml(r.patient_name || '')}</td>
        <td>${escapeHtml(r.doctor_name  || '')}</td>
        <td>${escapeHtml(r.room_name || r.room || '')}</td>
        <td>${escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${cssSafe(uiStatus)}">${escapeHtml(uiStatus)}</span></td>
        <td>${escapeHtml(r.summary || '')}</td>
        <td>${escapeHtml(r.comment || '')}</td>
<td class="col-actions">
  <div class="row-actions">
    ${statusButtons(uiStatus)}
    <button class="btn-link edit">Edit</button>
    <button class="btn-link danger cancel">Cancel</button>
  </div>
</td>
      </tr>
    `;
    }).join('');
  }

  // --- Status updates ---
  async function updateStatus(id, nextUiStatus) {
    const res = await fetch(API_STATUS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: nextUiStatus })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Status update failed');
  }

  // --- Row actions / modal ---
  function showModal(show) {
    if (show) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    } else {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function openEdit(tr) {
    const id = tr.getAttribute('data-id');
    if (!id) return;

    if (!doctorsCache.length) await loadDoctors();
    if (!roomsCache.length)   await loadRooms();

    const timeText   = tr.children[0].textContent.trim();
    const [from, to] = timeText.split('–');
    const doctorName = tr.children[2].textContent.trim();

    const roomText   = tr.children[3].textContent.trim();
    const roomIdMatch = roomText.match(/(\d+)/);
    const roomNum    = roomIdMatch ? roomIdMatch[1] : roomText;

    const foundDoc  = doctorsCache.find(d => d.name === doctorName);
    const foundRoom = roomsCache.find(r => String(r.id) === String(roomNum));

    editId.value   = id;
    editDate.value = dateInput.value;
    editFrom.value = (from || '').trim() || '09:00';
    editTo.value   = (to   || '').trim() || '09:30';
    editDoc.value  = (foundDoc && foundDoc.id) || '';
    editRoom.value = (foundRoom && foundRoom.id) || '';
    editSum.value  = tr.children[6].textContent.trim();
    editCom.value  = tr.children[7].textContent.trim();

    editMsg.textContent = '';
    showModal(true);
  }

  async function cancelAppointment(id) {
    const res = await fetch(API_CANCEL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Cancel failed');
  }

  async function load() {
    setLoading('Loading…');
    const savedDate = localStorage.getItem('lastAppointmentsDate');
    const todayStr  = new Date().toISOString().slice(0, 10);
    if (!dateInput.value) dateInput.value = savedDate || todayStr;

    try {
      if (!doctorsCache.length) await loadDoctors();
      if (!roomsCache.length)   await loadRooms();

      const rows = await fetchList();
      renderTable(rows);
      statusMsg.textContent = `${rows.length} appointment(s) on ${dateInput.value}`;
    } catch (err) {
      console.error(err);
      statusMsg.textContent = 'Failed to load appointments.';
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Error loading data</td></tr>`;
    }
  }

  // --- Events ---
  function saveFilters() {
    try { localStorage.setItem('lastAppointmentsDate', dateInput.value); } catch(e){}
  }

  dateInput.addEventListener('change', () => { saveFilters(); load(); });
  searchInput.addEventListener('input', debounce(() => load(), 300));
  statusSel.addEventListener('change', () => load());
  typeSel.addEventListener('change', () => load());
  if (refreshBtn) refreshBtn.addEventListener('click', () => load());

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');

    try {
      if (btn.classList.contains('edit')) {
        openEdit(tr);
        return;
      }
      if (btn.classList.contains('cancel')) {
        if (!confirm('Cancel this appointment?')) return;
        await cancelAppointment(id);
        return load();
      }
      if (btn.classList.contains('status-checkin')) {
        await updateStatus(id, 'checked in');           // UI intent → server maps to DB 'rescheduled'
        return load();
      }
      if (btn.classList.contains('status-checkout')) {
        await updateStatus(id, 'checked out');          // UI intent → server maps to DB 'completed'
        return load();
      }
      if (btn.classList.contains('status-cancel-checkin')) {
        await updateStatus(id, 'scheduled');            // back to scheduled
        return load();
      }
      if (btn.classList.contains('status-cancel-checkout')) {
        await updateStatus(id, 'checked in');           // checked out -> checked in
        return load();
      }
    } catch (err) {
      alert('Action failed: ' + (err.message || err));
    }
  });

  [editClose, editCancel].forEach(b => b && b.addEventListener('click', () => showModal(false)));

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = 'Saving…';

    const payload = {
      id: editId.value,
      date: editDate.value,
      from: editFrom.value,
      to: editTo.value,
      doctor_id: editDoc.value || null,
      room_id:   editRoom.value || null,
      summary:   editSum.value || '',
      comment:   editCom.value || ''
    };

    try {
      const res = await fetch(API_EDIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Update failed');
      editMsg.textContent = 'Saved.';
      setTimeout(() => { showModal(false); load(); }, 300);
    } catch (err) {
      console.error(err);
      editMsg.textContent = 'Failed to save changes.';
    }
  });

  (function init() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', () => {
      localStorage.removeItem('token'); sessionStorage.removeItem('token');
      window.location.href = '/medical_clinic/public/html/login.html';
    });

    const savedDate = localStorage.getItem('lastAppointmentsDate');
    const todayStr  = new Date().toISOString().slice(0, 10);
    if (!dateInput.value) dateInput.value = savedDate || todayStr;

    load();
  })();
})();
