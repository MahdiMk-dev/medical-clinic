(function () {
  const API_PAT    = 'http://localhost/medical_clinic/api/patients.php';
  const API_PAT_SHOW = 'http://localhost/medical_clinic/api/patient_show.php'; // fallback single fetch
  const API_DOC    = 'http://localhost/medical_clinic/api/doctors.php';
  const API_ROOM   = 'http://localhost/medical_clinic/api/rooms.php';
  const API_CREATE = 'http://localhost/medical_clinic/api/appointment_create.php';

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { window.location.href = '/medical_clinic/login.html'; return; }

  const urlParams = new URLSearchParams(location.search);
  const prefillPatientId = Number(urlParams.get('patientId') || 0);

  const patientSel    = document.getElementById('newPatient');
  const doctorSel     = document.getElementById('newDoctor');
  const roomSel       = document.getElementById('newRoom');

  const patientSearch = document.getElementById('patientSearch');
  const doctorSearch  = document.getElementById('doctorSearch');

  const newDate    = document.getElementById('newDate');
  const newFrom    = document.getElementById('newFrom');
  const newTo      = document.getElementById('newTo');
  const newType    = document.getElementById('newType');
  const newSummary = document.getElementById('newSummary');
  const newComment = document.getElementById('newComment');
  const newMsg     = document.getElementById('newMsg');
  const form       = document.getElementById('newForm');

  // default date = today
  newDate.value = new Date().toISOString().slice(0,10);

  // --- Helpers ---------------------------------------------------------------

  function displayName(p) {
    // handle either {name} or {first_name,last_name}
    const n = (p && p.name) ? p.name
      : [p?.first_name || '', p?.last_name || ''].join(' ').trim();
    return n || '(Unnamed)';
  }

  async function fetchPatientById(id) {
    // Try patients.php?id=ID first (if your endpoint supports it)
    try {
      const res = await fetch(`${API_PAT}?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // some APIs return {patient: {...}} or {patients:[...]}
        const p = data.patient || (Array.isArray(data.patients) ? data.patients.find(x => Number(x.id) === id) : null);
        if (p) return { id: Number(p.id), name: displayName(p) };
      }
    } catch {}
    // Fallback to patient_show.php?id=ID
    try {
      const res = await fetch(`${API_PAT_SHOW}?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.patient) {
          const p = data.patient;
          return { id: Number(p.id), name: displayName(p) };
        }
      }
    } catch {}
    return null;
  }

  async function loadPatients(q='') {
    const res = await fetch(`${API_PAT}?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const items = Array.isArray(data.patients) ? data.patients : [];

    // Build options from the list
    let optionsHtml = items.map(p =>
      `<option value="${p.id}">${escapeHtml(displayName(p))}</option>`
    ).join('');

    // Ensure prefill patient appears as the FIRST option even if not in the list
    if (prefillPatientId) {
      const exists = items.some(p => Number(p.id) === prefillPatientId);
      if (!exists) {
        const single = await fetchPatientById(prefillPatientId);
        if (single) {
          optionsHtml = `<option value="${single.id}">${escapeHtml(single.name)}</option>` + (optionsHtml ? '\n' + optionsHtml : '');
        }
      }
    }

    patientSel.innerHTML = optionsHtml;

    // Select prefill id if present
    if (prefillPatientId) {
      patientSel.value = String(prefillPatientId);
      // (optional) lock selection to avoid accidental change
      patientSel.disabled = true;
    }
  }

  async function loadDoctors(q='') {
    const res = await fetch(`${API_DOC}?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const items = Array.isArray(data.doctors) ? data.doctors : [];
    doctorSel.innerHTML = items.map(d => `<option value="${d.id}">${escapeHtml(d.name || [d.fName, d.lName].filter(Boolean).join(' '))}</option>`).join('');
  }

  async function loadRooms() {
    const res = await fetch(`${API_ROOM}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const items = Array.isArray(data.rooms) ? data.rooms : [];
    roomSel.innerHTML = items.map(r => `<option value="${r.id}">Room ${r.id}${r.type ? ' — ' + escapeHtml(r.type) : ''}</option>`).join('');
  }

  // --- Events ----------------------------------------------------------------

  patientSearch.addEventListener('input', debounce(() => loadPatients(patientSearch.value.trim()), 300));
  doctorSearch.addEventListener('input',  debounce(() => loadDoctors(doctorSearch.value.trim()), 300));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    newMsg.textContent = '';
    newMsg.style.color = '';

    const payload = {
      patientId: Number(patientSel.value || prefillPatientId || 0),
      doctorId:  Number(doctorSel.value),
      roomId:    Number(roomSel.value),
      date:      newDate.value,
      from_time: normalizeTime(newFrom.value),
      to_time:   normalizeTime(newTo.value),
      type:      (newType.value || 'Consultation'),
      summary:   newSummary.value.trim(),
      comment:   newComment.value.trim()
    };

    // Client validations (so you don’t hit “Missing id”)
    const errs = [];
    if (!payload.patientId) errs.push('Select a patient');
    if (!payload.doctorId)  errs.push('Select a doctor');
    if (!payload.roomId)    errs.push('Select a room');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) errs.push('Select a valid date');
    if (!payload.from_time) errs.push('Enter a valid start time');
    if (!payload.to_time)   errs.push('Enter a valid end time');
    if (payload.from_time && payload.to_time && payload.from_time >= payload.to_time) {
      errs.push('Start time must be earlier than end time');
    }

    if (errs.length) {
      newMsg.textContent = errs.join(' • ');
      newMsg.style.color = '#B00020';
      return;
    }

    newMsg.textContent = 'Creating…';

    try {
      const res = await fetch(API_CREATE, {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create');

      newMsg.textContent = 'Created!';
      newMsg.style.color = '#0E4B50';
      setTimeout(() => { window.location.href = '/medical_clinic/public/html/appointments.html'; }, 600);
    } catch (err) {
      console.error(err);
      newMsg.textContent = err.message || 'Error creating appointment.';
      newMsg.style.color = '#B00020';
    }
  });

  // --- Utils -----------------------------------------------------------------

  function normalizeTime(t) {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t + ':00';
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return '';
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // initial loads (ensure prefill patient is injected/selected)
  Promise.all([loadPatients(), loadDoctors(), loadRooms()]).catch(console.error);
})();
