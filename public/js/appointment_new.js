(function () {
  const API_PAT  = 'http://localhost/medical_clinic/api/patients.php';
  const API_DOC  = 'http://localhost/medical_clinic/api/doctors.php';
  const API_ROOM = 'http://localhost/medical_clinic/api/rooms.php';
  const API_CREATE = 'http://localhost/medical_clinic/api/appointment_create.php';

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { window.location.href = '/medical_clinic/public/html/login.html'; return; }

  const patientSel = document.getElementById('newPatient');
  const doctorSel  = document.getElementById('newDoctor');
  const roomSel    = document.getElementById('newRoom');

  const patientSearch = document.getElementById('patientSearch');
  const doctorSearch  = document.getElementById('doctorSearch');

  const newDate   = document.getElementById('newDate');
  const newFrom   = document.getElementById('newFrom');
  const newTo     = document.getElementById('newTo');
  const newType   = document.getElementById('newType');
  const newSummary= document.getElementById('newSummary');
  const newComment= document.getElementById('newComment');
  const newMsg    = document.getElementById('newMsg');
  const form      = document.getElementById('newForm');

  // default date = today
  newDate.value = new Date().toISOString().slice(0,10);

  async function loadPatients(q='') {
    const res = await fetch(`${API_PAT}?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    patientSel.innerHTML = (data.patients || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }
  async function loadDoctors(q='') {
    const res = await fetch(`${API_DOC}?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    doctorSel.innerHTML = (data.doctors || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }
  async function loadRooms() {
    const res = await fetch(`${API_ROOM}`, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    roomSel.innerHTML = (data.rooms || []).map(r => `<option value="${r.id}">Room ${r.id}${r.type ? ' — ' + escapeHtml(r.type) : ''}</option>`).join('');
  }

  patientSearch.addEventListener('input', debounce(() => loadPatients(patientSearch.value.trim()), 300));
  doctorSearch.addEventListener('input', debounce(() => loadDoctors(doctorSearch.value.trim()), 300));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    newMsg.textContent = 'Creating…';

    const payload = {
      patientId: Number(patientSel.value),
      doctorId: Number(doctorSel.value),
      roomId: Number(roomSel.value),
      date: newDate.value,
      from_time: newFrom.value,
      to_time: newTo.value,
      type: newType.value || null,
      summary: newSummary.value.trim(),
      comment: newComment.value.trim()
    };

    try {
      const res = await fetch(API_CREATE, {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      newMsg.textContent = 'Created!';
      setTimeout(() => { window.location.href = '/medical_clinic/public/html/appointments.html'; }, 600);
    } catch (err) {
      console.error(err);
      newMsg.textContent = err.message || 'Error creating appointment.';
    }
  });

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // initial loads
  Promise.all([loadPatients(), loadDoctors(), loadRooms()]).catch(console.error);
})();
