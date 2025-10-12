// ---------------- Auth guard + logout ----------------
(function(){
  const t = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!t) { location.href='./login.html'; return; }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', ()=>{
      localStorage.removeItem('token'); sessionStorage.removeItem('token'); location.href='./login.html';
    });
  }
})();

// ---------------- Page module ----------------
(function(){
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const params = new URLSearchParams(location.search);
  const patientId = params.get('id');
  if (!patientId) { alert('Missing patient id'); location.href='./patients.html'; return; }

  // link to prefill new appointment with this patient
  const addApptLink = document.getElementById('addApptLink');
  if (addApptLink) addApptLink.href = `./appointment_new.html?patientId=${encodeURIComponent(patientId)}`;

  const fieldMeta = {
    first_name: { type:'text',  label:'First name' },
    last_name:  { type:'text',  label:'Last name'  },
    phone:      { type:'text',  label:'Phone'      },
    email:      { type:'email', label:'Email'      },
    dob:        { type:'date',  label:'DOB'        },
    address:    { type:'text',  label:'Address'    }
  };

  // Drawer refs
  const drawer = document.getElementById('apptDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const dRefs = {
    date:    document.getElementById('d-date'),
    time:    document.getElementById('d-time'),
    doctor:  document.getElementById('d-doctor'),
    room:    document.getElementById('d-room'),
    type:    document.getElementById('d-type'),
    status:  document.getElementById('d-status'),
    summary: document.getElementById('d-summary'),
    comment: document.getElementById('d-comment'),
    editBtn: document.getElementById('drawerEditBtn'),
    saveBtn: document.getElementById('drawerSaveBtn'),
    cancelBtn: document.getElementById('drawerCancelBtn'),
    closeBtn: document.getElementById('drawerCloseBtn')
  };

  let currentApptId = null;
  let isFutureView = false;
  let drawerMode = 'view'; // 'view' | 'edit'
  let editForm = null;     // dynamically created in edit mode

  function openDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    backdrop.classList.add('open');
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    backdrop.classList.remove('open');
    currentApptId = null;
    drawerMode = 'view';
    if (editForm) { editForm.remove(); editForm = null; }
    document.querySelectorAll('.drawer-body .field-row').forEach(r => r.style.display = '');
    dRefs.editBtn.style.display = isFutureView ? 'inline-block' : 'none';
    dRefs.saveBtn.textContent = 'Save';
  }
  if (dRefs.closeBtn)  dRefs.closeBtn.addEventListener('click', closeDrawer);
  if (dRefs.cancelBtn) dRefs.cancelBtn.addEventListener('click', closeDrawer);
  if (backdrop)        backdrop.addEventListener('click', closeDrawer);

  // Load page
  load();

  async function load() {
    try {
      const res = await fetch(`/medical_clinic/api/patient_show.php?id=${encodeURIComponent(patientId)}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      const p = data.patient;
      const appts = data.appointments || [];

      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      const ptName = document.getElementById('ptName');
      if (ptName) ptName.textContent = fullName || ('Patient #' + p.id);

      // Fill demographic values
      setText('first_name', p.first_name || '');
      setText('last_name',  p.last_name  || '');
      setText('phone',      p.phone      || '');
      setText('email',      p.email      || '');
      setText('dob',        (p.dob || '').trim());
      setText('address',    p.address    || '');
      const createdAt = document.getElementById('val-created_at');
      if (createdAt) createdAt.textContent = p.created_at || '';

      // Hook edit buttons (demographics)
      document.querySelectorAll('.edit-btn[data-field]').forEach(btn => {
        btn.addEventListener('click', () => enterEdit(btn.dataset.field));
      });

      // Past/Future split
      const today = new Date(); today.setHours(0,0,0,0);
      const toDate = (s) => {
        const t = (s || '').trim();
        const d = new Date(t);
        if (!isNaN(d)) { d.setHours(0,0,0,0); return d; }
        const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        return new Date(NaN);
      };
      const past   = appts.filter(a => toDate(a.date) <  today)
                          .sort((a,b)=> (a.date+(a.start_time||'')).localeCompare(b.date+(b.start_time||'')));
      const future = appts.filter(a => toDate(a.date) >= today)
                          .sort((a,b)=> (a.date+(a.start_time||'')).localeCompare(b.date+(b.start_time||'')));

      renderTable('pastBody', past, false);
      renderTable('futureBody', future, true);

      // Persistent table actions
      bindTableActions('pastBody', false);
      bindTableActions('futureBody', true);

    } catch (e) {
      console.error(e);
      const pastBody = document.getElementById('pastBody');
      const futBody  = document.getElementById('futureBody');
      if (pastBody) pastBody.innerHTML = `<tr><td colspan="8" class="empty">Error</td></tr>`;
      if (futBody)  futBody.innerHTML  = `<tr><td colspan="8" class="empty">Error</td></tr>`;
    }
  }

  function setText(field, val){
    const el = document.getElementById('val-'+field);
    if (el) el.textContent = val;
  }

  function enterEdit(field){
    const meta = fieldMeta[field];
    const row = document.querySelector(`.kv td.actions-cell button[data-field="${field}"]`)?.closest('tr');
    if (!row) return;
    const valueCell = row.querySelector('.value-cell');
    const msg = row.querySelector('#msg-'+field);
    const valSpan = valueCell.querySelector('#val-'+field);
    const actionsCell = row.querySelector('.actions-cell');
    const editBtn = actionsCell.querySelector('.edit-btn');
    const oldVal = valSpan.textContent;

    const wrap = document.createElement('span');
    wrap.className = 'inline-edit';
    const inp = document.createElement('input');
    inp.type = meta.type;
    inp.value = oldVal;
    inp.id = 'edit-'+field;
    if (meta.type === 'date' && oldVal && oldVal.length>10) inp.value = oldVal.slice(0,10);
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'save-btn'; save.textContent = 'Save';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'cancel-btn'; cancel.textContent = 'Cancel';

    valSpan.style.display = 'none';
    valueCell.appendChild(wrap);
    wrap.appendChild(inp); wrap.appendChild(save); wrap.appendChild(cancel);
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

  async function updatePatientField(field, value){
    const allowed = ['first_name','last_name','phone','email','dob','address'];
    if (!allowed.includes(field)) throw new Error('Invalid field');
    const res = await fetch('/medical_clinic/api/patient_update.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ id: patientId, field, value })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update');
    return true;
  }

  function renderTable(tbodyId, rows, isFuture){
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty">No records</td></tr>`; return; }
    tbody.innerHTML = rows.map(r => {
      const time = (r.start_time || '') + (r.end_time ? '–' + r.end_time : '');
      const statusClass = cssSafe(r.status || '');
      return `
        <tr data-apptid="${r.id}">
          <td>${r.date || ''}</td>
          <td>${time}</td>
          <td>${escapeHtml(r.doctor_name || r.doctor || '')}</td>
          <td>${escapeHtml(r.room || r.room_name || '')}</td>
          <td>${escapeHtml(r.type || '')}</td>
          <td><span class="status-badge status-${statusClass}">${escapeHtml(r.status || '')}</span></td>
          <td class="sum">${escapeHtml(r.summary || '')}</td>
          <td class="actions">
            <button class="btn-small view-btn" type="button">View</button>
            ${isFuture ? `<button class="btn-small edit-btn-appt" type="button">Edit</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function bindTableActions(tbodyId, isFuture){
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

  async function fetchAppointment(apptId){
    try {
      const r = await fetch(`/medical_clinic/api/appointment_show.php?id=${encodeURIComponent(apptId)}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (r.ok) {
        const d = await r.json();
        return d.appointment || d || null;
      }
    } catch {}
    return null;
  }

  function prefillDrawerFromRow(tr){
    const td = (idx) => tr.querySelector(`td:nth-child(${idx})`)?.textContent?.trim() || '';
    dRefs.date.textContent   = td(1);
    dRefs.time.textContent   = td(2);
    dRefs.doctor.textContent = td(3);
    dRefs.room.textContent   = td(4);
    dRefs.type.textContent   = td(5);
    dRefs.status.textContent = tr.querySelector('td:nth-child(6) .status-badge')?.textContent?.trim() || '';
    dRefs.summary.value      = tr.querySelector('.sum')?.textContent?.trim() || '';
    dRefs.comment.value      = '';
  }

  async function openDrawerView(apptId, isFutureRow, tr){
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
      dRefs.room.textContent   = a.room ?? dRefs.room.textContent;
      dRefs.type.textContent   = a.type ?? dRefs.type.textContent;
      dRefs.status.textContent = a.status ?? dRefs.status.textContent;
    }

    dRefs.saveBtn.onclick = () => saveSummaryComment(tr);
  }

  async function saveSummaryComment(tr){
    try {
      const payload = { id: Number(currentApptId), summary: dRefs.summary.value, comment: dRefs.comment.value };
      const res = await fetch('/medical_clinic/api/appointment_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to save');
      if (tr?.querySelector('.sum')) tr.querySelector('.sum').textContent = dRefs.summary.value || '';
      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(()=>{ dRefs.saveBtn.textContent = 'Save'; }, 800);
    } catch (e) {
      alert(e.message || 'Save error');
    }
  }

  async function openDrawerEdit(apptId, tr){
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

    // Prefill from row
    const td = (idx) => tr.querySelector(`td:nth-child(${idx})`)?.textContent?.trim() || '';
    sel('e-date').value = toISODate(td(1));
    const times = (td(2) || '').split('–');
    sel('e-from').value = toISOTm(times[0] || '');
    sel('e-to').value   = toISOTm(times[1] || '');
    sel('e-type').value = td(5);
    sel('e-summary').value = tr.querySelector('.sum')?.textContent?.trim() || '';
    sel('e-comment').value = '';

    await populateDoctorsRooms();

    const a = await fetchAppointment(apptId);
    if (a) {
      if (a.date) sel('e-date').value = toISODate(a.date);
      if (a.from_time) sel('e-from').value = toISOTm(a.from_time);
      if (a.to_time)   sel('e-to').value   = toISOTm(a.to_time);
      if (a.type)      sel('e-type').value = a.type;
      if (a.summary!=null) sel('e-summary').value = a.summary;
      if (a.comment!=null) sel('e-comment').value = a.comment;
      if (a.doctorId)  sel('e-doctor').value = String(a.doctorId);
      if (a.roomId || a.roomID) sel('e-room').value = String(a.roomId || a.roomID);
    }

    openDrawer();
    dRefs.saveBtn.onclick = () => saveEdit(tr);
  }

  async function populateDoctorsRooms(){
    // doctors
    try {
      const r = await fetch('/medical_clinic/api/doctors.php?list=1', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      const arr = d?.doctors || d || [];
      const s = sel('e-doctor');
      s.innerHTML = '';
      arr.forEach(doc => {
        const id = String(doc.id);
        const name = doc.name || `${doc.fName||''} ${doc.lName||''}`.trim() || `Doctor ${id}`;
        s.appendChild(new Option(name, id));
      });
    } catch {}
    // rooms
    try {
      const r = await fetch('/medical_clinic/api/rooms.php?list=1', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      const arr = d?.rooms || d || [];
      const s = sel('e-room');
      s.innerHTML = '';
      arr.forEach(room => {
        const id = String(room.id);
        const label = room.name ? `Room ${room.id} — ${room.name}` : `Room ${room.id}`;
        s.appendChild(new Option(label, id));
      });
    } catch {}
  }

  async function saveEdit(tr){
    const payload = {
      id: Number(currentApptId),
      date: sel('e-date').value,
      from_time: normalizeTime(sel('e-from').value),
      to_time:   normalizeTime(sel('e-to').value),
      doctorId:  Number(sel('e-doctor').value || 0),
      roomId:    Number(sel('e-room').value || 0),
      type:      sel('e-type').value.trim(),
      summary:   sel('e-summary').value,
      comment:   sel('e-comment').value
    };
    if (!payload.date || !payload.from_time || !payload.to_time || !payload.doctorId || !payload.roomId) {
      alert('Please fill date, time, doctor and room.'); return;
    }
    try {
      const res = await fetch('/medical_clinic/api/appointment_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (res.status === 409) { alert(data.error || 'Time conflict with another appointment.'); return; }
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to update');

      // reflect row
      tr.querySelector('td:nth-child(1)').textContent = payload.date;
      tr.querySelector('td:nth-child(2)').textContent = `${payload.from_time.slice(0,5)}–${payload.to_time.slice(0,5)}`;
      tr.querySelector('td:nth-child(3)').textContent = sel('e-doctor').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(4)').textContent = sel('e-room').selectedOptions[0]?.textContent || '';
      tr.querySelector('td:nth-child(5)').textContent = payload.type || '';
      tr.querySelector('.sum').textContent = payload.summary || '';

      dRefs.saveBtn.textContent = 'Saved';
      setTimeout(closeDrawer, 400);
    } catch (e) {
      alert(e.message || 'Update error');
    }
  }

  // ------------- helpers -------------
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); }
  function cssSafe(s){ return String(s||'').replace(/\s+/g,'-').toLowerCase(); }
  function sel(id){ return document.getElementById(id); }
  function toISODate(s){
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s); if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return '';
  }
  function toISOTm(s){
    if (!s) return '';
    const m = String(s).match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  }
  function normalizeTime(s){
    const m = String(s||'').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return '';
    return `${m[1]}:${m[2]}:${m[3]||'00'}`;
  }
})();
