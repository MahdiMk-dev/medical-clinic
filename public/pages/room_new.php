<?php
function renderRoomNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('room_new'); ?>
        <main class="container">
            <header class="page-header">
                <h1>New Room</h1>
            </header>
            <div class="card">
                <form id="roomForm">
                    <label>Room Type / Name
                        <input type="text" id="roomType" required>
                    </label>
                    <p class="muted">Room ID will be assigned automatically.</p>
                    <div id="formMsg" class="form-msg"></div>
                    <div class="form-actions">
                        <a href="/medical_clinic/public/index.php?page=rooms" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <?php
}
