// =====================================================
// BrightCare - Unified JavaScript Application
// All pages, all functionality
// =====================================================

// ===== AUTH GUARD (universal across all pages) =====
(function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const isLoginPage = location.pathname.includes('/login') || location.search.includes('page=login');
  
  if (!token && !isLoginPage) {
    location.href = '/medical_clinic/public/index.php?page=login';
    return;
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      location.href = '/medical_clinic/public/index.php?page=login';
    });
  }
})();

// ===== UTILITY FUNCTIONS (shared across all pages) =====
const AppUtils = {
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  },
  
  authHeaders() {
    const t = this.getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  },
  
  escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  },
  
  cssSafe(s) {
    return String(s || '').trim().replace(/\s+/g, '-').toLowerCase();
  },
  
  debounce(fn, ms) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  },
  
  normalizeTime(s) {
    const m = String(s || '').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    return m ? `${m[1]}:${m[2]}:${m[3] || '00'}` : '';
  },
  
  toISODate(s) {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return '';
  },
  
  toISOTm(s) {
    if (!s) return '';
    const m = String(s).match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  },
  
  toast(msg, ok = false) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.role = 'alert';
    el.className = ok ? 'ok-toast' : 'error-toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }
};

// ===== LOGIN PAGE =====
(function() {
  const form = document.getElementById('loginForm');
  if (!form) return; // not on login page
  
  const msg = document.getElementById('loginMessage');
  const btn = document.getElementById('loginBtn');
  const pwd = document.getElementById('password');
  const toggle = document.querySelector('.toggle-password');

  const API_URL = 'http://localhost/medical_clinic/api/login.php';

  if (toggle && pwd) {
    toggle.addEventListener('click', () => {
      const show = pwd.type === 'password';
      pwd.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      msg.textContent = 'Please enter username and password.';
      return;
    }

    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let data = null;
      const text = await res.text();
      try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

      if (!res.ok) {
        const errMsg = (data && (data.error || data.message)) || `Login failed (HTTP ${res.status})`;
        throw new Error(errMsg);
      }

      if (!data || !data.token) {
        throw new Error('Unexpected response from server.');
      }

      const remember = document.getElementById('remember');
      if (remember && remember.checked) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }

      btn.textContent = 'Success!';
      msg.textContent = 'Logged in. Redirecting...';

      setTimeout(() => {
        window.location.href = '/medical_clinic/public/index.php?page=appointments';
      }, 300);

    } catch (err) {
      console.error(err);
      msg.textContent = err.message || 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });
})();

