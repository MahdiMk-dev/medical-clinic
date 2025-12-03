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

// ===== SIDEBAR COLLAPSIBLE SECTIONS =====
(() => {
  const sections = document.querySelectorAll('.nav-section');
  sections.forEach(sec => {
    const toggle = sec.querySelector('.nav-toggle');
    const links = sec.querySelector('.nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
      const collapsed = links.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed', collapsed);
    });
  });
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

  confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.35)';
      overlay.style.zIndex = '10000';

      const box = document.createElement('div');
      box.style.width = '320px';
      box.style.maxWidth = '90vw';
      box.style.margin = '20vh auto 0';
      box.style.background = '#fff';
      box.style.borderRadius = '10px';
      box.style.boxShadow = '0 20px 50px rgba(0,0,0,0.25)';
      box.style.padding = '18px';
      box.style.fontFamily = 'inherit';

      const msg = document.createElement('div');
      msg.textContent = message;
      msg.style.marginBottom = '14px';
      msg.style.fontSize = '15px';
      msg.style.color = '#111827';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.gap = '10px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'No';
      cancelBtn.style.border = '1px solid #d1d5db';
      cancelBtn.style.background = '#fff';
      cancelBtn.style.padding = '8px 12px';
      cancelBtn.style.borderRadius = '6px';
      cancelBtn.style.cursor = 'pointer';

      const okBtn = document.createElement('button');
      okBtn.textContent = 'Yes';
      okBtn.style.border = '0';
      okBtn.style.background = '#2563eb';
      okBtn.style.color = '#fff';
      okBtn.style.padding = '8px 12px';
      okBtn.style.borderRadius = '6px';
      okBtn.style.cursor = 'pointer';

      cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };
      okBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };

      actions.append(cancelBtn, okBtn);
      box.append(msg, actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
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
  const urlParams = new URLSearchParams(location.search);
  let preselectApptId = urlParams.get('apptId');
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
    if (s === 'checked in' || s === 'checked-in' || s === 'rescheduled') {
      return `<button class="btn-link status-checkout" title="Mark as checked out">Check out</button><button class="btn-link status-cancel-checkin" title="Revert to scheduled">Cancel check in</button>`;
    }
    if (s === 'checked out' || s === 'checked-out' || s === 'completed') {
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
      const patientCell = r.patient_id
        ? `<a href="/medical_clinic/public/index.php?page=patient_view&id=${encodeURIComponent(r.patient_id)}">${AppUtils.escapeHtml(r.patient_name || '')}</a>`
        : AppUtils.escapeHtml(r.patient_name || '');
      const timeCell = r.time || `${r.from_time || ''} - ${r.to_time || ''}`;
      const showEditCancel = uiStatus === 'scheduled';
      const colorMap = {
        scheduled: '#2563eb',
        'checked in': '#22c55e',
        'checked-in': '#22c55e',
        'checked out': '#ef4444',
        'checked-out': '#ef4444',
        completed: '#ef4444',
        'no-show': '#6b7280',
        canceled: '#9ca3af',
        cancelled: '#9ca3af'
      };
      const baseColor = colorMap[uiStatus] || '#2563eb';
      const rowStyle = `style="background:${baseColor}10"`;
      return `<tr data-id="${r.id}" class="${rowClass}" ${rowStyle}>
        <td>${AppUtils.escapeHtml(timeCell)}</td>
        <td>${patientCell}</td>
        <td>${AppUtils.escapeHtml(r.doctor_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.room_name || r.room || '')}</td>
        <td>${AppUtils.escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${AppUtils.cssSafe(uiStatus)}">${AppUtils.escapeHtml(uiStatus)}</span></td>
        <td>${AppUtils.escapeHtml(r.summary || '')}</td>
        <td>${AppUtils.escapeHtml(r.comment || '')}</td>
        <td class="col-actions"><div class="row-actions">
          ${statusButtons(uiStatus)}
          ${showEditCancel ? '<button class="btn-link edit">Edit</button><button class="btn-link danger cancel">Cancel</button>' : '<span class="muted-small">Locked</span>'}
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
      if (preselectApptId) {
        const tr = tbody.querySelector(`tr[data-id="${preselectApptId}"]`);
        if (tr) { openEdit(tr); preselectApptId = null; }
      }
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
        const ok = await AppUtils.confirmDialog('Cancel this appointment?');
        if (!ok) return;
        await cancelAppointment(id);
        return load();
      }
      const selectedDate = dateInput.value;
      const todayStr = new Date().toISOString().slice(0, 10);

      if (btn.classList.contains('status-checkin')) {
        if (selectedDate !== todayStr) {
          AppUtils.toast('Check-in allowed only for today\'s appointments.', false);
          return;
        }
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
        if (selectedDate !== todayStr) {
          AppUtils.toast('Cancel checkout is allowed only for today\'s appointments.', false);
          return;
        }
        await updateStatus(id, 'checked in');
        return load();
      }
    } catch (err) {
      AppUtils.toast('Action failed: ' + (err.message || err), false);
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
            <a class="small-btn" href="/medical_clinic/public/index.php?page=appointment_new&patientId=${encodeURIComponent(id)}">Add appointment</a>
            <a class="small-btn btn-secondary" href="/medical_clinic/public/index.php?page=patient_view&id=${encodeURIComponent(id)}">View</a>
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
  const apptCache = new Map();
  const statusMsg = document.getElementById('patientStatus');

  if (!patientId) {
    AppUtils.toast('Missing patient id', false);
    setTimeout(() => { location.href = '/medical_clinic/public/index.php?page=patients'; }, 300);
    return;
  }
  if (statusMsg) statusMsg.textContent = '';

  const addApptLink = document.getElementById('addApptLink');
  if (addApptLink) addApptLink.href = `/medical_clinic/public/index.php?page=appointment_new&patientId=${encodeURIComponent(patientId)}`;

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
  const baseDrawerBody = drawer ? drawer.querySelector('.drawer-body') : null;
  const dRefs = {
    date: document.getElementById('d-date'),
    time: document.getElementById('d-time'),
    doctor: document.getElementById('d-doctor'),
    room: document.getElementById('d-room'),
    type: document.getElementById('d-type'),
    status: document.getElementById('d-status'),
    vitals: document.getElementById('d-vitals'),
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
  const histMedicalInput = document.getElementById('hist-medical-input');
  const histSurgicalInput = document.getElementById('hist-surgical-input');
  const histAllergiesInput = document.getElementById('hist-allergies-input');
  const histSaveBtn = document.getElementById('histSaveBtn');
  const histMsg = document.getElementById('histMsg');
  const histActions = document.getElementById('histActions');
  const histToggles = document.querySelectorAll('.history-toggle');
  const mediaToggle = document.getElementById('mediaToggle');
  const mediaPanel  = document.getElementById('mediaPanel');
  const mediaTabs   = document.querySelectorAll('.media-tab');
  const mediaCategory = document.getElementById('mediaCategory');
  const mediaTitle    = document.getElementById('mediaTitle');
  const mediaFile     = document.getElementById('mediaFile');
  const mediaUpload   = document.getElementById('mediaUploadBtn');
  const mediaMsg      = document.getElementById('mediaMsg');
  const mediaLists    = document.querySelectorAll('.media-list');
  const mediaState = { labs: [], imaging: [], reports: [] };
  let mediaLoaded = false;

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
    if (baseDrawerBody) baseDrawerBody.style.display = '';
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
      appts.forEach(a => { apptCache.set(String(a.id), a); });
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      if (ptName) ptName.textContent = fullName || ('Patient #' + p.id);

      setText('first_name', p.first_name || '');
      setText('last_name', p.last_name || '');
      setText('phone', p.phone || '');
      setText('email', p.email || '');
      setText('dob', (p.dob || '').trim());
      setText('address', p.address || '');
      setHistory('medical', p.medical_history || p.history_medical || p.med_history || '');
      setHistory('surgical', p.surgical_history || p.history_surgical || p.surg_history || '');
      setHistory('allergies', p.allergies || p.allergy || '');
      if (histMedicalInput) histMedicalInput.value = p.medical_history || '';
      if (histSurgicalInput) histSurgicalInput.value = p.surgical_history || '';
      if (histAllergiesInput) histAllergiesInput.value = p.allergies || '';

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
      if (pastBody) pastBody.innerHTML = `<tr><td colspan="9" class="empty">Error</td></tr>`;
      if (futBody) futBody.innerHTML = `<tr><td colspan="9" class="empty">Error</td></tr>`;
      if (statusMsg) { statusMsg.textContent = e.message || 'Failed to load patient'; statusMsg.style.color = '#B00020'; }
    }
  }

  function setText(field, val) {
    const el = document.getElementById('val-' + field);
    if (el) el.textContent = val;
  }

  function setHistory(key, text) {
    const el = document.getElementById(`history-${key}`);
    if (!el) return;
    const val = (text || '').trim();
    if (val) {
      el.textContent = val;
      el.classList.remove('history-empty');
    } else {
      el.textContent = 'Not recorded';
      el.classList.add('history-empty');
    }
  }

  async function saveHistory() {
    if (!histMedicalInput || !histSurgicalInput || !histAllergiesInput) return;
    histMsg.textContent = 'Saving…'; histMsg.style.color = '#355F60';
    try {
      const updates = [
        { field: 'medical_history', value: histMedicalInput.value },
        { field: 'surgical_history', value: histSurgicalInput.value },
        { field: 'allergies', value: histAllergiesInput.value },
      ];
      for (const u of updates) {
        await fetch('/medical_clinic/api/patient_update.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
          body: JSON.stringify({ id: patientId, field: u.field, value: u.value })
        }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
          if (!ok) throw new Error(d.error || 'Save failed');
        });
      }
      setHistory('medical', histMedicalInput.value);
      setHistory('surgical', histSurgicalInput.value);
      setHistory('allergies', histAllergiesInput.value);
      histMsg.textContent = 'Saved';
      histMsg.style.color = '#0E4B50';
      histActions?.classList.add('hidden');
      document.querySelectorAll('.history-editor').forEach(ed => ed.classList.add('hidden'));
      histToggles.forEach(btn => { btn.textContent = 'Add'; });
    } catch (e) {
      histMsg.textContent = e.message || 'Error';
      histMsg.style.color = '#B00020';
    }
  }

  histSaveBtn?.addEventListener('click', saveHistory);

  histToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const editor = document.querySelector(`.history-editor[data-field="${field}"]`);
      if (!editor) return;
      const isHidden = editor.classList.contains('hidden');
      document.querySelectorAll('.history-editor').forEach(ed => ed.classList.add('hidden'));
      histToggles.forEach(b => b.textContent = 'Add');
      if (isHidden) {
        editor.classList.remove('hidden');
        btn.textContent = 'Hide';
        histActions?.classList.remove('hidden');
      } else {
        editor.classList.add('hidden');
        histActions?.classList.add('hidden');
      }
    });
  });

  // ---- MEDIA (UI placeholder; backend needed to persist) ----
  function setMediaTab(cat) {
    mediaTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.cat === cat));
    mediaLists.forEach(list => list.classList.toggle('hidden', list.dataset.cat !== cat));
    if (mediaCategory) mediaCategory.value = cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  function renderMedia(cat) {
    const list = Array.from(mediaLists).find(l => l.dataset.cat === cat);
    if (!list) return;
    const rows = mediaState[cat] || [];
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No media yet.</div>';
      return;
    }
    list.innerHTML = rows.map(item => `
      <div class="media-item" data-id="${item.id || ''}" style="padding:8px 0; border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;">${AppUtils.escapeHtml(item.title || 'Untitled')}</div>
        <div class="muted-small" style="font-size:14px;font-weight:600;">
          ${AppUtils.escapeHtml(item.meta || '')}
          ${item.created_at ? ' · ' + AppUtils.escapeHtml(item.created_at) : ''}
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          ${item.url ? `<a href="${AppUtils.escapeHtml(item.url)}" target="_blank" rel="noopener">Open</a>` : ''}
          ${item.id ? `<button class="btn-link danger media-delete" data-id="${item.id}" data-cat="${cat}">Delete</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  async function fetchMedia(cat='labs') {
    try {
      const res = await fetch(`/medical_clinic/api/patient_media.php?patient_id=${encodeURIComponent(patientId)}`, {
        headers: AppUtils.authHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to load media');
      ['labs','imaging','reports'].forEach(k => mediaState[k] = []);
      (data.media || []).forEach(m => {
        const c = (m.category || '').toLowerCase();
        if (!mediaState[c]) mediaState[c] = [];
        mediaState[c].push({ id: m.id, title: m.title, meta: m.file_path || m.mime || '', url: m.url, created_at: m.created_at });
      });
      mediaLoaded = true;
      renderMedia(cat);
    } catch (e) {
      if (mediaMsg) mediaMsg.textContent = e.message || 'Failed to load media';
    }
  }

  mediaToggle?.addEventListener('click', () => {
    const show = mediaPanel.classList.contains('hidden');
    mediaPanel.classList.toggle('hidden', !show);
    mediaToggle.textContent = show ? 'Collapse' : 'Expand';
    if (show && !mediaLoaded) fetchMedia();
  });

  mediaTabs.forEach(btn => btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;
    setMediaTab(cat);
    renderMedia(cat);
  }));

  mediaUpload?.addEventListener('click', () => {
    const cat = document.querySelector('.media-tab.active')?.dataset.cat || 'labs';
    const title = (mediaTitle?.value || '').trim();
    const file = mediaFile?.files?.[0] || null;
    if (!title) { if (mediaMsg) mediaMsg.textContent = 'Title required.'; return; }
    if (!file) { if (mediaMsg) mediaMsg.textContent = 'Scan or upload a file first.'; return; }

    const fd = new FormData();
    fd.append('patient_id', patientId);
    fd.append('category', cat);
    fd.append('title', title);
    fd.append('file', file);

    mediaMsg.textContent = 'Uploading...';
    fetch('/medical_clinic/api/patient_media_upload.php', {
      method: 'POST',
      headers: { ...AppUtils.authHeaders() },
      body: fd
    }).then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d }))).then(({ ok, status, data }) => {
      if (!ok || data.ok === false) throw new Error(data.error || `Upload failed (${status})`);
      const m = data.media || {};
      const catKey = (m.category || cat).toLowerCase();
      if (!mediaState[catKey]) mediaState[catKey] = [];
      mediaState[catKey].unshift({
        id: m.id,
        title: m.title,
        meta: m.file_path || file.name,
        url: m.url,
        created_at: m.created_at
      });
      renderMedia(catKey);
      if (mediaTitle) mediaTitle.value = '';
      if (mediaFile) mediaFile.value = '';
      if (mediaMsg) mediaMsg.textContent = 'Uploaded';
      AppUtils.toast('Media uploaded', true);
    }).catch(err => {
      if (mediaMsg) mediaMsg.textContent = err.message || 'Upload failed';
      AppUtils.toast(err.message || 'Upload failed', false);
    });
  });

  if (mediaTabs.length) {
    setMediaTab('labs');
    renderMedia('labs'); renderMedia('imaging'); renderMedia('reports');
  }

  mediaPanel?.addEventListener('click', async (e) => {
    const del = e.target.closest('.media-delete');
    if (!del) return;
    const id = Number(del.dataset.id || 0);
    const cat = del.dataset.cat || 'labs';
    if (!id) return;
    if (!await AppUtils.confirmDialog('Delete this media item?')) return;
    try {
      const res = await fetch('/medical_clinic/api/patient_media_delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Delete failed');
      mediaState[cat] = (mediaState[cat] || []).filter(m => String(m.id) !== String(id));
      renderMedia(cat);
      AppUtils.toast('Media deleted', true);
    } catch (err) {
      AppUtils.toast(err.message || 'Delete failed', false);
    }
  });

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
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="9" class="empty">No records</td></tr>`; return; }
    tbody.innerHTML = rows.map(r => {
      const time = (r.start_time || '') + (r.end_time ? ' - ' + r.end_time : '');
      const statusClass = AppUtils.cssSafe(r.status || '');
      const safeSummary = AppUtils.escapeHtml(r.summary || '');
      const safeComment = AppUtils.escapeHtml(r.comment || '');
      return `<tr data-apptid="${r.id}">
        <td>${r.date || ''}</td>
        <td>${time}</td>
        <td>${AppUtils.escapeHtml(r.doctor_name || r.doctor || '')}</td>
        <td>${AppUtils.escapeHtml(r.room || r.room_name || '')}</td>
        <td>${AppUtils.escapeHtml(r.type || '')}</td>
        <td><span class="status-badge status-${statusClass}">${AppUtils.escapeHtml(r.status || '')}</span></td>
        <td class="sum">${AppUtils.escapeHtml(r.summary || '')}</td>
        <td class="notes-cell">
          <button class="btn-small note-toggle" type="button">Show</button>
          <div class="note-panel" hidden>
            <div><strong>Summary:</strong> ${safeSummary || '<span class="muted-small">None</span>'}</div>
            <div style="margin-top:6px;"><strong>Comment:</strong> ${safeComment || '<span class="muted-small">None</span>'}</div>
          </div>
        </td>
        <td class="actions">
          <button class="btn-small view-btn" type="button">Details</button>
          ${isFuture ? `<button class="btn-small edit-btn-appt" type="button">Edit</button><button class="btn-small ghost cancel-btn-appt" type="button">Cancel</button>` : ''}
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
      if (ev.target.classList.contains('note-toggle')) {
        const panel = tr.querySelector('.note-panel');
        if (panel) {
          const hidden = panel.hasAttribute('hidden');
          if (hidden) { panel.removeAttribute('hidden'); ev.target.textContent = 'Hide'; }
          else { panel.setAttribute('hidden', 'hidden'); ev.target.textContent = 'Show'; }
        }
      } else if (ev.target.classList.contains('view-btn')) {
        openDrawerView(apptId, isFuture, tr);
      } else if (ev.target.classList.contains('edit-btn-appt') && isFuture) {
        openDrawerEdit(apptId, tr);
      } else if (ev.target.classList.contains('cancel-btn-appt') && isFuture) {
        cancelAppointment(apptId, tr);
      }
    });
  }

  async function cancelAppointment(apptId, tr) {
    const ok = await AppUtils.confirmDialog('Cancel this appointment?');
    if (!ok) return;
    try {
      const res = await fetch('/medical_clinic/api/appointment_cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id: Number(apptId) })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Cancel failed');
      const badge = tr.querySelector('.status-badge');
      if (badge) { badge.textContent = 'canceled'; badge.className = 'status-badge status-canceled'; }
      tr.querySelector('.actions').innerHTML = '<span class="muted-small">Canceled</span>';
      const cached = apptCache.get(String(apptId)) || {};
      cached.status = 'canceled';
      apptCache.set(String(apptId), cached);
    } catch (e) {
      AppUtils.toast(e.message || 'Cancel failed', false);
    }
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
    dRefs.vitals.textContent = '—';
  }

  async function openDrawerView(apptId, isFutureRow, tr) {
    currentApptId = apptId;
    isFutureView = !!isFutureRow;
    drawerMode = 'view';

    prefillDrawerFromRow(tr);
    dRefs.editBtn.style.display = isFutureView ? 'inline-block' : 'none';
    dRefs.editBtn.onclick = () => openDrawerEdit(apptId, tr);

    openDrawer();

    const a = apptCache.get(String(apptId));
    if (a) {
      dRefs.summary.value = a.summary ?? dRefs.summary.value;
      dRefs.comment.value = a.comment ?? dRefs.comment.value;
      dRefs.date.textContent = a.date ?? dRefs.date.textContent;
      if (a.from_time && a.to_time) dRefs.time.textContent = `${a.from_time} - ${a.to_time}`;
      dRefs.doctor.textContent = a.doctor_name ?? a.doctor ?? dRefs.doctor.textContent;
      dRefs.room.textContent = a.room ?? a.room_name ?? dRefs.room.textContent;
      dRefs.type.textContent = a.type ?? dRefs.type.textContent;
      dRefs.status.textContent = a.status ?? dRefs.status.textContent;
      const vitalsStr = [
        a.vitals_bp ? `BP ${a.vitals_bp}` : '',
        a.vitals_hr ? `HR ${a.vitals_hr}` : '',
        a.vitals_temp ? `Temp ${a.vitals_temp}` : '',
        a.vitals_rr ? `RR ${a.vitals_rr}` : '',
        a.vitals_spo2 ? `SpO₂ ${a.vitals_spo2}` : ''
      ].filter(Boolean).join(' | ');
      dRefs.vitals.textContent = vitalsStr || (a.vitals_notes || '—');
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
      const cached = apptCache.get(String(currentApptId)) || {};
      apptCache.set(String(currentApptId), { ...cached, summary: dRefs.summary.value, comment: dRefs.comment.value });
      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(() => { dRefs.saveBtn.textContent = 'Save'; }, 800);
    } catch (e) {
      AppUtils.toast(e.message || 'Save error', false);
    }
  }

  async function openDrawerEdit(apptId, tr) {
    currentApptId = apptId;
    isFutureView = true;
    drawerMode = 'edit';

    document.querySelectorAll('.drawer-body .field-row').forEach(r => r.style.display = 'none');
    dRefs.editBtn.style.display = 'none';
    if (baseDrawerBody) baseDrawerBody.style.display = 'none';

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
        <div class="field-row"><div class="label">BP</div><div class="value"><input id="e-bp" type="text" placeholder="120/80"></div></div>
        <div class="field-row"><div class="label">HR</div><div class="value"><input id="e-hr" type="text" placeholder="72"></div></div>
        <div class="field-row"><div class="label">Temp</div><div class="value"><input id="e-temp" type="text" placeholder="37.0°C"></div></div>
        <div class="field-row"><div class="label">RR</div><div class="value"><input id="e-rr" type="text" placeholder="16"></div></div>
        <div class="field-row"><div class="label">SpO₂</div><div class="value"><input id="e-spo2" type="text" placeholder="98%"></div></div>
        <div class="field-row" style="align-items:start;"><div class="label">Vitals notes</div><div class="value"><textarea id="e-vitals-notes" class="note-input" placeholder="Additional vitals notes"></textarea></div></div>
      `;
      drawer.querySelector('.drawer-footer').before(editForm);
    } else {
      editForm.style.display = '';
    }

    const td = (idx) => tr.querySelector(`td:nth-child(${idx})`)?.textContent?.trim() || '';
    document.getElementById('e-date').value = AppUtils.toISODate(td(1));
    const times = (td(2) || '').split(' - ');
    document.getElementById('e-from').value = AppUtils.toISOTm(times[0] || '');
    document.getElementById('e-to').value = AppUtils.toISOTm(times[1] || '');
    document.getElementById('e-type').value = td(5);
    document.getElementById('e-summary').value = tr.querySelector('.sum')?.textContent?.trim() || '';
    document.getElementById('e-comment').value = '';
    document.getElementById('e-bp').value = '';
    document.getElementById('e-hr').value = '';
    document.getElementById('e-temp').value = '';
    document.getElementById('e-rr').value = '';
    document.getElementById('e-spo2').value = '';
    document.getElementById('e-vitals-notes').value = '';

    await populateDoctorsRooms();

    const a = apptCache.get(String(apptId));
    if (a) {
      if (a.date) document.getElementById('e-date').value = AppUtils.toISODate(a.date);
      if (a.from_time) document.getElementById('e-from').value = AppUtils.toISOTm(a.from_time);
      if (a.to_time) document.getElementById('e-to').value = AppUtils.toISOTm(a.to_time);
      if (a.type) document.getElementById('e-type').value = a.type;
      if (a.summary != null) document.getElementById('e-summary').value = a.summary;
      if (a.comment != null) document.getElementById('e-comment').value = a.comment;
      if (a.doctorId) document.getElementById('e-doctor').value = String(a.doctorId);
      if (a.roomId || a.roomID) document.getElementById('e-room').value = String(a.roomId || a.roomID);
      if (a.vitals_bp != null) document.getElementById('e-bp').value = a.vitals_bp;
      if (a.vitals_hr != null) document.getElementById('e-hr').value = a.vitals_hr;
      if (a.vitals_temp != null) document.getElementById('e-temp').value = a.vitals_temp;
      if (a.vitals_rr != null) document.getElementById('e-rr').value = a.vitals_rr;
      if (a.vitals_spo2 != null) document.getElementById('e-spo2').value = a.vitals_spo2;
      if (a.vitals_notes != null) document.getElementById('e-vitals-notes').value = a.vitals_notes;
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
      comment: document.getElementById('e-comment').value,
      vitals_bp: document.getElementById('e-bp').value,
      vitals_hr: document.getElementById('e-hr').value,
      vitals_temp: document.getElementById('e-temp').value,
      vitals_rr: document.getElementById('e-rr').value,
      vitals_spo2: document.getElementById('e-spo2').value,
      vitals_notes: document.getElementById('e-vitals-notes').value
    };
    if (!payload.date || !payload.from_time || !payload.to_time || !payload.doctorId || !payload.roomId) {
      AppUtils.toast('Please fill date, time, doctor and room.', false);
      return;
    }
    try {
      const res = await fetch('/medical_clinic/api/appointment_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { AppUtils.toast(data.error || 'Time conflict with another appointment.', false); return; }
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to update');

      tr.querySelector('td:nth-child(1)').textContent = payload.date;
      tr.querySelector('td:nth-child(2)').textContent = `${payload.from_time.slice(0, 5)}–${payload.to_time.slice(0, 5)}`;
      tr.querySelector('td:nth-child(3)').textContent = document.getElementById('e-doctor').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(4)').textContent = document.getElementById('e-room').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(5)').textContent = payload.type || '';
      tr.querySelector('.sum').textContent = payload.summary || '';
      const notesPanel = tr.querySelector('.note-panel');
      if (notesPanel) {
        notesPanel.innerHTML = `
            <div><strong>Summary:</strong> ${AppUtils.escapeHtml(payload.summary || '') || '<span class="muted-small">None</span>'}</div>
            <div style="margin-top:6px;"><strong>Comment:</strong> ${AppUtils.escapeHtml(payload.comment || '') || '<span class="muted-small">None</span>'}</div>
          `;
      }
      const cached = apptCache.get(String(payload.id)) || {};
      apptCache.set(String(payload.id), { ...cached, ...payload, doctor_name: tr.querySelector('td:nth-child(3)').textContent, room: tr.querySelector('td:nth-child(4)').textContent });
      const vitalsStr = [
        payload.vitals_bp ? `BP ${payload.vitals_bp}` : '',
        payload.vitals_hr ? `HR ${payload.vitals_hr}` : '',
        payload.vitals_temp ? `Temp ${payload.vitals_temp}` : '',
        payload.vitals_rr ? `RR ${payload.vitals_rr}` : '',
        payload.vitals_spo2 ? `SpO₂ ${payload.vitals_spo2}` : ''
      ].filter(Boolean).join(' | ');
      dRefs.vitals.textContent = vitalsStr || (payload.vitals_notes || '—');

      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(closeDrawer, 400);
    } catch (e) {
      AppUtils.toast(e.message || 'Update error', false);
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
    const from = AppUtils.normalizeTime(document.getElementById('apptFrom').value);
    const to = AppUtils.normalizeTime(document.getElementById('apptTo').value);
    const patientId = Number(document.getElementById('apptPatient').value || 0);
    const doctorId = Number(document.getElementById('apptDoctor').value || 0);
    const roomId = Number(document.getElementById('apptRoom').value || 0);
    const type = document.getElementById('apptType').value;
    const summary = document.getElementById('apptSummary').value;
    const comment = document.getElementById('apptComment').value;
    const vitals_bp = document.getElementById('apptBp').value;
    const vitals_hr = document.getElementById('apptHr').value;
    const vitals_temp = document.getElementById('apptTemp').value;
    const vitals_rr = document.getElementById('apptRr').value;
    const vitals_spo2 = document.getElementById('apptSpo2').value;
    const vitals_notes = document.getElementById('apptVitalsNotes').value;

    if (!date || !from || !to || !patientId || !doctorId || !roomId) {
      document.getElementById('formMsg').textContent = 'Please fill all required fields.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/appointment_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ date, from_time: from, to_time: to, patientId, doctorId, roomId, type, summary, comment,
          vitals_bp, vitals_hr, vitals_temp, vitals_rr, vitals_spo2, vitals_notes })
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
  const modal = document.getElementById('doctorEditModal');
  const form = document.getElementById('doctorEditForm');
  const closeBtn = document.getElementById('doctorEditClose');
  const cancelBtn = document.getElementById('doctorEditCancel');
  const msgBox = document.getElementById('doctorEditMsg');
  const idInput = document.getElementById('doctorEditId');
  const firstInput = document.getElementById('doctorEditFirst');
  const middleInput = document.getElementById('doctorEditMiddle');
  const lastInput = document.getElementById('doctorEditLast');
  const syndInput = document.getElementById('doctorEditSyndicate');
  const phoneInput = document.getElementById('doctorEditPhone');

  let doctors = [];

  function showModal(show) {
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function openEdit(id) {
    const doc = doctors.find(d => String(d.id) === String(id));
    if (!doc) return;
    idInput.value = doc.id;
    firstInput.value = doc.fName || '';
    middleInput.value = doc.mName || '';
    lastInput.value = doc.lName || '';
    syndInput.value = doc.SyndicateNum || '';
    phoneInput.value = doc.phone || '';
    msgBox.textContent = '';
    showModal(true);
  }

  async function load(q = '') {
    msg.textContent = 'Loading...';
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Loading...</td></tr>';
    const url = q ? `${API_BASE}/doctors.php?q=${encodeURIComponent(q)}` : `${API_BASE}/doctors.php`;
    try {
      const res = await fetch(url, { headers: AppUtils.authHeaders() });
      const data = await res.json();
      doctors = data?.doctors || [];
      if (!doctors.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No doctors found</td></tr>';
        msg.textContent = '0 results';
        return;
      }
      tbody.innerHTML = doctors.map(d => `<tr data-id="${d.id}">
        <td>${d.id}</td>
        <td>${AppUtils.escapeHtml(d.fName || '')}</td>
        <td>${AppUtils.escapeHtml(d.mName || '')}</td>
        <td>${AppUtils.escapeHtml(d.lName || '')}</td>
        <td>${AppUtils.escapeHtml(d.SyndicateNum || '')}</td>
        <td>${AppUtils.escapeHtml(d.phone || '')}</td>
        <td><button class="btn-link" data-action="edit">Edit</button> <button class="btn-link danger" data-action="delete">Delete</button></td>
      </tr>`).join('');
      msg.textContent = `${doctors.length} doctor(s)`;
    } catch (err) {
      console.error(err);
      msg.textContent = 'Error loading doctors';
      tbody.innerHTML = '<tr><td colspan="9" class="empty">Error loading data</td></tr>';
    }
  }

  async function saveDoctor(e) {
    e.preventDefault();
    msgBox.textContent = 'Saving...';
    const payload = {
      id: Number(idInput.value),
      fName: firstInput.value.trim(),
      mName: middleInput.value.trim(),
      lName: lastInput.value.trim(),
      SyndicateNum: syndInput.value.trim(),
      phone: phoneInput.value.trim()
    };
    if (!payload.fName || !payload.lName) {
      msgBox.textContent = 'First and last name are required.';
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/doctor_update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error(data.error || 'Update failed');
      msgBox.textContent = 'Saved';
      setTimeout(() => { showModal(false); load(search.value.trim()); }, 200);
    } catch (err) {
      msgBox.textContent = err.message || 'Error saving doctor';
    }
  }

  async function deleteDoctor(id) {
    const res = await fetch(`${API_BASE}/doctor_delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      AppUtils.toast(data.error || 'Doctor has scheduled/checked-in appointments.', false);
      return false;
    }
    if (!res.ok || data.ok !== true) throw new Error(data.error || 'Delete failed');
    return true;
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const tr = e.target.closest('tr');
    const id = tr?.getAttribute('data-id');
    if (!id) return;

    if (btn.dataset.action === 'edit') {
      openEdit(id);
    } else if (btn.dataset.action === 'delete') {
      if (!await AppUtils.confirmDialog('Delete this doctor?')) return;
      try {
        const ok = await deleteDoctor(Number(id));
        if (ok) load(search.value.trim());
      } catch (err) {
        AppUtils.toast(err.message || 'Delete failed', false);
      }
    }
  });

  form?.addEventListener('submit', saveDoctor);
  [closeBtn, cancelBtn].forEach(el => el?.addEventListener('click', () => showModal(false)));
  document.getElementById('doctorSearchBtn')?.addEventListener('click', () => load(search.value.trim()));
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); load(search.value.trim()); } });
  load();
})();

// ===== DOCTOR NEW PAGE =====
(function() {
  const form = document.getElementById('doctorForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = document.getElementById('doctorFirst').value.trim();
    const middle = document.getElementById('doctorMiddle').value.trim();
    const last = document.getElementById('doctorLast').value.trim();
    const syndicate = document.getElementById('doctorSyndicate').value.trim();
    const phone = document.getElementById('doctorPhone').value.trim();

    if (!first || !last) {
      document.getElementById('formMsg').textContent = 'First and last name required.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/doctor_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ fName: first, mName: middle, lName: last, SyndicateNum: syndicate, phone })
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
  const modal = document.getElementById('roomEditModal');
  const form = document.getElementById('roomEditForm');
  const closeBtn = document.getElementById('roomEditClose');
  const cancelBtn = document.getElementById('roomEditCancel');
  const msgBox = document.getElementById('roomEditMsg');
  const idInput = document.getElementById('roomEditId');
  const typeInput = document.getElementById('roomEditType');

  let rooms = [];

  function showModal(show) {
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function openEdit(id) {
    const room = rooms.find(r => String(r.id) === String(id));
    if (!room) return;
    idInput.value = room.id;
    typeInput.value = room.type || '';
    msgBox.textContent = '';
    showModal(true);
  }

  async function load(q = '') {
    msg.textContent = 'Loading...';
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Loading...</td></tr>';
    const url = q ? `${API_BASE}/rooms.php?q=${encodeURIComponent(q)}` : `${API_BASE}/rooms.php`;
    try {
      const res = await fetch(url, { headers: AppUtils.authHeaders() });
      const data = await res.json();
      rooms = data?.rooms || [];
      if (!rooms.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">No rooms found</td></tr>';
        msg.textContent = '0 results';
        return;
      }
      tbody.innerHTML = rooms.map(r => `<tr data-id="${r.id}">
        <td>${r.id}</td>
        <td>${AppUtils.escapeHtml(r.type || '')}</td>
        <td>${AppUtils.escapeHtml(r.created_at || '')}</td>
        <td><button class="btn-link" data-action="edit">Edit</button> <button class="btn-link danger" data-action="delete">Delete</button></td>
      </tr>`).join('');
      msg.textContent = `${rooms.length} room(s)`;
    } catch (err) {
      console.error(err);
      msg.textContent = 'Error loading rooms';
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Error loading data</td></tr>';
    }
  }

  async function saveRoom(e) {
    e.preventDefault();
    msgBox.textContent = 'Saving...';
    const payload = { id: Number(idInput.value), type: typeInput.value.trim() };
    if (!payload.type) { msgBox.textContent = 'Type is required.'; return; }
    try {
      const res = await fetch(`${API_BASE}/room_update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error(data.error || 'Update failed');
      msgBox.textContent = 'Saved';
      setTimeout(() => { showModal(false); load(search.value.trim()); }, 200);
    } catch (err) {
      msgBox.textContent = err.message || 'Error saving room';
    }
  }

  async function deleteRoom(id) {
    const res = await fetch(`${API_BASE}/room_delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      AppUtils.toast(data.error || 'Room has scheduled/checked-in appointments.', false);
      return false;
    }
    if (!res.ok || data.ok !== true) throw new Error(data.error || 'Delete failed');
    return true;
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const tr = e.target.closest('tr');
    const id = tr?.getAttribute('data-id');
    if (!id) return;

    if (btn.dataset.action === 'edit') {
      openEdit(id);
    } else if (btn.dataset.action === 'delete') {
      if (!await AppUtils.confirmDialog('Delete this room?')) return;
      try {
        const ok = await deleteRoom(Number(id));
        if (ok) load(search.value.trim());
      } catch (err) {
        AppUtils.toast(err.message || 'Delete failed', false);
      }
    }
  });

  form?.addEventListener('submit', saveRoom);
  [closeBtn, cancelBtn].forEach(el => el?.addEventListener('click', () => showModal(false)));
  document.getElementById('roomSearchBtn')?.addEventListener('click', () => load(search.value.trim()));
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); load(search.value.trim()); } });
  load();
})();

// ===== ROOM NEW PAGE =====
(function() {
  const form = document.getElementById('roomForm');
  if (!form) return;

  const API_BASE = '/medical_clinic/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('roomType').value.trim();

    if (!type) {
      document.getElementById('formMsg').textContent = 'Room type is required.';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/room_create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ type })
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
        if (!await AppUtils.confirmDialog('Cancel this waitlist entry?')) return;
        try {
          await updateWaitlistStatus(id, 'canceled', null, null);
          const idx = activeRows.findIndex(r => r.id === id);
          if (idx > -1) { const moved = activeRows.splice(idx,1)[0]; moved.status='canceled'; expiredRows.unshift(moved); }
          renderBoth();
          await refreshListsAndRender();
        } catch(e){ AppUtils.toast(e.message || 'Cancel failed', false); }
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
    if (!date || !from || !to || !doctorId || !roomId) { AppUtils.toast('Fill date, time, doctor, room', false); return; }

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
      if (j.status === 409) { AppUtils.toast(j.data?.error || 'Time conflict', false); return; }
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
      AppUtils.toast('Appointment created and waitlist item scheduled.', true);
    } catch(e){ AppUtils.toast(e.message || 'Error while scheduling', false); }
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
    const formatTime = (dt) => dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Context menu UI
    const menu = document.createElement('div');
    menu.id = 'fc-context-menu';
    menu.style.position = 'absolute';
    menu.style.background = '#fff';
    menu.style.border = '1px solid #e5e7eb';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
    menu.style.borderRadius = '6px';
    menu.style.padding = '6px 0';
    menu.style.minWidth = '220px';
    menu.style.fontSize = '14px';
    menu.style.zIndex = '9999';
    menu.style.display = 'none';
    menu.style.color = '#111827';
    document.body.appendChild(menu);

    function hideMenu() { menu.style.display = 'none'; }
    document.addEventListener('click', hideMenu);
    window.addEventListener('resize', hideMenu);

    function setMenuItems(items, x, y) {
      menu.innerHTML = items.map(it => `<button data-action="${it.action}" class="ctx-item" style="display:flex; width:100%; padding:10px 14px; border:0; background:transparent; color:${it.danger ? '#b91c1c' : '#111827'}; text-align:left; cursor:pointer;">${it.label}</button>`).join('');
      menu.querySelectorAll('.ctx-item').forEach(btn => {
        btn.addEventListener('mouseover', () => btn.style.background = '#f3f4f6');
        btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
      });
      menu.style.display = 'block';
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }

    async function updateStatus(id, status) {
      const res = await fetch('/medical_clinic/api/appointment_status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Status update failed');
    }

    async function cancelAppointment(id) {
      const res = await fetch('/medical_clinic/api/appointment_cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Cancel failed');
    }

    async function moveAppointment(id, start, end) {
      const res = await fetch('/medical_clinic/api/appointment_move.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
        body: JSON.stringify({ id, start, end })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Move failed');
      return data;
    }

    function fmt(dt) {
      if (!dt) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    }

    // Calendar edit modal
    const calEditModal   = document.getElementById('calEditModal');
    const calEditClose   = document.getElementById('calEditClose');
    const calEditCancel  = document.getElementById('calEditCancel');
    const calEditForm    = document.getElementById('calEditForm');
    const calEditId      = document.getElementById('calEditId');
    const calEditDate    = document.getElementById('calEditDate');
    const calEditFrom    = document.getElementById('calEditFrom');
    const calEditTo      = document.getElementById('calEditTo');
    const calEditDoctor  = document.getElementById('calEditDoctor');
    const calEditRoom    = document.getElementById('calEditRoom');
    const calEditType    = document.getElementById('calEditType');
    const calEditSummary = document.getElementById('calEditSummary');
    const calEditComment = document.getElementById('calEditComment');
    const calEditMsg     = document.getElementById('calEditMsg');
    let calCurrentEvent  = null;
    let docOptions = [];
    let roomOptions = [];
    const calTitle = document.getElementById('calTitle');

    const btnToday = document.getElementById('todayBtn');
    const btnWeek  = document.getElementById('weekBtn');
    const btnDay   = document.getElementById('dayBtn');
    const dateJump = document.getElementById('calDateInput');

    async function loadDoctorOptions() {
      if (docOptions.length) return;
      try {
        const res = await fetch('/medical_clinic/api/doctors.php?list=1', { headers: AppUtils.authHeaders() });
        const data = await res.json();
        docOptions = data?.doctors || [];
      } catch {}
    }

    async function loadRoomOptions() {
      if (roomOptions.length) return;
      try {
        const res = await fetch('/medical_clinic/api/rooms.php?list=1', { headers: AppUtils.authHeaders() });
        const data = await res.json();
        roomOptions = data?.rooms || [];
      } catch {}
    }

    function fillSelect(selectEl, opts, makeLabel) {
      if (!selectEl) return;
      selectEl.innerHTML = opts.map(o => `<option value="${o.id}">${makeLabel(o)}</option>`).join('');
    }

    function openCalEdit(event) {
      calCurrentEvent = event;
      const start = event.start;
      const end   = event.end;
      const pad = (n) => String(n).padStart(2, '0');
      const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

      calEditId.value = event.id;
      calEditDate.value = start ? toDateInput(start) : '';
      calEditFrom.value = start ? toTimeInput(start) : '';
      calEditTo.value = end ? toTimeInput(end) : '';
      calEditType.value = event.extendedProps?.type || '';
      calEditSummary.value = event.extendedProps?.summary || '';
      calEditComment.value = event.extendedProps?.comment || '';

      // Options
      if (docOptions.length) fillSelect(calEditDoctor, docOptions, (o) => o.name || `Dr. ${o.id}`);
      if (roomOptions.length) fillSelect(calEditRoom, roomOptions, (o) => o.name || `Room ${o.id}`);

      if (event.extendedProps?.doctorID) calEditDoctor.value = String(event.extendedProps.doctorID);
      if (event.extendedProps?.roomID) calEditRoom.value = String(event.extendedProps.roomID);

      calEditMsg.textContent = '';
      if (calEditModal) {
        calEditModal.classList.remove('hidden');
        calEditModal.setAttribute('aria-hidden', 'false');
      }
    }

    function closeCalEdit() {
      calCurrentEvent = null;
      if (calEditModal) {
        calEditModal.classList.add('hidden');
        calEditModal.setAttribute('aria-hidden', 'true');
      }
    }

    [calEditClose, calEditCancel].forEach(btn => btn && btn.addEventListener('click', closeCalEdit));

    calEditForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!calCurrentEvent) return;
      calEditMsg.textContent = 'Saving...';
      const payload = {
        id: Number(calEditId.value),
        date: calEditDate.value,
        from_time: AppUtils.normalizeTime(calEditFrom.value),
        to_time: AppUtils.normalizeTime(calEditTo.value),
        doctorId: Number(calEditDoctor.value || 0),
        roomId: Number(calEditRoom.value || 0),
        type: calEditType.value.trim(),
        summary: calEditSummary.value,
        comment: calEditComment.value
      };
      if (!payload.date || !payload.from_time || !payload.to_time || !payload.doctorId || !payload.roomId) {
        calEditMsg.textContent = 'Fill date, times, doctor, room.';
        return;
      }
      try {
        const res = await fetch('/medical_clinic/api/appointment_update.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...AppUtils.authHeaders() },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) { calEditMsg.textContent = data.error || 'Time conflict'; return; }
        if (!res.ok || data.ok === false) throw new Error(data.error || 'Update failed');
        calEditMsg.textContent = 'Saved';
        closeCalEdit();
        cal.refetchEvents();
      } catch (err) {
        calEditMsg.textContent = err.message || 'Failed to save';
      }
    });

    const cal = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      height: 'auto',
      slotMinTime: '07:00:00',
      slotMaxTime: '20:00:00',
      slotDuration: '00:15:00',
      editable: true,
      eventResizableFromStart: true,
      events: async (info, successCallback, failureCallback) => {
        try {
          const url = `/medical_clinic/api/appointments_range.php?start=${info.start.toISOString().split('T')[0]}&end=${info.end.toISOString().split('T')[0]}`;
          const res = await fetch(url, { headers: AppUtils.authHeaders() });
          if (!res.ok) throw new Error(`Calendar fetch failed (${res.status})`);

          const data = await res.json();
          const rows = Array.isArray(data) ? data : (data.appointments || data.data || []);

      const events = rows.map(a => {
        const ext = a.extendedProps || {};
        const start = (a.start || '').replace(' ', 'T') || (a.date && a.from_time ? `${a.date}T${a.from_time}` : '');
        const end   = (a.end   || '').replace(' ', 'T') || (a.date && a.to_time   ? `${a.date}T${a.to_time}`   : '');

        return {
          id: a.id,
          title: a.title || a.patient_name || 'Appointment',
          start,
          end,
          extendedProps: {
            patientID: a.patientID || ext.patientID,
            doctorID: a.doctorID || ext.doctorID,
            roomID: a.roomID || ext.roomID,
            doctor: ext.doctor || a.doctor || a.doctor_name,
            room: ext.room || a.room || a.room_name || a.room_type,
            status: ext.status || a.status,
            type: a.type || ext.type,
            summary: a.summary || ext.summary,
            comment: a.comment || ext.comment
          }
        };
      }).filter(ev => ev.start && ev.end);

          successCallback(events);
        } catch (err) {
          console.error('Failed to load events', err);
          failureCallback(err);
        }
      },
      eventDidMount: (info) => {
        const props = info.event.extendedProps || {};
        const statusLower = String(props.status || '').toLowerCase();
        const colorMap = {
          scheduled: '#2563eb',
          'checked in': '#22c55e',
          'checked-in': '#22c55e',
          'checked out': '#ef4444',
          'checked-out': '#ef4444',
          completed: '#ef4444',
          'no-show': '#6b7280',
          canceled: '#9ca3af',
          cancelled: '#9ca3af'
        };
        const baseColor = colorMap[statusLower] || '#2563eb';
        info.el.style.backgroundColor = baseColor;
        info.el.style.borderColor = baseColor;
        info.el.style.color = '#fff';

        const start = formatTime(info.event.start);
        const end = formatTime(info.event.end);
        const doctor = props.doctor ? `Doctor: ${props.doctor}` : '';
        const room = props.room ? `Room: ${props.room}` : '';
        const status = props.status ? `Status: ${props.status}` : '';
        const time = start && end ? `Time: ${start} - ${end}` : '';
        const parts = [info.event.title, time, doctor, room, status].filter(Boolean);
        info.el.setAttribute('title', parts.join('\n'));

        info.el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const statusLower = String(props.status || '').toLowerCase();
          const isCheckedIn = ['checked in', 'checked-in', 'rescheduled'].includes(statusLower);
          const isCheckedOut = ['checked out', 'checked-out', 'completed', 'complete'].includes(statusLower);

          const items = [];
          if (!isCheckedIn) items.push({ label: 'Check in', action: 'checkin' });
          if (isCheckedIn && !isCheckedOut) items.push({ label: 'Check out', action: 'checkout' });
          if (isCheckedIn) items.push({ label: 'Cancel check in', action: 'cancel_checkin' });
          if (isCheckedOut) items.push({ label: 'Cancel check out', action: 'cancel_checkout' });
          if (!isCheckedIn && !isCheckedOut && statusLower === 'scheduled') {
            items.push({ label: 'Cancel appointment', action: 'cancel', danger: true });
            items.push({ label: 'Edit appointment', action: 'edit' });
          }

          setMenuItems(items, e.pageX, e.pageY);

          menu.querySelectorAll('.ctx-item').forEach(btn => {
            btn.onclick = async () => {
              hideMenu();
              try {
                const eventDate = info.event.start ? info.event.start.toISOString().slice(0,10) : '';
                const todayStr = new Date().toISOString().slice(0,10);

                if (btn.dataset.action === 'checkin') {
                  if (eventDate !== todayStr) {
                    AppUtils.toast('Check-in allowed only for today\'s appointments.', false);
                    return;
                  }
                  await updateStatus(info.event.id, 'checked in');
                } else if (btn.dataset.action === 'checkout') {
                  await updateStatus(info.event.id, 'checked out');
                } else if (btn.dataset.action === 'cancel_checkin') {
                  await updateStatus(info.event.id, 'scheduled');
                } else if (btn.dataset.action === 'cancel_checkout') {
                  if (eventDate !== todayStr) {
                    AppUtils.toast('Cancel checkout is allowed only for today\'s appointments.', false);
                    return;
                  }
                  await updateStatus(info.event.id, 'checked in');
                } else if (btn.dataset.action === 'cancel') {
                  const ok = await AppUtils.confirmDialog('Cancel this appointment?');
                  if (!ok) return;
                  await cancelAppointment(info.event.id);
                } else if (btn.dataset.action === 'edit') {
                  await Promise.all([loadDoctorOptions(), loadRoomOptions()]);
                  openCalEdit(info.event);
                  return;
                }
                cal.refetchEvents();
                AppUtils.toast('Updated', true);
              } catch (err) {
                AppUtils.toast(err.message || 'Action failed', false);
              }
            };
          });
        });
      }
      ,
      eventDrop: async (info) => {
        const statusLower = String(info.event.extendedProps?.status || '').toLowerCase();
        if (statusLower !== 'scheduled') {
          AppUtils.toast('Only scheduled appointments can be moved.', false);
          info.revert();
          return;
        }
        const start = fmt(info.event.start);
        const end = fmt(info.event.end);
        const ok = await AppUtils.confirmDialog(`Move appointment to ${start} - ${end}?`);
        if (!ok) { info.revert(); return; }
        try {
          await moveAppointment(info.event.id, start, end);
          AppUtils.toast('Appointment moved', true);
        } catch (err) {
          info.revert();
          AppUtils.toast(err.message || 'Move failed', false);
        }
      },
      eventResize: async (info) => {
        const statusLower = String(info.event.extendedProps?.status || '').toLowerCase();
        if (statusLower !== 'scheduled') {
          AppUtils.toast('Only scheduled appointments can be resized.', false);
          info.revert();
          return;
        }
        const start = fmt(info.event.start);
        const end = fmt(info.event.end);
        const ok = await AppUtils.confirmDialog(`Update time to ${start} - ${end}?`);
        if (!ok) { info.revert(); return; }
        try {
          await moveAppointment(info.event.id, start, end);
          AppUtils.toast('Time updated', true);
        } catch (err) {
          info.revert();
          AppUtils.toast(err.message || 'Update failed', false);
        }
      }
    });
    cal.render();

    
    // Topbar controls
    btnToday?.addEventListener('click', () => cal.today());
    btnWeek?.addEventListener('click', () => cal.changeView('timeGridWeek'));
    btnDay?.addEventListener('click', () => cal.changeView('timeGridDay'));
    dateJump?.addEventListener('change', () => { const v = dateJump.value; if (v) cal.gotoDate(v); });
    if (dateJump && !dateJump.value) { try { dateJump.value = new Date().toISOString().slice(0,10); } catch {} }
  }
})();
