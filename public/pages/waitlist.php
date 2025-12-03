<?php
function renderWaitlistPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('waitlist'); ?>
        <main class="container">
            <header class="page-header">
                <h1>Waitlist</h1>
                <span class="muted">Active shows <strong>pending</strong> & <strong>notified</strong>.</span>
            </header>

            <!-- NEW WAITLIST REQUEST -->
            <section class="card">
                <h2 style="margin-top:0">New Waitlist Request</h2>

                <div class="wl-form-grid">
                    <!-- Patient search -->
                    <div class="wl-field">
                        <label class="wl-label" for="wlPatientQuery">Patient</label>
                        <div class="wl-patient-picker">
                            <input id="wlPatientQuery" type="text" class="wl-input"
                                   placeholder="Search by name, ID, or phone…" autocomplete="off"
                                   aria-autocomplete="list" aria-expanded="false">
                            <input type="hidden" id="wlPatientId">
                        </div>
                        <div id="wlPatientSel" class="wl-selected muted"></div>
                        <select id="wlPatientSelect" class="wl-select" aria-label="Pick patient (dropdown)"></select>
                        <small class="muted">Tip: use the search box above or pick from the dropdown.</small>
                    </div>

                    <!-- Doctor dropdown -->
                    <div class="wl-field">
                        <label class="wl-label" for="wlDoctor">Doctor</label>
                        <select id="wlDoctor" class="wl-select"></select>
                    </div>

                    <!-- Notes -->
                    <div class="wl-field wl-notes">
                        <label class="wl-label" for="wlNotes">Notes</label>
                        <textarea id="wlNotes" class="wl-textarea" placeholder="Reason or preferred times…"></textarea>
                    </div>

                    <!-- Actions -->
                    <div class="wl-actions">
                        <div id="wlMsg" class="form-msg"></div>
                        <button id="wlCreateBtn" type="button" class="btn-small primary">Create request</button>
                    </div>
                </div>
            </section>

            <!-- ACTIVE -->
            <section class="card">
                <h2 style="margin-top:0">Active Waitlist</h2>

                <!-- Active filters -->
                <div class="toolbar" role="search">
                    <div class="filters">
                        <input id="qSearch" class="search" placeholder="Search active…" aria-label="Search active">
                        <select id="doctorFilter" class="filter-select" aria-label="Filter active by doctor">
                            <option value="">All doctors</option>
                        </select>
                    </div>
                </div>

                <div class="table-wrap">
                    <table class="table" aria-label="Waitlist (Active)">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Patient</th>
                                <th>Phone</th>
                                <th>Notes</th>
                                <th>Added</th>
                                <th>Doctor</th>
                                <th>Status</th>
                                <th class="actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="waitBody">
                            <tr><td colspan="8" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- EXPIRED -->
            <section class="card">
                <h2 style="margin-top:0">Expired (Scheduled & Canceled)</h2>

                <!-- Expired filters -->
                <div class="toolbar" role="search">
                    <div class="filters">
                        <input id="expiredSearch" class="search" placeholder="Search expired…" aria-label="Search expired">
                        <select id="expiredDoctorFilter" class="filter-select" aria-label="Filter expired by doctor">
                            <option value="">All doctors</option>
                        </select>
                    </div>
                </div>

                <div class="table-wrap">
                    <table class="table" aria-label="Waitlist (Expired)">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Patient</th>
                                <th>Phone</th>
                                <th>Notes</th>
                                <th>Added</th>
                                <th>Status</th>
                                <th>Doctor</th>
                            </tr>
                        </thead>
                        <tbody id="expiredBody">
                            <tr><td colspan="7" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <!-- Scheduling Drawer -->
    <div id="wlBackdrop" class="backdrop" aria-hidden="true"></div>
    <aside id="wlDrawer" class="drawer" aria-hidden="true" aria-label="Schedule appointment">
        <div class="drawer-header">
            <div class="drawer-title">Schedule Appointment</div>
            <button class="drawer-close" type="button" id="wlCloseBtn" aria-label="Close">×</button>
        </div>

        <form id="wlForm" class="drawer-body">
            <div class="field-row">
                <div class="label">Patient</div>
                <div class="value" id="f-patient">—</div>
            </div>

            <div class="field-row">
                <div class="label">Wait note</div>
                <div class="value"><textarea id="f-wait-notes" class="note-input" disabled></textarea></div>
            </div>

            <div class="field-row"><div class="label">Date</div><div class="value"><input id="f-date" type="date" required></div></div>
            <div class="field-row"><div class="label">From</div><div class="value"><input id="f-from" type="time" step="60" required></div></div>
            <div class="field-row"><div class="label">To</div><div class="value"><input id="f-to" type="time" step="60" required></div></div>
            <div class="field-row"><div class="label">Doctor</div><div class="value"><select id="f-doctor" required></select></div></div>
            <div class="field-row"><div class="label">Room</div><div class="value"><select id="f-room" required></select></div></div>

            <div class="field-row"><div class="label">Type</div><div class="value"><input id="f-type" type="text" placeholder="Consultation"></div></div>
            <div class="field-row" style="align-items:start;"><div class="label">Summary</div><div class="value"><textarea id="f-summary" class="note-input"></textarea></div></div>
            <div class="field-row" style="align-items:start;"><div class="label">Comment</div><div class="value"><textarea id="f-comment" class="comment-input"></textarea></div></div>
        </form>

        <div class="drawer-footer">
            <button class="btn-small ghost" id="wlCancelBtn" type="button">Cancel</button>
            <button class="btn-small primary" id="wlSaveBtn" type="button">Save</button>
        </div>
    </aside>

    <!-- Patient suggestions PORTAL (separate spot, appended to body) -->
    <div id="wlPatientPortal" class="wl-portal" hidden></div>
    <?php
}