// ===== APPOINTMENTS PAGE =====
(function() {
  const dateInput = document.getElementById('dateInput');
  if (!dateInput) return; // not on appointments page
  
  const API_BASE = '/medical_clinic/api';
  const API_LIST = `${API_BASE}/appointments.php`;
  const API_DOCS = `${API_BASE}/doctors.php`;
  const API_ROOMS = `${API_BASE}/rooms.php`;
  const API_EDIT = `${API_BASE}/appointment_update.php`;
  const API_CANCEL = `${API_BASE}/appointment_cancel.php`;
  const API_STATUS = `${API_BASE}/appointment_status.php`;

  const token = AppUtils.getToken();
  const searchInput = document.getElementById('searchInput');
  const statusSel = document.getElementById('statusFilter');
  const typeSel = document.getElementById('typeFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const tbody = document.getElementById('apptBody');
  const statusMsg = document.getElementById('statusMsg');

  const modal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editClose = document.getElementById('editClose');
  const editCancel = document.getElementById('editCancel');
  const editMsg = document.getElementById('editMsg');
  const editId = document.getElementById('editId');
  const editDate = document.getElementById('editDate');
  const editFrom = document.getElementById('editFrom');
  const editTo = document.getElementById('editTo');
  const editDoc = document.getElementById('editDoctor');
  const editRoom = document.getElementById('editRoom');
  const editSum = document.getElementById('editSummary');
  const editCom = document.getElementById('editComment');

  let doctorsCache = [];
  let roomsCache = [];

  function dbToUiStatus(dbStatus) {
    const s = String(dbStatus || '').toLowerCase();
    if (s === 'rescheduled') return 'checked in';
    if (s === 'completed') return 'checked out';
    return s || 'scheduled';
  }

  function statusButtons(uiStatus) {
    const s = String(uiStatus || '').toLowerCase();
    if (s === 'scheduled') {
      return `<button class="btn-link status-checkin" title="Mark as checked in">Check in</button>`;
    }
    if (s === 'checked in') {
      return `<button class="btn-link status-checkout" title="Mark as checked out">Check out</button><button class="btn-link status-cancel-checkin" title="Revert to scheduled">Cancel check in</button>`;
    }
    if (s === 'checked out') {
      return `<button class="btn-link status-cancel-checkout" title="Revert to checked in">Cancel checkout</button>`;
    }
    return '';
  }

  function setLoading(message) {
    statusMsg.textContent = message || 'Loading…';
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Loading…</td></tr>`;
  }

  async function loadDoctors() {
    const res = await fetch(`${API_DOCS}?list=1`, { headers: AppUtils.authHeaders() });
    if (!res.ok) throw new Error('Failed to load doctors');
    const data = await res.json();
    doctorsCache = data?.doctors || [];
    editDoc.innerHTML = `<option value="">Select doctor…</option>` + doctorsCache.map(d =>
      `<option value="${d.id}">${AppUtils.escapeHtml(d.name)}</option>`).join('');
  }

  async function loadRooms() {
    const res = await fetch(`${API_ROOMS}?list=1`, { headers: AppUtils.authHeaders() });
    if (!res.ok) throw new Error('Failed to load rooms');
    const data = await res.json();
    roomsCache = data?.rooms || [];
    editRoom.innerHTML = `<option value="">Select room…</option>` + roomsCache.map(r =>
      `<option value="${r.id}">${AppUtils.escapeHtml(r.name)}</option>`).join('');
  }

  async function fetchList() {
    const params = new URLSearchParams({
      date: dateInput.value,
      q: searchInput.value.trim(),
      status: statusSel.value,
      type: typeSel.value
    });
    const res = await fetch(`${API_LIST}?${params.toString()}`, { headers: AppUtils.authHeaders() });
    if (res.status === 401) {
      statusMsg.textContent = 'Session expired.';
      setTimeout(() => (window.location.href = '/medical_clinic/public/index.php?page=login'), 900);
      return [];
    }
    const data = await res.json().catch(() => ({}));
    const all = data?.appointments || [];
    return all.filter(a => !/^cancelled?$/i.test(String(a.status || '')));
  }

  function renderTable(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">No appointments</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const uiStatus = dbToUiStatus(r.status);
      const rowClass = `status-${AppUtils.cssSafe(uiStatus)}`;
      return `<tr data-id="${r.id}" class="${rowClass}">
        <td>${AppUtils.escapeHtml((r.from_time||'') + '–' + (r.to_time||''))}</td>
        <td>${AppUtils.escapeHtml(r.patient_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.doctor_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.room_name || r.room || '')}</td>
        <td>${AppUtils.escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${AppUtils.cssSafe(uiStatus)}">${AppUtils.escapeHtml(uiStatus)}</span></td>
        <td>${AppUtils.escapeHtml(r.summary || '')}</td>
        <td>${AppUtils.escapeHtml(r.comment || '')}</td>
        <td class="col-actions"><div class="row-actions">
          ${statusButtons(uiStatus)}
          <button class="btn-link edit">Edit</button>
          <button class="btn-link danger cancel">Cancel</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  async function updateStatus(id, nextUiStatus) {
    const res = await fetch(API_STATUS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify({ id, status: nextUiStatus })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Status update failed');
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

  async function openEdit(tr) {
    const id = tr.getAttribute('data-id');
    if (!id) return;
    if (!doctorsCache.length) await loadDoctors();
    if (!roomsCache.length) await loadRooms();

    const timeText = tr.children[0].textContent.trim();
    const [from, to] = timeText.split('–');
    const doctorName = tr.children[2].textContent.trim();
    const roomText = tr.children[3].textContent.trim();
    const roomIdMatch = roomText.match(/(\d+)/);
    const roomNum = roomIdMatch ? roomIdMatch[1] : roomText;
    const foundDoc = doctorsCache.find(d => d.name === doctorName);
    const foundRoom = roomsCache.find(r => String(r.id) === String(roomNum));

    editId.value = id;
    editDate.value = dateInput.value;
    editFrom.value = (from || '').trim() || '09:00';
    editTo.value = (to || '').trim() || '09:30';
    editDoc.value = (foundDoc && foundDoc.id) || '';
    editRoom.value = (foundRoom && foundRoom.id) || '';
    editSum.value = tr.children[6].textContent.trim();
    editCom.value = tr.children[7].textContent.trim();
    editMsg.textContent = '';
    showModal(true);
  }

  async function cancelAppointment(id) {
    const res = await fetch(API_CANCEL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Cancel failed');
  }

  async function load() {
    setLoading('Loading…');
    const savedDate = localStorage.getItem('lastAppointmentsDate');
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!dateInput.value) dateInput.value = savedDate || todayStr;

    try {
      if (!doctorsCache.length) await loadDoctors();
      if (!roomsCache.length) await loadRooms();
      const rows = await fetchList();
      renderTable(rows);
      statusMsg.textContent = `${rows.length} appointment(s) on ${dateInput.value}`;
    } catch (err) {
      console.error(err);
      statusMsg.textContent = 'Failed to load appointments.';
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Error loading data</td></tr>`;
    }
  }

  function saveFilters() {
    try { localStorage.setItem('lastAppointmentsDate', dateInput.value); } catch (e) {}
  }

  dateInput.addEventListener('change', () => { saveFilters(); load(); });
  searchInput?.addEventListener('input', AppUtils.debounce(() => load(), 300));
  statusSel?.addEventListener('change', () => load());
  typeSel?.addEventListener('change', () => load());
  refreshBtn?.addEventListener('click', () => load());

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
        await updateStatus(id, 'checked in');
        return load();
      }
      if (btn.classList.contains('status-checkout')) {
        await updateStatus(id, 'checked out');
        return load();
      }
      if (btn.classList.contains('status-cancel-checkin')) {
        await updateStatus(id, 'scheduled');
        return load();
      }
      if (btn.classList.contains('status-cancel-checkout')) {
        await updateStatus(id, 'checked in');
        return load();
      }
    } catch (err) {
      alert('Action failed: ' + (err.message || err));
    }
  });

  [editClose, editCancel].forEach(b => b && b.addEventListener('click', () => showModal(false)));

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = 'Saving…';

    const payload = {
      id: editId.value,
      date: editDate.value,
      from: editFrom.value,
      to: editTo.value,
      doctorId: Number(editDoc.value) || null,
      roomId: Number(editRoom.value) || null,
      summary: editSum.value || '',
      comment: editCom.value || ''
    };

    try {
      const res = await fetch(API_EDIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        editMsg.textContent = data.error || 'Update failed';
        return;
      }
      editMsg.textContent = 'Saved.';
      setTimeout(() => { showModal(false); load(); }, 300);
    } catch (err) {
      console.error(err);
      editMsg.textContent = 'Failed to save changes.';
    }
  });

  // Initial load
  const savedDate = localStorage.getItem('lastAppointmentsDate');
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!dateInput.value) dateInput.value = savedDate || todayStr;
  load();
})();

// ===== PATIENTS PAGE =====
(function() {
  const qInput = document.getElementById('q');
  if (!qInput) return; // not on patients page

  const token = AppUtils.getToken();
  const API = '/medical_clinic/api/patients.php';
  const statusMsg = document.getElementById('statusMsg');
  const tbody = document.getElementById('patientsBody');

  async function load(q = '') {
    statusMsg.textContent = 'Loading…';
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading…</td></tr>`;
    const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
    try {
      const res = await fetch(url, { headers: AppUtils.authHeaders() });
      const data = await res.json();
      const rows = data.patients || [];
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">No patients found</td></tr>`;
        statusMsg.textContent = '0 results';
        return;
      }
      tbody.innerHTML = rows.map(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const id = p.id;
        const dob = p.dob || '';
        const phone = p.phone || '';
        const email = p.email || '';
        return `<tr>
          <td>${id}</td>
          <td>${AppUtils.escapeHtml(name)}</td>
          <td>${AppUtils.escapeHtml(phone)}</td>
          <td>${AppUtils.escapeHtml(email)}</td>
          <td>${AppUtils.escapeHtml(dob)}</td>
          <td>
            <a class="small-btn" href="/medical_clinic/index.php?page=appointment_new&patientId=${encodeURIComponent(id)}">Add appointment</a>
            <a class="small-btn btn-secondary" href="/medical_clinic/index.php?page=patient_view&id=${encodeURIComponent(id)}">View</a>
          </td>
        </tr>`;
      }).join('');
      statusMsg.textContent = `${rows.length} result(s)`;
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Error loading patients</td></tr>`;
      statusMsg.textContent = 'Error';
    }
  }

  document.getElementById('searchBtn')?.addEventListener('click', () => load(qInput.value.trim()));
  qInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') load(qInput.value.trim()); });
  load();
})();

// ===== PATIENT VIEW PAGE =====
(function() {
  const ptName = document.getElementById('ptName');
  if (!ptName) return; // not on patient view page

  const token = AppUtils.getToken();
  const params = new URLSearchParams(location.search);
  const patientId = params.get('id');

  if (!patientId) {
    alert('Missing patient id');
    location.href = '/medical_clinic/index.php?page=patients';
    return;
  }

  const addApptLink = document.getElementById('addApptLink');
  if (addApptLink) addApptLink.href = `/medical_clinic/index.php?page=appointment_new&patientId=${encodeURIComponent(patientId)}`;

  const fieldMeta = {
    first_name: { type: 'text', label: 'First name' },
    last_name: { type: 'text', label: 'Last name' },
    phone: { type: 'text', label: 'Phone' },
    email: { type: 'email', label: 'Email' },
    dob: { type: 'date', label: 'DOB' },
    address: { type: 'text', label: 'Address' }
  };

  const drawer = document.getElementById('apptDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const dRefs = {
    date: document.getElementById('d-date'),
    time: document.getElementById('d-time'),
    doctor: document.getElementById('d-doctor'),
    room: document.getElementById('d-room'),
    type: document.getElementById('d-type'),
    status: document.getElementById('d-status'),
    summary: document.getElementById('d-summary'),
    comment: document.getElementById('d-comment'),
    editBtn: document.getElementById('drawerEditBtn'),
    saveBtn: document.getElementById('drawerSaveBtn'),
    cancelBtn: document.getElementById('drawerCancelBtn'),
    closeBtn: document.getElementById('drawerCloseBtn')
  };

  let currentApptId = null;
  let isFutureView = false;
  let drawerMode = 'view';
  let editForm = null;

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('open');
    currentApptId = null;
    drawerMode = 'view';
    if (editForm) { editForm.remove(); editForm = null; }
    document.querySelectorAll('.drawer-body .field-row').forEach(r => r.style.display = '');
    dRefs.editBtn.style.display = isFutureView ? 'inline-block' : 'none';
    dRefs.saveBtn.textContent = 'Save';
  }

  if (dRefs.closeBtn) dRefs.closeBtn.addEventListener('click', closeDrawer);
  if (dRefs.cancelBtn) dRefs.cancelBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  async function load() {
    try {
      const res = await fetch(`/medical_clinic/api/patient_show.php?id=${encodeURIComponent(patientId)}`, {
        headers: AppUtils.authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      const p = data.patient;
      const appts = data.appointments || [];
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      if (ptName) ptName.textContent = fullName || ('Patient #' + p.id);

      setText('first_name', p.first_name || '');
      setText('last_name', p.last_name || '');
      setText('phone', p.phone || '');
      setText('email', p.email || '');
      setText('dob', (p.dob || '').trim());
      setText('address', p.address || '');
      const createdAt = document.getElementById('val-created_at');
      if (createdAt) createdAt.textContent = p.created_at || '';

      document.querySelectorAll('.edit-btn[data-field]').forEach(btn => {
        btn.addEventListener('click', () => enterEdit(btn.dataset.field));
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const toDate = (s) => {
        const t = (s || '').trim();
        const d = new Date(t);
        if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
        const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
        return new Date(NaN);
      };
      const past = appts.filter(a => toDate(a.date) < today)
        .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')));
      const future = appts.filter(a => toDate(a.date) >= today)
        .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')));

      renderTable('pastBody', past, false);
      renderTable('futureBody', future, true);

      bindTableActions('pastBody', false);
      bindTableActions('futureBody', true);

    } catch (e) {
      console.error(e);
      const pastBody = document.getElementById('pastBody');
      const futBody = document.getElementById('futureBody');
      if (pastBody) pastBody.innerHTML = `<tr><td colspan="8" class="empty">Error</td></tr>`;
      if (futBody) futBody.innerHTML = `<tr><td colspan="8" class="empty">Error</td></tr>`;
    }
  }

  function setText(field, val) {
    const el = document.getElementById('val-' + field);
    if (el) el.textContent = val;
  }

  function enterEdit(field) {
    const meta = fieldMeta[field];
    const row = document.querySelector(`.kv td.actions-cell button[data-field="${field}"]`)?.closest('tr');
    if (!row) return;
    const valueCell = row.querySelector('.value-cell');
    const msg = row.querySelector('#msg-' + field);
    const valSpan = valueCell.querySelector('#val-' + field);
    const actionsCell = row.querySelector('.actions-cell');
    const editBtn = actionsCell.querySelector('.edit-btn');
    const oldVal = valSpan.textContent;

    const wrap = document.createElement('span');
    wrap.className = 'inline-edit';
    const inp = document.createElement('input');
    inp.type = meta.type;
    inp.value = oldVal;
    inp.id = 'edit-' + field;
    if (meta.type === 'date' && oldVal && oldVal.length > 10) inp.value = oldVal.slice(0, 10);
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'save-btn';
    save.textContent = 'Save';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'cancel-btn';
    cancel.textContent = 'Cancel';

    valSpan.style.display = 'none';
    valueCell.appendChild(wrap);
    wrap.appendChild(inp);
    wrap.appendChild(save);
    wrap.appendChild(cancel);
    editBtn.disabled = true;
    if (msg) msg.textContent = '';
    inp.focus();

    save.onclick = async () => {
      if (msg) { msg.style.color = '#355F60'; msg.textContent = 'Saving…'; }
      try {
        await updatePatientField(field, inp.value);
        valSpan.textContent = inp.value;
        if (msg) { msg.style.color = '#0E4B50'; msg.textContent = 'Saved'; }
        exitEdit();
      } catch (e) {
        console.error(e);
        if (msg) { msg.style.color = '#B00020'; msg.textContent = e.message || 'Error'; }
      }
    };
    const exitEdit = () => {
      wrap.remove();
      valSpan.style.display = '';
      editBtn.disabled = false;
    };
    cancel.onclick = exitEdit;
  }

  async function updatePatientField(field, value) {
    const allowed = ['first_name', 'last_name', 'phone', 'email', 'dob', 'address'];
    if (!allowed.includes(field)) throw new Error('Invalid field');
    const res = await fetch('/medical_clinic/api/patient_update.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify({ id: patientId, field, value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update');
    return true;
  }

  function renderTable(tbodyId, rows, isFuture) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty">No records</td></tr>`; return; }
    tbody.innerHTML = rows.map(r => {
      const time = (r.start_time || '') + (r.end_time ? '–' + r.end_time : '');
      const statusClass = AppUtils.cssSafe(r.status || '');
      return `<tr data-apptid="${r.id}">
        <td>${r.date || ''}</td>
        <td>${time}</td>
        <td>${AppUtils.escapeHtml(r.doctor_name || r.doctor || '')}</td>
        <td>${AppUtils.escapeHtml(r.room || r.room_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${statusClass}">${AppUtils.escapeHtml(r.status || '')}</span></td>
        <td class="sum">${AppUtils.escapeHtml(r.summary || '')}</td>
        <td class="actions">
          <button class="btn-small view-btn" type="button">View</button>
          ${isFuture ? `<button class="btn-small edit-btn-appt" type="button">Edit</button>` : ''}
        </td>
      </tr>`;
    }).join('');
  }

  function bindTableActions(tbodyId, isFuture) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.addEventListener('click', async (ev) => {
      const tr = ev.target.closest('tr[data-apptid]');
      if (!tr) return;
      const apptId = tr.getAttribute('data-apptid');
      if (ev.target.classList.contains('view-btn')) {
        openDrawerView(apptId, isFuture, tr);
      } else if (ev.target.classList.contains('edit-btn-appt') && isFuture) {
        openDrawerEdit(apptId, tr);
      }
    });
  }

  async function fetchAppointment(apptId) {
    try {
      const r = await fetch(`/medical_clinic/api/appointment_show.php?id=${encodeURIComponent(apptId)}`, {
        headers: AppUtils.authHeaders()
      });
      if (r.ok) {
        const d = await r.json();
        return d.appointment || d || null;
      }
    } catch { }
    return null;
  }

  function prefillDrawerFromRow(tr) {
    const td = (idx) => tr.querySelector(`td:nth-child(${idx})`)?.textContent?.trim() || '';
    dRefs.date.textContent = td(1);
    dRefs.time.textContent = td(2);
    dRefs.doctor.textContent = td(3);
    dRefs.room.textContent = td(4);
    dRefs.type.textContent = td(5);
    dRefs.status.textContent = tr.querySelector('td:nth-child(6) .status-badge')?.textContent?.trim() || '';
    dRefs.summary.value = tr.querySelector('.sum')?.textContent?.trim() || '';
    dRefs.comment.value = '';
  }

  async function openDrawerView(apptId, isFutureRow, tr) {
    currentApptId = apptId;
    isFutureView = !!isFutureRow;
    drawerMode = 'view';

    prefillDrawerFromRow(tr);
    dRefs.editBtn.style.display = isFutureView ? 'inline-block' : 'none';
    dRefs.editBtn.onclick = () => openDrawerEdit(apptId, tr);

    openDrawer();

    const a = await fetchAppointment(apptId);
    if (a) {
      dRefs.summary.value = a.summary ?? dRefs.summary.value;
      dRefs.comment.value = a.comment ?? dRefs.comment.value;
      dRefs.date.textContent = a.date ?? dRefs.date.textContent;
      if (a.from_time && a.to_time) dRefs.time.textContent = `${a.from_time}–${a.to_time}`;
      dRefs.doctor.textContent = a.doctor_name ?? dRefs.doctor.textContent;
      dRefs.room.textContent = a.room ?? dRefs.room.textContent;
      dRefs.type.textContent = a.type ?? dRefs.type.textContent;
      dRefs.status.textContent = a.status ?? dRefs.status.textContent;
    }

    dRefs.saveBtn.onclick = () => saveSummaryComment(tr);
  }

  async function saveSummaryComment(tr) {
    try {
      const payload = { id: Number(currentApptId), summary: dRefs.summary.value, comment: dRefs.comment.value };
      const res = await fetch('/medical_clinic/api/appointment_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to save');
      if (tr?.querySelector('.sum')) tr.querySelector('.sum').textContent = dRefs.summary.value || '';
      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(() => { dRefs.saveBtn.textContent = 'Save'; }, 800);
    } catch (e) {
      alert(e.message || 'Save error');
    }
  }

  async function openDrawerEdit(apptId, tr) {
    currentApptId = apptId;
    isFutureView = true;
    drawerMode = 'edit';

    document.querySelectorAll('.drawer-body .field-row').forEach(r => r.style.display = 'none');
    dRefs.editBtn.style.display = 'none';

    if (!editForm) {
      editForm = document.createElement('form');
      editForm.className = 'drawer-body';
      editForm.style.paddingTop = '8px';
      editForm.innerHTML = `
        <div class="field-row"><div class="label">Date</div><div class="value"><input id="e-date" type="date"></div></div>
        <div class="field-row"><div class="label">From</div><div class="value"><input id="e-from" type="time" step="60"></div></div>
        <div class="field-row"><div class="label">To</div><div class="value"><input id="e-to" type="time" step="60"></div></div>
        <div class="field-row"><div class="label">Doctor</div><div class="value"><select id="e-doctor"></select></div></div>
        <div class="field-row"><div class="label">Room</div><div class="value"><select id="e-room"></select></div></div>
        <div class="field-row"><div class="label">Type</div><div class="value"><input id="e-type" type="text" placeholder="Consultation"></div></div>
        <div class="field-row" style="align-items:start;"><div class="label">Summary</div><div class="value"><textarea id="e-summary" class="note-input"></textarea></div></div>
        <div class="field-row" style="align-items:start;"><div class="label">Comment</div><div class="value"><textarea id="e-comment" class="comment-input"></textarea></div></div>
      `;
      drawer.querySelector('.drawer-footer').before(editForm);
    } else {
      editForm.style.display = '';
    }

    const td = (idx) => tr.querySelector(`td:nth-child(${idx})`)?.textContent?.trim() || '';
    document.getElementById('e-date').value = AppUtils.toISODate(td(1));
    const times = (td(2) || '').split('–');
    document.getElementById('e-from').value = AppUtils.toISOTm(times[0] || '');
    document.getElementById('e-to').value = AppUtils.toISOTm(times[1] || '');
    document.getElementById('e-type').value = td(5);
    document.getElementById('e-summary').value = tr.querySelector('.sum')?.textContent?.trim() || '';
    document.getElementById('e-comment').value = '';

    await populateDoctorsRooms();

    const a = await fetchAppointment(apptId);
    if (a) {
      if (a.date) document.getElementById('e-date').value = AppUtils.toISODate(a.date);
      if (a.from_time) document.getElementById('e-from').value = AppUtils.toISOTm(a.from_time);
      if (a.to_time) document.getElementById('e-to').value = AppUtils.toISOTm(a.to_time);
      if (a.type) document.getElementById('e-type').value = a.type;
      if (a.summary != null) document.getElementById('e-summary').value = a.summary;
      if (a.comment != null) document.getElementById('e-comment').value = a.comment;
      if (a.doctorId) document.getElementById('e-doctor').value = String(a.doctorId);
      if (a.roomId || a.roomID) document.getElementById('e-room').value = String(a.roomId || a.roomID);
    }

    openDrawer();
    dRefs.saveBtn.onclick = () => saveEdit(tr);
  }

  async function populateDoctorsRooms() {
    try {
      const r = await fetch('/medical_clinic/api/doctors.php?list=1', { headers: AppUtils.authHeaders() });
      const d = await r.json();
      const arr = d?.doctors || d || [];
      const s = document.getElementById('e-doctor');
      s.innerHTML = '';
      arr.forEach(doc => {
        const id = String(doc.id);
        const name = doc.name || `${doc.fName||''} ${doc.lName||''}`.trim() || `Doctor ${id}`;
        s.appendChild(new Option(name, id));
      });
    } catch { }
    try {
      const r = await fetch('/medical_clinic/api/rooms.php?list=1', { headers: AppUtils.authHeaders() });
      const d = await r.json();
      const arr = d?.rooms || d || [];
      const s = document.getElementById('e-room');
      s.innerHTML = '';
      arr.forEach(room => {
        const id = String(room.id);
        const label = room.name ? `Room ${room.id} — ${room.name}` : `Room ${room.id}`;
        s.appendChild(new Option(label, id));
      });
    } catch { }
  }

  async function saveEdit(tr) {
    const payload = {
      id: Number(currentApptId),
      date: document.getElementById('e-date').value,
      from_time: AppUtils.normalizeTime(document.getElementById('e-from').value),
      to_time: AppUtils.normalizeTime(document.getElementById('e-to').value),
      doctorId: Number(document.getElementById('e-doctor').value || 0),
      roomId: Number(document.getElementById('e-room').value || 0),
      type: document.getElementById('e-type').value.trim(),
      summary: document.getElementById('e-summary').value,
      comment: document.getElementById('e-comment').value
    };
    if (!payload.date || !payload.from_time || !payload.to_time || !payload.doctorId || !payload.roomId) {
      alert('Please fill date, time, doctor and room.');
      return;
    }
    try {
      const res = await fetch('/medical_clinic/api/appointment_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { alert(data.error || 'Time conflict with another appointment.'); return; }
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to update');

      tr.querySelector('td:nth-child(1)').textContent = payload.date;
      tr.querySelector('td:nth-child(2)').textContent = `${payload.from_time.slice(0, 5)}–${payload.to_time.slice(0, 5)}`;
      tr.querySelector('td:nth-child(3)').textContent = document.getElementById('e-doctor').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(4)').textContent = document.getElementById('e-room').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(5)').textContent = payload.type || '';
      tr.querySelector('.sum').textContent = payload.summary || '';

      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(closeDrawer, 400);
    } catch (e) {
      alert(e.message || 'Update error');
    }
  }

  load();
})();

// ===== APPOINTMENT NEW PAGE =====
(function() {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';
  const token = AppUtils.getToken();

  async function loadSelect(selectId, endpoint) {
    const res = await fetch(`${API_BASE}/${endpoint}?list=1`, { headers: AppUtils.authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const select = document.getElementById(selectId);
    if (!select) return;
    const list = data[endpoint.replace('.php', '')] || [];
    select.innerHTML = `<option value="">Select...</option>` + list.map(item => {
      const text = item.name || `${item.fName || ''} ${item.lName || ''}`.trim() || `${item.id}`;
      return `<option value="${item.id}">${AppUtils.escapeHtml(text)}</option>`;
    }).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('apptDate').value;
    const from = document.getElementById('apptFrom').value;
    const to = document.getElementById('apptTo').value;
    const patientId = document.getElementById('apptPatient').value;
    const doctorId = document.getElementById('apptDoctor').value;
    const roomId = document.getElementById('apptRoom').value;
    const type = document.getElementById('apptType').value;
    const summary = document.getElementById('apptSummary').value;
    const comment = document.getElementById('apptComment').value;

    if (!date || !from || !to || !patientId || !doctorId || !roomId) {
      document.getElementById('formMsg').textContent = 'Please fill all required fields.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/appointment_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ date, from_time: from, to_time: to, patient_id: patientId, doctor_id: doctorId, room_id: roomId, type, summary, comment })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Create failed');
      document.getElementById('formMsg').textContent = 'Created successfully!';
      setTimeout(() => window.location.href = '/medical_clinic/public/index.php?page=appointments', 1000);
    } catch (err) {
      document.getElementById('formMsg').textContent = err.message;
    }
  });

  loadSelect('apptPatient', 'patients.php');
  loadSelect('apptDoctor', 'doctors.php');
  loadSelect('apptRoom', 'rooms.php');
})();

// ===== PATIENT NEW PAGE =====
(function() {
  const form = document.getElementById('patientForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = document.getElementById('patientFirst').value;
    const last = document.getElementById('patientLast').value;
    const phone = document.getElementById('patientPhone').value;
    const email = document.getElementById('patientEmail').value;
    const dob = document.getElementById('patientDOB').value;
    const address = document.getElementById('patientAddress').value;

    if (!first || !last) {
      document.getElementById('formMsg').textContent = 'First and last name required.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/patient_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ first_name: first, last_name: last, phone, email, dob, address })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Create failed');
      document.getElementById('formMsg').textContent = 'Created successfully!';
      setTimeout(() => window.location.href = '/medical_clinic/public/index.php?page=patients', 1000);
    } catch (err) {
      document.getElementById('formMsg').textContent = err.message;
    }
  });
})();

// ===== DOCTORS PAGE =====
(function() {
  const search = document.getElementById('doctorSearch');
  if (!search) return;

  const API_BASE = '/medical_clinic/api';
  const tbody = document.getElementById('doctorsBody');
  const msg = document.getElementById('doctorMsg');

  async function load() {
    msg.textContent = 'Loading...';
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading...</td></tr>';
    try {
      const res = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: AppUtils.authHeaders() });
      const data = await res.json();
      const doctors = data?.doctors || [];
      if (!doctors.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">No doctors found</td></tr>';
        msg.textContent = '0 results';
        return;
      }
      tbody.innerHTML = doctors.map(d => `<tr>
        <td>${d.id}</td>
        <td>${AppUtils.escapeHtml(d.name || '')}</td>
        <td>${AppUtils.escapeHtml(d.specialty || '')}</td>
        <td colspan="2"><button class="btn-link" onclick="alert('Edit not yet implemented')">Edit</button> <button class="btn-link danger" onclick="alert('Delete not yet implemented')">Delete</button></td>
      </tr>`).join('');
      msg.textContent = `${doctors.length} doctor(s)`;
    } catch (err) {
      msg.textContent = 'Error loading doctors';
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Error loading data</td></tr>';
    }
  }

  document.getElementById('doctorSearchBtn')?.addEventListener('click', load);
  load();
})();

