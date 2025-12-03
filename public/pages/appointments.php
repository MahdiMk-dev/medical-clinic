<?php
function renderAppointmentsPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('appointments'); ?>

        <main class="container page-appointments">
            <header class="page-header">
                <h1>Appointments</h1>
                <a class="link-new" href="/medical_clinic/public/index.php?page=appointment_new">+ New Appointment</a>
            </header>

            <section class="filters card">
                <div class="filters-grid">
                    <div><input type="date" id="dateInput"></div>
                    <div><input type="text" id="searchInput" placeholder="Search patient/doctor/summary/comments…"></div>
                    <div>
                        <select id="statusFilter">
                            <option value="">All Statuses</option>
                            <option>Scheduled</option>
                            <option>Checked-in</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <select id="typeFilter">
                            <option value="">All Types</option>
                            <option>Consultation</option>
                            <option>Follow-up</option>
                            <option>Procedure</option>
                        </select>
                    </div>
                    <div class="filters-actions">
                        <button id="refreshBtn" type="button" class="btn-primary btn-md">Refresh</button>
                    </div>
                </div>
            </section>

            <div id="statusMsg" class="status-msg"></div>

            <div class="card">
                <div class="table-wrap">
                    <table id="apptTable" class="data-table">
                        <thead>
                            <tr>
                                <th data-sort="time">Time</th>
                                <th data-sort="patient_name">Patient</th>
                                <th data-sort="doctor_name">Doctor</th>
                                <th data-sort="room">Room</th>
                                <th data-sort="type">Type</th>
                                <th data-sort="status">Status</th>
                                <th data-sort="summary">Summary</th>
                                <th data-sort="comment">Comments</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="apptBody">
                            <tr><td colspan="9" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="editModal" class="modal hidden" aria-hidden="true" role="dialog" aria-label="Edit appointment">
                <div class="modal-backdrop"></div>
                <div class="modal-card">
                    <header class="modal-header">
                        <h2>Edit Appointment</h2>
                        <button id="editClose" class="icon-btn" aria-label="Close">×</button>
                    </header>
                    <form id="editForm" class="modal-body">
                        <input type="hidden" id="editId">
                        <div class="grid">
                            <label>Date
                                <input type="date" id="editDate">
                            </label>
                            <label>From
                                <input type="time" id="editFrom">
                            </label>
                            <label>To
                                <input type="time" id="editTo">
                            </label>
                            <label>Doctor
                                <select id="editDoctor"></select>
                            </label>
                            <label>Room
                                <select id="editRoom"></select>
                            </label>
                        </div>
                        <label>Summary
                            <input type="text" id="editSummary" placeholder="Summary">
                        </label>
                        <label>Comments
                            <textarea id="editComment" rows="3" placeholder="Notes…"></textarea>
                        </label>
                        <div class="modal-actions">
                            <div id="editMsg" class="form-msg"></div>
                            <button id="editCancel" type="button" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Update</button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>
    <?php
}
