(function () {
  const API_LIST = 'http://localhost/medical_clinic/api/appointments.php';
  const API_DOCS = 'http://localhost/medical_clinic/api/doctors.php';
  const API_EDIT = 'http://localhost/medical_clinic/api/appointment_update.php';

  const dateInput = document.getElementById('dateInput');
  const searchInput = document.getElementById('searchInput');
  const statusSel = document.getElementById('statusFilter');
  const typeSel = document.getElementById('typeFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const tbody = document.getElementById('apptBody');
  const table = document.getElementById('apptTable');
  const statusMsg = document.getElementById('statusMsg');

  // Modal elements
  const modal = document.getElementById('editModal');
  const editId = document.getElementById('editId');
  const editDate = document.getElementById('editDate');
  const editFrom = document.getElementById('editFrom');
  const editTo = document.getElementById('editTo');
  const editDoc = document.getElementById('editDoctor');
  const editRoom = document.getElementById('editRoom');
  const editSum = document.getElementById('editSummary');
  const editCom = document.getElementById('editComment');
  const editMsg = document.getElementById('editMsg');
  const editClose = document.getElementById('editClose');
  const editCancel = document.getElementById('editCancel');
  const editForm = document.getElementById('editForm');

  // Auth gate
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { window.location.href = '/medical_clinic/public/html/login.html'; return; }

  // Load and persist date & filters
  const savedDate = localStorage.getItem('lastAppointmentsDate');
  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.value = savedDate || todayStr;

  const savedFilters = JSON.parse(localStorage.getItem('apptFilters') || '{}');
  if (savedFilters.q) searchInput.value = savedFilters.q;
  if (savedFilters.status) statusSel.value = savedFilters.status;
  if (savedFilters.type) typeSel.value = savedFilters.type;

  dateInput.addEventListener('change', () => {
    localStorage.setItem('lastAppointmentsDate', dateInput.value);
    load();
  });

  function saveFilters() {
    localStorage.setItem('apptFilters', JSON.stringify({
      q: searchInput.value.trim(),
      status: statusSel.value,
      type: typeSel.value
    }));
  }

  searchInput.addEventListener('input', debounce(() => { saveFilters(); load(); }, 300));
  statusSel.addEventListener('change', () => { saveFilters(); load(); });
  typeSel.addEventListener('change', () => { saveFilters(); load(); });
  refreshBtn.addEventListener('click', load);

  // Doctor & room cache
  let doctorsCache = [];
  let roomsCache = [];

async function loadDoctors() {
  try {
    const res = await fetch(`${API_DOCS}?list=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load doctors');
    const data = await res.json();
    doctorsCache = data.doctors || [];

    // ✅ use the clean "name" field returned by the API
    editDoc.innerHTML = doctorsCache.map(d =>
      `<option value="${d.id}">${escapeHtml(d.name)}</option>`
    ).join('');
  } catch (e) {
    console.error('Error loading doctors:', e);
    editDoc.innerHTML = `<option value="">(no doctors)</option>`;
  }
}



  async function loadRooms() {
    try {
      const res = await fetch('http://localhost/medical_clinic/api/rooms.php?list=1', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load rooms');
      const data = await res.json();
      roomsCache = data.rooms || [];
      editRoom.innerHTML = roomsCache.map(r => `<option value="${r.id}">${escapeHtml(r.id + ' - ' + r.type)}</option>`).join('');
    } catch (e) {
      console.error(e);
      editRoom.innerHTML = `<option value="">(no rooms)</option>`;
    }
  }

  async function load() {
    statusMsg.textContent = 'Loading…';
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Loading…</td></tr>`;

    const params = new URLSearchParams({
      date: dateInput.value,
      q: searchInput.value.trim(),
      status: statusSel.value,
      type: typeSel.value
    });

    try {
      const res = await fetch(`${API_LIST}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        statusMsg.textContent = 'Session expired. Please sign in again.';
        setTimeout(() => (window.location.href = '/medical_clinic/public/html/login.html'), 900);
        return;
      }

      const data = await res.json();
      renderTable(data?.appointments || []);
      statusMsg.textContent = `${(data?.appointments || []).length} appointment(s) on ${dateInput.value}`;
    } catch (err) {
      console.error(err);
      statusMsg.textContent = 'Failed to load appointments.';
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Error loading data</td></tr>`;
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">No appointments</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.from_time}–${r.to_time}</td>
        <td>${escapeHtml(r.patient_name)}</td>
        <td>${escapeHtml(r.doctor_name)}</td>
        <td>${escapeHtml(r.room || '')}</td>
        <td>${escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${cssSafe(r.status)}">${escapeHtml(r.status)}</span></td>
        <td>${escapeHtml(r.summary || '')}</td>
        <td>${escapeHtml(r.comment || '')}</td>
        <td><button class="small-btn js-edit">Edit</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.js-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const id = tr.getAttribute('data-id');
        await openEdit(id, tr);
      });
    });
  }

  async function openEdit(id, tr) {
    if (!doctorsCache.length) await loadDoctors();
    if (!roomsCache.length) await loadRooms();

    const timeText = tr.children[0].textContent.trim();
    const [from, to] = timeText.split('–');
    const doctorName = tr.children[2].textContent.trim();
    const roomNum = tr.children[3].textContent.trim();

    const foundDoc = doctorsCache.find(d => d.name === doctorName);
    const foundRoom = roomsCache.find(r => String(r.id) === roomNum);

    editId.value = id;
    editDate.value = dateInput.value;
    editFrom.value = from || '09:00';
    editTo.value = to || '09:30';
    editDoc.value = (foundDoc && foundDoc.id) || '';
    editRoom.value = (foundRoom && foundRoom.id) || '';
    editSum.value = tr.children[6].textContent.trim();
    editCom.value = tr.children[7].textContent.trim();
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

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = 'Saving…';

    const payload = {
      id: Number(editId.value),
      date: editDate.value,
      from_time: editFrom.value,
      to_time: editTo.value,
      doctorId: Number(editDoc.value),
      roomId: Number(editRoom.value),
      summary: editSum.value.trim(),
      comment: editCom.value.trim()
    };

    try {
      const res = await fetch(API_EDIT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      editMsg.textContent = 'Saved!';
      showModal(false);
      load();
    } catch (err) {
      console.error(err);
      editMsg.textContent = err.message || 'Error saving';
    }
  });

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function cssSafe(s) { return String(s).replace(/\s+/g, '-'); }

  load();
})();
