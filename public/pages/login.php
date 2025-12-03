<?php
function renderLoginPage() {
    ?>
    <div class="login-wrapper">
        <div class="login-box">
            <h1 class="title">Sign in</h1>
            <p class="subtitle">BrightCare Clinic Management</p>

            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required />
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password" name="password" required />
                        <button type="button" class="toggle-password">Show</button>
                    </div>
                </div>

                <div class="form-actions">
                    <label class="remember">
                        <input type="checkbox" id="remember" />
                        Remember me
                    </label>
                    <button type="submit" id="loginBtn">Sign in</button>
                </div>

                <div id="loginMessage"></div>
            </form>
        </div>
    </div>
    <?php
}