// ===== DOCTOR NEW PAGE =====
(function() {
  const form = document.getElementById('doctorForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = document.getElementById('doctorFirst').value;
    const last = document.getElementById('doctorLast').value;
    const specialty = document.getElementById('doctorSpecialty').value;

    if (!first || !last) {
      document.getElementById('formMsg').textContent = 'First and last name required.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/doctor_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ first_name: first, last_name: last, specialty })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Create failed');
      document.getElementById('formMsg').textContent = 'Created successfully!';
      setTimeout(() => window.location.href = '/medical_clinic/public/index.php?page=doctors', 1000);
    } catch (err) {
      document.getElementById('formMsg').textContent = err.message;
    }
  });
})();

// ===== ROOMS PAGE =====
(function() {
  const search = document.getElementById('roomSearch');
  if (!search) return;

  const API_BASE = '/medical_clinic/api';
  const tbody = document.getElementById('roomsBody');
  const msg = document.getElementById('roomMsg');

  async function load() {
    msg.textContent = 'Loading...';
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Loading...</td></tr>';
    try {
      const res = await fetch(`${API_BASE}/rooms.php?list=1`, { headers: AppUtils.authHeaders() });
      const data = await res.json();
      const rooms = data?.rooms || [];
      if (!rooms.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty">No rooms found</td></tr>';
        msg.textContent = '0 results';
        return;
      }
      tbody.innerHTML = rooms.map(r => `<tr>
        <td>${r.id}</td>
        <td>${AppUtils.escapeHtml(r.name || '')}</td>
        <td><button class="btn-link" onclick="alert('Edit not yet implemented')">Edit</button> <button class="btn-link danger" onclick="alert('Delete not yet implemented')">Delete</button></td>
      </tr>`).join('');
      msg.textContent = `${rooms.length} room(s)`;
    } catch (err) {
      msg.textContent = 'Error loading rooms';
      tbody.innerHTML = '<tr><td colspan="3" class="empty">Error loading data</td></tr>';
    }
  }

  document.getElementById('roomSearchBtn')?.addEventListener('click', load);
  load();
})();

