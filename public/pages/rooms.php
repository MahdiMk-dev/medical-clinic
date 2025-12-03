<?php
function renderRoomsPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('rooms'); ?>
        <main class="container">
            <header class="page-header">
                <h1>Rooms</h1>
                <a class="link-new" href="/medical_clinic/public/index.php?page=room_new">+ New Room</a>
            </header>
            <div class="filters card">
                <input id="roomSearch" placeholder="Search room id / type???" />
                <button id="roomSearchBtn" class="btn-secondary">Search</button>
                <span id="roomMsg" class="muted"></span>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table class="table" id="roomsTable" aria-label="Rooms table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Created</th>
                                <th style="width:200px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="roomsBody">
                            <tr><td colspan="4" class="empty">Loading...??</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="roomEditModal" class="modal hidden" aria-hidden="true" role="dialog" aria-label="Edit room">
                <div class="modal-backdrop"></div>
                <div class="modal-card">
                    <header class="modal-header">
                        <h2>Edit Room</h2>
                        <button id="roomEditClose" class="icon-btn" aria-label="Close">x</button>
                    </header>
                    <form id="roomEditForm" class="modal-body">
                        <input type="hidden" id="roomEditId">
                        <label>Room Type / Name
                            <input type="text" id="roomEditType" required>
                        </label>
                        <div class="modal-actions">
                            <div id="roomEditMsg" class="form-msg"></div>
                            <button id="roomEditCancel" type="button" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>
    <?php
}
