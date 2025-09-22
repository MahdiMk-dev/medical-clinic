(function () {
  const form   = document.getElementById('loginForm');
  const msg    = document.getElementById('loginMessage');
  const btn    = document.getElementById('loginBtn');
  const pwd    = document.getElementById('password');
  const toggle = document.querySelector('.toggle-password');

  // 1) Hardcode the API endpoint over HTTP to avoid file:// resolution issues
  //    If your project root under WAMP is C:\wamp64\www\medical_clinic\
  //    then the API lives at http://localhost/medical_clinic/api/login.php
  const API_URL = 'http://localhost/medical_clinic/api/login.php';

  // If someone opened the page via file://, fail fast with a clear message
  if (location.protocol === 'file:') {
    console.error('This page is opened via file://. Serve it over http://localhost/... instead.');
    if (msg) msg.textContent = 'Open this page via http://localhost/medical_clinic/login.html (not file://).';
  }

  // Toggle password visibility
  if (toggle && pwd) {
    toggle.addEventListener('click', () => {
      const show = pwd.type === 'password';
      pwd.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
    });
  }

  // Handle form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      msg.textContent = 'Please enter username and password.';
      return;
    }

    // UI state
    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      // Try to parse JSON gracefully (even on non-200)
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

      // Remember me behavior
      const remember = document.getElementById('remember');
      if (remember && remember.checked) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }

      btn.textContent = 'Success!';
      msg.textContent = 'Logged in. Redirecting...';

      // Redirect (adjust if your path differs)
      setTimeout(() => {
        // If your appointment page is at /medical_clinic/appointment.html:
        window.location.href = '/medical_clinic/public/html/appointments.html';
      }, 300);

    } catch (err) {
      console.error(err);
      msg.textContent = err.message || 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });
})();
