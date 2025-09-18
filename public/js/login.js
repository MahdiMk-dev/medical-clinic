(function() {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('loginMessage');
  const btn = document.getElementById('loginBtn');
  const pwd = document.getElementById('password');
  const toggle = document.querySelector('.toggle-password');

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

    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (document.getElementById('remember').checked) {
          localStorage.setItem('token', data.token);
        } else {
          sessionStorage.setItem('token', data.token);
        }
        btn.textContent = 'Success!';
        setTimeout(() => location.href = 'appointment.html', 300);
      } else {
        msg.textContent = data.error || data.message || 'Invalid credentials';
        btn.disabled = false;
        btn.textContent = prevText;
      }
    } catch (err) {
      console.error(err);
      msg.textContent = 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });
})();
