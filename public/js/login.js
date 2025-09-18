document.getElementById('loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = e.target;
  const body = {username: f.username.value, password: f.password.value};
  const res = await fetch('/api/login.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    // redirect to appointment page
    location.href = '/public/appointment.html';
  } else {
    document.getElementById('err').innerText = data.error || 'Login failed';
  }
});
