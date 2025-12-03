<?php
function renderDoctorsPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('doctors'); ?>
        <main class="container">
            <header class="page-header">
                <h1>Doctors</h1>
                <a class="link-new" href="/medical_clinic/public/index.php?page=doctor_new">+ New Doctor</a>
            </header>
            <div class="filters card">
                <input id="doctorSearch" placeholder="Search name / phone / syndicate #" />
                <button id="doctorSearchBtn" class="btn-secondary">Search</button>
                <span id="doctorMsg" class="muted"></span>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table class="table" id="doctorsTable" aria-label="Doctors table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>First Name</th>
                                <th>Middle Name</th>
                                <th>Last Name</th>
                                <th>Syndicate #</th>
                                <th>Phone</th>
                                <th style="width:200px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="doctorsBody">
                            <tr><td colspan="7" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="doctorEditModal" class="modal hidden" aria-hidden="true" role="dialog" aria-label="Edit doctor">
                <div class="modal-backdrop"></div>
                <div class="modal-card">
                    <header class="modal-header">
                        <h2>Edit Doctor</h2>
                        <button id="doctorEditClose" class="icon-btn" aria-label="Close">x</button>
                    </header>
                    <form id="doctorEditForm" class="modal-body">
                        <input type="hidden" id="doctorEditId">
                        <div class="grid">
                            <label>First Name
                                <input type="text" id="doctorEditFirst" required>
                            </label>
                            <label>Middle Name
                                <input type="text" id="doctorEditMiddle">
                            </label>
                            <label>Last Name
                                <input type="text" id="doctorEditLast" required>
                            </label>
                        </div>
                        <label>Syndicate Number
                            <input type="text" id="doctorEditSyndicate">
                        </label>
                        <label>Phone
                            <input type="tel" id="doctorEditPhone">
                        </label>
                        <div class="modal-actions">
                            <div id="doctorEditMsg" class="form-msg"></div>
                            <button id="doctorEditCancel" type="button" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>
    <?php
}
