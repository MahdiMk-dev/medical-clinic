const token = localStorage.getItem('token');
if (!token) location.href = '/public/login.html';

async function fetchJson(url){
  const res = await fetch(url, {headers: {Authorization: 'Bearer ' + token}});
  return res.json();
}

async function load() {
  const [patients, doctors, rooms, services] = await Promise.all([
    fetchJson('/api/get_patients.php'),
    fetchJson('/api/get_doctors.php'),
    fetchJson('/api/get_rooms.php'),
    fetchJson('/api/get_services.php')
  ]);
  const el = id=>document.getElementById(id);
  patients.forEach(p => el('patient').append(new Option(p.first_name + ' ' + p.last_name, p.id)));
  doctors.forEach(d => el('doctor').append(new Option(d.first_name + ' ' + d.last_name, d.id)));
  rooms.forEach(r => el('room').append(new Option(r.name, r.id)));
  services.forEach(s => el('service').append(new Option(`${s.name} — ${s.price}`, s.id)));
}
load();

document.getElementById('apptForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const body = {
    patient_id: Number(document.getElementById('patient').value),
    doctor_id: Number(document.getElementById('doctor').value),
    room_id: Number(document.getElementById('room').value),
    service_id: Number(document.getElementById('service').value),
    appointment_time: document.getElementById('datetime').value,
    comment: document.getElementById('comment').value
  };
  const res = await fetch('/api/create_appointment.php', {
    method:'POST',
    headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + token},
    body: JSON.stringify(body)
  });
  const data = await res.json();
  document.getElementById('msg').innerText = res.ok ? 'Created id: ' + data.appointment_id : (data.error || 'Error');
});