// ===== ROOM NEW PAGE =====
(function() {
  const form = document.getElementById('roomForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = document.getElementById('roomNum').value;
    const name = document.getElementById('roomName').value;

    if (!num) {
      document.getElementById('formMsg').textContent = 'Room number required.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/room_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id: num, name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Create failed');
      document.getElementById('formMsg').textContent = 'Created successfully!';
      setTimeout(() => window.location.href = '/medical_clinic/public/index.php?page=rooms', 1000);
    } catch (err) {
      document.getElementById('formMsg').textContent = err.message;
    }
  });
})();

// ===== WAITLIST PAGE =====
(function() {
  const qSearch = document.getElementById('qSearch');
  if (!qSearch) return;

  const API_BASE = '/medical_clinic/api';

  // DOM refs
  const tbodyActive   = document.getElementById('waitBody');
  const activeSearch  = document.getElementById('qSearch');
  const activeDrFilt  = document.getElementById('doctorFilter');

  const tbodyExpired  = document.getElementById('expiredBody');
  const expiredSearch = document.getElementById('expiredSearch');
  const expiredDrFilt = document.getElementById('expiredDoctorFilter');

  const drawer   = document.getElementById('wlDrawer');
  const backdrop = document.getElementById('wlBackdrop');
  const closeBtn = document.getElementById('wlCloseBtn');
  const cancelBtn= document.getElementById('wlCancelBtn');
  const saveBtn  = document.getElementById('wlSaveBtn');

  const fPatient = document.getElementById('f-patient');
  const fWait    = document.getElementById('f-wait-notes');
  const fDate    = document.getElementById('f-date');
  const fFrom    = document.getElementById('f-from');
  const fTo      = document.getElementById('f-to');
  const fDoctor  = document.getElementById('f-doctor');
  const fRoom    = document.getElementById('f-room');
  const fType    = document.getElementById('f-type');
  const fSummary = document.getElementById('f-summary');
  const fComment = document.getElementById('f-comment');

  // New waitlist form
  const wlPatientQuery  = document.getElementById('wlPatientQuery');
  const wlPatientId     = document.getElementById('wlPatientId');
  const wlPatientSel    = document.getElementById('wlPatientSel');
  const wlPatientSelect = document.getElementById('wlPatientSelect');
  const wlDoctorNew     = document.getElementById('wlDoctor');
  const wlNotes         = document.getElementById('wlNotes');
  const wlMsg           = document.getElementById('wlMsg');
  const wlCreateBtn     = document.getElementById('wlCreateBtn');

  // Patient suggestions portal
  const portal = document.getElementById('wlPatientPortal');

  // State
  let activeRows  = [];
  let expiredRows = [];
  let currentItem = null;
  let portalOpen  = false;
  let selectedPatientPhone = '';

  // Helpers
  const normTime = (t) => { const m = String(t || '').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/); return m ? `${m[1]}:${m[2]}:${m[3] || '00'}` : ''; };
  async function safeJson(res) { const text = await res.text(); try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, data: null }; } }

  function openDrawer(){ drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); backdrop.classList.add('open'); }
  function closeDrawer(){
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); backdrop.classList.remove('open');
    currentItem = null;
    fPatient.textContent='—'; fWait.value=''; fDate.value=''; fFrom.value=''; fTo.value='';
    fDoctor.innerHTML=''; fRoom.innerHTML=''; fType.value='Consultation'; fSummary.value=''; fComment.value='';
  }
  [closeBtn, cancelBtn, backdrop].forEach(el => el && el.addEventListener('click', closeDrawer));

  // Data load
  async function loadLists(){
    const r = await fetch(`${API_BASE}/waitlist_list.php`, { headers: AppUtils.authHeaders() });
    const j = await safeJson(r);
    if (!j.ok) throw new Error('Failed to load');
    const data = j.data || {};
    activeRows  = data.active  || data.rows || [];
    expiredRows = data.expired || [];
  }

  function renderBoth(){
    const a = activeRows.filter(r => matches(r, activeSearch?.value, activeDrFilt?.value));
    tbodyActive.innerHTML = a.length ? a.map(trActive).join('') : `<tr><td colspan="8" class="empty">No results</td></tr>`;

    const e = expiredRows.filter(r => matches(r, expiredSearch?.value, expiredDrFilt?.value));
    tbodyExpired.innerHTML = e.length ? e.map(trExpired).join('') : `<tr><td colspan="7" class="empty">No results</td></tr>`;
  }

  async function refreshListsAndRender() {
    try {
      await loadLists();
      renderBoth();
    } catch(e) {
      console.warn('Refresh failed:', e);
    }
  }

  // Init
  (async function init(){
    await Promise.all([loadDoctorsForFilters(), loadLists()]);
    renderBoth();
    bindActiveTableActions();
    bindFilterEvents();
    await loadDoctorsForNewWaitlist();
    await loadPatientsForNewWaitlist();
    bindPatientPicker();
    bindCreateWaitlist();
  })();

  // Load doctors for filters
  async function loadDoctorsForFilters(){
    try {
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.doctors || j.data || [];
      const fill = (sel) => {
        if (!sel) return;
        sel.innerHTML = `<option value="">All doctors</option>`;
        arr.forEach(doc => {
          const id = String(doc.id);
          const name = doc.name || `${doc.fName||''} ${doc.lName||''}`.trim() || `Doctor ${id}`;
          sel.appendChild(new Option(name, id));
        });
      };
      fill(activeDrFilt);
      fill(expiredDrFilt);
    } catch {}
  }

  async function loadDoctorsForNewWaitlist(){
    try {
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.doctors || j.data || [];
      wlDoctorNew.innerHTML = '';
      arr.forEach(doc => {
        const id = String(doc.id);
        const name = doc.name || `${doc.fName||''} ${doc.lName||''}`.trim() || `Doctor ${id}`;
        wlDoctorNew.appendChild(new Option(name, id));
      });
    } catch {}
  }

  async function loadPatientsForNewWaitlist(){
    try {
      const r = await fetch(`${API_BASE}/patients.php?list=1`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.patients || j.data || [];

      if (!wlPatientSelect) return;
      wlPatientSelect.innerHTML = `<option value="">— Select patient —</option>`;
      arr.forEach(p => {
        const id    = String(p.id);
        const name  = (p.name || '').trim() || `Patient ${id}`;
        const phone = (p.phone || '').trim();
        const label = phone ? `${name} — ${phone}` : name;
        const opt = new Option(label, id);
        opt.dataset.phone = phone;
        wlPatientSelect.appendChild(opt);
      });

      wlPatientSelect.addEventListener('change', () => {
        const opt = wlPatientSelect.selectedOptions[0];
        if (opt && wlPatientSelect.value) {
          wlPatientId.value = wlPatientSelect.value;
          wlPatientSel.textContent = opt.textContent;
          wlPatientQuery.value = '';
          selectedPatientPhone = opt.dataset.phone || '';
          closePortal();
        }
      });
    } catch {}
  }

  async function loadDoctorsForDrawer(){
    try {
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.doctors || j.data || [];
      fDoctor.innerHTML = '';
      arr.forEach(doc => {
        const id = String(doc.id);
        const name = doc.name || `${doc.fName||''} ${doc.lName||''}`.trim() || `Doctor ${id}`;
        fDoctor.appendChild(new Option(name, id));
      });
    } catch {}
  }

  async function loadRoomsForDrawer(){
    try {
      const r = await fetch(`${API_BASE}/rooms.php?list=1`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.rooms || j.data || [];
      fRoom.innerHTML = '';
      arr.forEach(room => {
        const id = String(room.id);
        const label = room.name ? `Room ${room.id} — ${room.name}` : `Room ${room.id}`;
        fRoom.appendChild(new Option(label, id));
      });
    } catch {}
  }

  // Filters
  function bindFilterEvents(){
    const rerender = () => renderBoth();
    activeSearch?.addEventListener('input', rerender);
    activeDrFilt?.addEventListener('change', rerender);
    expiredSearch?.addEventListener('input', rerender);
    expiredDrFilt?.addEventListener('change', rerender);
  }

  function matches(row, qVal, drVal){
    const q = (qVal || '').trim().toLowerCase();
    const dr = (drVal || '').trim();
    const hay = [
      row.patient_name || '', String(row.patient_id || ''), row.phone || '', row.notes || ''
    ].join(' ').toLowerCase();
    const qOk = !q || hay.includes(q);
    const drOk = !dr || (row.doctor_id && String(row.doctor_id) === dr);
    return qOk && drOk;
  }

  function trActive(r){
    return `
      <tr data-id="${r.id}" data-pid="${r.patient_id}" data-status="${r.status}" data-doc="${r.doctor_id||''}">
        <td>${r.id}</td>
        <td>${AppUtils.escapeHtml(r.patient_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.phone || '')}</td>
        <td>${AppUtils.escapeHtml(r.notes || '')}</td>
        <td>${AppUtils.escapeHtml(r.created_at || '')}</td>
        <td>${AppUtils.escapeHtml(r.doctor_name || '')}</td>
        <td><span class="status-chip">${AppUtils.escapeHtml(r.status)}</span></td>
        <td class="actions">
          <button class="btn-small ghost btn-cancel" type="button">Cancel</button>
          <button class="btn-small primary btn-schedule" type="button">Schedule</button>
        </td>
      </tr>
    `;
  }

  function trExpired(r){
    const cls = r.status === 'scheduled' ? 'status-scheduled' : (r.status === 'canceled' ? 'status-canceled' : '');
    return `
      <tr>
        <td>${r.id}</td>
        <td>${AppUtils.escapeHtml(r.patient_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.phone || '')}</td>
        <td>${AppUtils.escapeHtml(r.notes || '')}</td>
        <td>${AppUtils.escapeHtml(r.created_at || '')}</td>
        <td><span class="status-chip ${cls}">${AppUtils.escapeHtml(r.status)}</span></td>
        <td>${AppUtils.escapeHtml(r.doctor_name || '')}</td>
      </tr>
    `;
  }

  // Active table actions
  function bindActiveTableActions(){
    tbodyActive.addEventListener('click', async (ev)=>{
      const tr = ev.target.closest('tr[data-id]'); if (!tr) return;
      const id  = Number(tr.dataset.id);
      const pid = Number(tr.dataset.pid);

      if (ev.target.classList.contains('btn-cancel')) {
        if (!confirm('Cancel this waitlist entry?')) return;
        try {
          await updateWaitlistStatus(id, 'canceled', null, null);
          const idx = activeRows.findIndex(r => r.id === id);
          if (idx > -1) { const moved = activeRows.splice(idx,1)[0]; moved.status='canceled'; expiredRows.unshift(moved); }
          renderBoth();
          await refreshListsAndRender();
        } catch(e){ alert(e.message || 'Cancel failed'); }
        return;
      }

      if (ev.target.classList.contains('btn-schedule')) {
        const patientName = tr.children[1]?.textContent?.trim() || '';
        const notes = tr.children[3]?.textContent?.trim() || '';
        currentItem = { id, patient_id: pid, patient_name: patientName, notes };
        fPatient.textContent = patientName;
        fWait.value = notes;
        fType.value = 'Consultation';
        await Promise.all([loadDoctorsForDrawer(), loadRoomsForDrawer()]);
        openDrawer();
      }
    });
  }

  async function updateWaitlistStatus(id, status, doctorId=null, apptId=null){
    const body = { id, status };
    if (doctorId) body.doctor_id = doctorId;
    if (apptId) body.appointment_id = apptId;
    const r = await fetch(`${API_BASE}/waitlist_update.php`, {
      method:'POST', headers:{ 'Content-Type':'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify(body)
    });
    const j = await safeJson(r);
    if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to update waitlist');
    return true;
  }

  // Drawer save
  saveBtn.addEventListener('click', async ()=>{
    if (!currentItem) return;
    const date = fDate.value, from = normTime(fFrom.value), to = normTime(fTo.value);
    const doctorId = Number(fDoctor.value||0), roomId = Number(fRoom.value||0);
    if (!date || !from || !to || !doctorId || !roomId) { alert('Fill date, time, doctor, room'); return; }

    const payload = {
      patientId: currentItem.patient_id, doctorId, roomId, date,
      from_time: from, to_time: to, type:(fType.value||'Consultation').trim(),
      summary: fSummary.value||'', comment: fComment.value||''
    };

    try {
      const r = await fetch(`${API_BASE}/appointment_create.php`, {
        method:'POST', headers:{ 'Content-Type':'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const j = await safeJson(r);
      if (j.status === 409) { alert(j.data?.error || 'Time conflict'); return; }
      if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to create appointment');

      const apptId = j.data?.id;
      await updateWaitlistStatus(currentItem.id, 'scheduled', doctorId, apptId);

      const idx = activeRows.findIndex(r => r.id === currentItem.id);
      if (idx > -1) {
        const moved = activeRows.splice(idx,1)[0];
        moved.status = 'scheduled';
        moved.doctor_id = doctorId;
        moved.appointment_id = apptId;
        moved.doctor_name = fDoctor.selectedOptions[0]?.textContent || '';
        expiredRows.unshift(moved);
      }
      renderBoth();
      closeDrawer();
      await refreshListsAndRender();
      alert('Appointment created and waitlist item scheduled.');
    } catch(e){ alert(e.message || 'Error while scheduling'); }
  });

  // Patient picker typeahead
  function bindPatientPicker(){
    let timer = null;

    wlPatientQuery?.addEventListener('input', ()=>{
      clearTimeout(timer);
      const q = wlPatientQuery.value.trim();
      if (!q) { closePortal(); return; }
      timer = setTimeout(()=> searchPatients(q), 250);
    });

    document.addEventListener('click', (ev)=>{
      if (portalOpen && !portal.contains(ev.target) && ev.target !== wlPatientQuery) closePortal();
    });
    window.addEventListener('scroll', ()=> { if (portalOpen) positionPortal(); }, true);
    window.addEventListener('resize', ()=> { if (portalOpen) positionPortal(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closePortal(); });
  }

  async function searchPatients(q){
    try {
      const r = await fetch(`${API_BASE}/patients.php?list=1&q=${encodeURIComponent(q)}`, { headers: AppUtils.authHeaders() });
      const j = await safeJson(r);
      const arr = j.data?.patients || j.data || [];
      if (!arr.length) { closePortal(); return; }
      portal.innerHTML = arr.map(p => {
        const name  = (p.name || '').trim() || 'Patient';
        const phone = (p.phone || '').trim();
        return `
          <div class="wl-item" data-id="${p.id}" data-name="${AppUtils.escapeHtml(name)}" data-phone="${AppUtils.escapeHtml(phone)}">
            <div class="line1">${AppUtils.escapeHtml(name)}</div>
            <div class="line2">${AppUtils.escapeHtml(phone)}</div>
          </div>
        `;
      }).join('');
      portal.querySelectorAll('.wl-item').forEach(it => {
        it.addEventListener('click', ()=>{
          wlPatientId.value = it.dataset.id;
          const name  = it.dataset.name || '';
          const phone = it.dataset.phone || '';
          wlPatientSel.textContent = phone ? `${name} — ${phone}` : name;
          wlPatientQuery.value = '';
          selectedPatientPhone = phone;
          if (wlPatientSelect) wlPatientSelect.value = it.dataset.id;
          closePortal();
        });
      });
      openPortal();
    } catch { closePortal(); }
  }

  function openPortal(){
    positionPortal();
    portal.hidden = false;
    portalOpen = true;
  }
  function closePortal(){
    portal.hidden = true;
    portalOpen = false;
    portal.innerHTML = '';
  }
  function positionPortal(){
    if (!wlPatientQuery) return;
    const r = wlPatientQuery.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop  || 0;
    portal.style.left = `${r.left + scrollX}px`;
    portal.style.top  = `${r.bottom + 6 + scrollY}px`;
    portal.style.width = `${r.width}px`;
  }

  // Create new waitlist
  function bindCreateWaitlist(){
    wlCreateBtn?.addEventListener('click', async ()=>{
      wlMsg.style.color = '#355F60'; wlMsg.textContent = 'Saving…';

      let pid = Number(wlPatientId.value || 0);
      if (!pid) {
        pid = Number(wlPatientSelect?.value || 0);
        const opt = wlPatientSelect?.selectedOptions?.[0];
        selectedPatientPhone = opt?.dataset?.phone || selectedPatientPhone || '';
        if (opt && !wlPatientSel.textContent) {
          wlPatientSel.textContent = opt.textContent;
        }
      }

      const doctorId = Number(wlDoctorNew.value||0);
      const notes = wlNotes.value.trim();

      if (!pid) { wlMsg.style.color='#B00020'; wlMsg.textContent='Select a patient (search or dropdown)'; return; }

      try {
        const r = await fetch(`${API_BASE}/waitlist_create.php`, {
          method:'POST', headers:{ 'Content-Type':'application/json', ...AppUtils.authHeaders() },
          body: JSON.stringify({ patient_id: pid, doctor_id: doctorId || null, notes })
        });
        const j = await safeJson(r);
        if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to create');

        const doctor_name   = wlDoctorNew.selectedOptions[0]?.textContent || '';
        const patient_label = wlPatientSel.textContent || (wlPatientSelect?.selectedOptions[0]?.textContent || '');

        activeRows.unshift({
          id:j.data.id,
          patient_id:pid,
          patient_name: patient_label,
          phone: selectedPatientPhone || '',
          notes,
          created_at:j.data.created_at || new Date().toISOString().slice(0,19).replace('T',' '),
          status:'pending',
          doctor_id: doctorId || null,
          doctor_name
        });
        renderBoth();
        await refreshListsAndRender();

        wlMsg.style.color = '#0E4B50'; wlMsg.textContent = 'Added to waitlist';
        wlPatientId.value=''; wlPatientSel.textContent=''; wlNotes.value='';
        selectedPatientPhone = '';
        if (wlPatientSelect) wlPatientSelect.value='';
      } catch(e){ wlMsg.style.color='#B00020'; wlMsg.textContent = e.message || 'Error'; }
    });
  }
})();

// ===== CALENDAR PAGE =====
(function() {
  const calendar = document.getElementById('calendar');
  if (!calendar) return;

  // Initialize FullCalendar
  if (typeof FullCalendar !== 'undefined') {
    const calendarEl = calendar;
    const cal = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      height: 'auto',
      events: async (info, successCallback, failureCallback) => {
        try {
          const res = await fetch('/medical_clinic/api/appointments_range.php?start=' + info.start.toISOString().split('T')[0] + '&end=' + info.end.toISOString().split('T')[0], {
            headers: AppUtils.authHeaders()
          });
          const data = await res.json();
          const events = (data?.appointments || []).map(a => ({
            title: a.patient_name || 'Appointment',
            start: a.date + 'T' + a.from_time,
            end: a.date + 'T' + a.to_time,
            extendedProps: { 
              doctor: a.doctor_name,
              room: a.room_name || a.room,
              status: a.status
            }
          }));
          successCallback(events);
        } catch (err) {
          console.error('Failed to load events', err);
          failureCallback(err);
        }
      }
    });
    cal.render();
  }
})();
