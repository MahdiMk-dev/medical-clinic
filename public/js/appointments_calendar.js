(function () {
  const API_BASE = (location.origin.includes('localhost'))
    ? (location.protocol + '//' + location.host.replace(/\/$/, '') + '/medical_clinic/api')
    : (location.origin + '/api');

  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }
  function authHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }
  function toast(msg, ok=false) {
    const el = document.createElement('div');
    el.className = ok ? 'ok-toast' : 'error-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 4000);
  }

  // Auth gate
  if (!getToken()) {
    location.href = '/medical_clinic/login.html';
    return;
  }

  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    nowIndicator: true,
    editable: true,
    selectable: false,
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:15:00',
    expandRows: true,
    eventSources: [{
      events: async (info, success, failure) => {
        try {
          const url = `${API_BASE}/appointments_range.php?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`;
          const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
          if (res.status === 401) {
            let reason = 'Session expired. Please sign in again.';
            try { const err = await res.json(); if (err && err.error) reason = err.error; } catch {}
            toast(reason);
            setTimeout(() => location.href='/medical_clinic/login.html', 900);
            return;
          }
          if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
          const events = await res.json();
          success(events);
        } catch (e) {
          console.error(e);
          failure(e);
          toast('Failed to load appointments');
        }
      }
    }],
    eventDrop: async (info) => {
      const ok = await moveOrResize(info.event.id, info.event.start, info.event.end);
      if (!ok) info.revert();
    },
    eventResize: async (info) => {
      const ok = await moveOrResize(info.event.id, info.event.start, info.event.end);
      if (!ok) info.revert();
    },
    eventDidMount: (arg) => {
      const p = arg.event.title;
      const d = arg.event.extendedProps?.doctor || '';
      const r = arg.event.extendedProps?.room || '';
      arg.el.title = [p, d && `Dr: ${d}`, r && `Room: ${r}`].filter(Boolean).join(' — ');
    }
  });

  async function moveOrResize(id, start, end) {
    const body = {
      id: Number(id),
      start: toSqlDateTime(start),
      end:   toSqlDateTime(end),
    };
    try {
      const res = await fetch(`${API_BASE}/appointment_move.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (res.status === 401) {
        let reason = 'Session expired. Please sign in again.';
        try { const err = await res.json(); if (err && err.error) reason = err.error; } catch {}
        toast(reason);
        setTimeout(() => location.href='/medical_clinic/login.html', 900);
        return false;
      }
      if (res.status === 409) {
        const err = await safeJson(res);
        toast(err?.error || 'Overlapping with another appointment');
        return false;
      }
      if (!res.ok) {
        toast('Failed to update appointment');
        return false;
      }
      toast('Appointment updated', true);
      return true;
    } catch (e) {
      console.error(e);
      toast('Network error');
      return false;
    } finally {
      calendar.refetchEvents();
    }
  }

  function toSqlDateTime(d) {
    const pad = (n) => String(n).padStart(2,'0');
    const y = d.getFullYear();
    const m = pad(d.getMonth()+1);
    const da= pad(d.getDate());
    const h = pad(d.getHours());
    const mi= pad(d.getMinutes());
    const s = pad(d.getSeconds());
    return `${y}-${m}-${da} ${h}:${mi}:${s}`;
  }
  async function safeJson(resp) {
    try { return await resp.json(); } catch { return null; }
  }

  document.getElementById('todayBtn')?.addEventListener('click', () => calendar.today());
  document.getElementById('weekBtn')?.addEventListener('click', () => calendar.changeView('timeGridWeek'));
  document.getElementById('dayBtn')?.addEventListener('click', () => calendar.changeView('timeGridDay'));

  calendar.render();
})(); 
