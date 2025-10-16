// /medical_clinic/public/js/waitlist.js

// ---------- Auth guard + logout ----------
(function () {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!t) {
    location.href = '/medical_clinic/public/html/login.html';
    return;
  }
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    location.href = '/medical_clinic/public/html/login.html';
  });
})();

(function () {
  // ---------- Config ----------
  const API_BASE = (location.pathname.indexOf('/medical_clinic/') !== -1)
    ? (location.origin + '/medical_clinic/api')
    : (location.origin.includes('localhost')
        ? (location.protocol + '//' + location.host + '/medical_clinic/api')
        : (location.origin + '/api'));
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  // ---------- DOM refs ----------
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
  const wlPatientSelect = document.getElementById('wlPatientSelect'); // dropdown
  const wlDoctorNew     = document.getElementById('wlDoctor');
  const wlNotes         = document.getElementById('wlNotes');
  const wlMsg           = document.getElementById('wlMsg');
  const wlCreateBtn     = document.getElementById('wlCreateBtn');

  // Patient suggestions portal
  const portal = document.getElementById('wlPatientPortal');

  // ---------- State ----------
  let activeRows  = [];
  let expiredRows = [];
  let currentItem = null;
  let portalOpen  = false;

  // phone captured from dropdown/typeahead selection
  let selectedPatientPhone = '';

  // ---------- Helpers ----------
  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  // ---------- Data load & refresh ----------
  async function loadLists(){
    const r = await fetch(`${API_BASE}/waitlist_list.php`, { headers: { Authorization: 'Bearer ' + token }});
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

  // ---------- Init ----------
  (async function init(){
    await Promise.all([loadDoctorsForFilters(), loadLists()]);
    renderBoth();
    bindActiveTableActions();
    bindFilterEvents();
    await loadDoctorsForNewWaitlist();
    await loadPatientsForNewWaitlist();   // dropdown (name + phone)
    bindPatientPicker();                  // type-ahead (name + phone)
    bindCreateWaitlist();
  })();

  // ---------- Loads ----------
  async function loadDoctorsForFilters(){
    try {
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: { Authorization: 'Bearer ' + token }});
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
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: { Authorization: 'Bearer ' + token }});
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

  // --- Patients dropdown using /patients.php?list=1 (includes phone) ---
  async function loadPatientsForNewWaitlist(){
    try {
      const r = await fetch(`${API_BASE}/patients.php?list=1`, { headers:{ Authorization:'Bearer '+token }});
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
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: { Authorization: 'Bearer ' + token }});
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
      const r = await fetch(`${API_BASE}/rooms.php?list=1`, { headers: { Authorization: 'Bearer ' + token }});
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

  // ---------- Filters & Rendering ----------
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
        <td>${escapeHtml(r.patient_name || '')}</td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(r.notes || '')}</td>
        <td>${escapeHtml(r.created_at || '')}</td>
        <td>${escapeHtml(r.doctor_name || '')}</td>
        <td><span class="status-chip">${escapeHtml(r.status)}</span></td>
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
        <td>${escapeHtml(r.patient_name || '')}</td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(r.notes || '')}</td>
        <td>${escapeHtml(r.created_at || '')}</td>
        <td><span class="status-chip ${cls}">${escapeHtml(r.status)}</span></td>
        <td>${escapeHtml(r.doctor_name || '')}</td>
      </tr>
    `;
  }

  // ---------- Active table actions ----------
  function bindActiveTableActions(){
    tbodyActive.addEventListener('click', async (ev)=>{
      const tr = ev.target.closest('tr[data-id]'); if (!tr) return;
      const id  = Number(tr.dataset.id);
      const pid = Number(tr.dataset.pid);

      if (ev.target.classList.contains('btn-cancel')) {
        if (!confirm('Cancel this waitlist entry?')) return;
        try {
          await updateWaitlistStatus(id, 'canceled', null, null);

          // Optimistic move to expired
          const idx = activeRows.findIndex(r => r.id === id);
          if (idx > -1) { const moved = activeRows.splice(idx,1)[0]; moved.status='canceled'; expiredRows.unshift(moved); }
          renderBoth();

          // Authoritative refresh
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
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
      body: JSON.stringify(body)
    });
    const j = await safeJson(r);
    if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to update waitlist');
    return true;
  }

  // ---------- Drawer save (schedule) ----------
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
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
        body: JSON.stringify(payload)
      });
      const j = await safeJson(r);
      if (j.status === 409) { alert(j.data?.error || 'Time conflict'); return; }
      if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to create appointment');

      const apptId = j.data?.id;
      await updateWaitlistStatus(currentItem.id, 'scheduled', doctorId, apptId);

      // Optimistic move: active → expired
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

      // Authoritative refresh (ensures correct doctor_name/phone/order)
      await refreshListsAndRender();

      alert('Appointment created and waitlist item scheduled.');
    } catch(e){ alert(e.message || 'Error while scheduling'); }
  });

  // ---------- Patient picker (type-ahead) ----------
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

  // Use /patients.php?list=1&q=... (includes phone)
  async function searchPatients(q){
    try {
      const r = await fetch(`${API_BASE}/patients.php?list=1&q=${encodeURIComponent(q)}`, { headers:{ Authorization:'Bearer '+token }});
      const j = await safeJson(r);
      const arr = j.data?.patients || j.data || [];
      if (!arr.length) { closePortal(); return; }
      portal.innerHTML = arr.map(p => {
        const name  = (p.name || '').trim() || 'Patient';
        const phone = (p.phone || '').trim();
        return `
          <div class="wl-item" data-id="${p.id}" data-name="${escapeHtml(name)}" data-phone="${escapeHtml(phone)}">
            <div class="line1">${escapeHtml(name)}</div>
            <div class="line2">${escapeHtml(phone)}</div>
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
          selectedPatientPhone = phone; // capture for new row
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

  // ---------- Create new waitlist ----------
  function bindCreateWaitlist(){
    wlCreateBtn?.addEventListener('click', async ()=>{
      wlMsg.style.color = '#355F60'; wlMsg.textContent = 'Saving…';

      // Priority: hidden id from type-ahead; else dropdown selection
      let pid = Number(wlPatientId.value || 0);
      if (!pid) {
        pid = Number(wlPatientSelect?.value || 0);
        // if chosen from dropdown and we didn't type-ahead, capture its phone
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
          method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
          body: JSON.stringify({ patient_id: pid, doctor_id: doctorId || null, notes })
        });
        const j = await safeJson(r);
        if (!j.ok || j.data?.ok === false) throw new Error(j.data?.error || 'Failed to create');

        const doctor_name   = wlDoctorNew.selectedOptions[0]?.textContent || '';
        const patient_label = wlPatientSel.textContent || (wlPatientSelect?.selectedOptions[0]?.textContent || '');

        // Optimistic insert so you see it immediately (with phone)
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

        // Authoritative refresh (ensures phone/doctor/order are correct)
        await refreshListsAndRender();

        wlMsg.style.color = '#0E4B50'; wlMsg.textContent = 'Added to waitlist';
        wlPatientId.value=''; wlPatientSel.textContent=''; wlNotes.value='';
        selectedPatientPhone = '';
        if (wlPatientSelect) wlPatientSelect.value='';
      } catch(e){ wlMsg.style.color='#B00020'; wlMsg.textContent = e.message || 'Error'; }
    });
  }

  // ---------- Doctors filter loader (top) ----------
  async function loadDoctorsForFilters(){
    try {
      const r = await fetch(`${API_BASE}/doctors.php?list=1`, { headers: { Authorization: 'Bearer ' + token }});
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

})();
