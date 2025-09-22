(function () {
  const API_URL = 'http://localhost/medical_clinic/api/appointments.php';

  const dateInput   = document.getElementById('dateInput');
  const searchInput = document.getElementById('searchInput');
  const statusSel   = document.getElementById('statusFilter');
  const refreshBtn  = document.getElementById('refreshBtn');
  const tbody       = document.getElementById('apptBody');
  const table       = document.getElementById('apptTable');
  const statusMsg   = document.getElementById('statusMsg');

  // ===== Auth gate: ensure we have a token =====
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '/medical_clinic/login.html';
    return;
  }

  // ===== State =====
  let sortBy = 'time';
  let sortDir = 'asc';

  // Default date = today
  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.value = todayStr;

  // Fetch & render
  async function load() {
    statusMsg.textContent = 'Loading…';
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading…</td></tr>`;

    const params = new URLSearchParams({
      date: dateInput.value,
      q: searchInput.value.trim(),
      status: statusSel.value,
      sort_by: sortBy,
      sort_dir: sortDir
    });

    try {
      const res = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // if token expired or invalid
      if (res.status === 401) {
        statusMsg.textContent = 'Session expired. Please sign in again.';
        setTimeout(() => (window.location.href = '/medical_clinic/login.html'), 900);
        return;
      }

      let data = null;
      const text = await res.text();
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) {
        throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
      }

      renderTable(data?.appointments || []);
      statusMsg.textContent = `${(data?.appointments || []).length} appointment(s) on ${dateInput.value}`;
    } catch (err) {
      console.error(err);
      statusMsg.textContent = err.message || 'Failed to load appointments.';
      tbody.innerHTML = `<tr><td colspan="5" class="empty">Unable to load data</td></tr>`;
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No appointments</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.time}</td>
        <td>${escapeHtml(r.patient_name)}</td>
        <td>${escapeHtml(r.doctor_name)}</td>
        <td>${escapeHtml(r.reason || '')}</td>
        <td><span class="status-badge status-${cssSafe(r.status)}">${escapeHtml(r.status)}</span></td>
      </tr>
    `).join('');
  }

  // Sorting by header click
  table.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (key === sortBy) {
        sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
      } else {
        sortBy = key; sortDir = 'asc';
      }
      load();
    });
  });

  // Events
  dateInput.addEventListener('change', load);
  searchInput.addEventListener('input', debounce(load, 300));
  statusSel.addEventListener('change', load);
  refreshBtn.addEventListener('click', load);

  // Utils
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function cssSafe(s) { return String(s).replace(/\s+/g, '-'); }

  // initial load
  load();
})();
