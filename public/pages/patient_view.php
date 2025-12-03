<?php
function renderPatientViewPage() {
    global $id;
    ?>
    <div class="layout">
        <?php renderSidebar('patients'); ?>

        <main class="container">
            <header class="page-header">
                <h1 id="ptName">Patient</h1>
                <a id="addApptLink" class="link-new" href="/medical_clinic/public/index.php?page=appointment_new">+ New Appointment</a>
            </header>
            <div id="patientStatus" class="status-msg"></div>

            <section class="card">
                <h2>Demographics</h2>
                <table class="kv" aria-label="Patient demographics">
                    <thead>
                        <tr><th>Field</th><th>Value</th><th class="actions-cell">Actions</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>First name</th>
                            <td class="value-cell"><span id="val-first_name"></span><span id="msg-first_name" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="first_name">Edit</button></td>
                        </tr>
                        <tr>
                            <th>Last name</th>
                            <td class="value-cell"><span id="val-last_name"></span><span id="msg-last_name" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="last_name">Edit</button></td>
                        </tr>
                        <tr>
                            <th>Phone</th>
                            <td class="value-cell"><span id="val-phone"></span><span id="msg-phone" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="phone">Edit</button></td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td class="value-cell"><span id="val-email"></span><span id="msg-email" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="email">Edit</button></td>
                        </tr>
                        <tr>
                            <th>DOB</th>
                            <td class="value-cell"><span id="val-dob"></span><span id="msg-dob" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="dob">Edit</button></td>
                        </tr>
                        <tr>
                            <th>Address</th>
                            <td class="value-cell"><span id="val-address"></span><span id="msg-address" class="muted-small"></span></td>
                            <td class="actions-cell"><button class="edit-btn" data-field="address">Edit</button></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="card">
                <h2>Patient History</h2>
                <div class="history-grid">
                    <div class="history-card">
                        <h3>Previous Medical History</h3>
                        <p id="history-medical" class="history-empty">Not recorded</p>
                        <button class="btn-small history-toggle" data-field="medical" type="button">Add</button>
                        <div class="history-editor hidden" data-field="medical">
                            <textarea id="hist-medical-input" rows="3" placeholder="Add medical history"></textarea>
                        </div>
                    </div>
                    <div class="history-card">
                        <h3>Previous Surgical History</h3>
                        <p id="history-surgical" class="history-empty">Not recorded</p>
                        <button class="btn-small history-toggle" data-field="surgical" type="button">Add</button>
                        <div class="history-editor hidden" data-field="surgical">
                            <textarea id="hist-surgical-input" rows="3" placeholder="Add surgical history"></textarea>
                        </div>
                    </div>
                    <div class="history-card">
                        <h3>Allergies</h3>
                        <p id="history-allergies" class="history-empty">Not recorded</p>
                        <button class="btn-small history-toggle" data-field="allergies" type="button">Add</button>
                        <div class="history-editor hidden" data-field="allergies">
                            <textarea id="hist-allergies-input" rows="3" placeholder="Add allergies"></textarea>
                        </div>
                    </div>
                </div>
                <div class="form-actions hidden" id="histActions" style="justify-content:flex-end;">
                    <button id="histSaveBtn" type="button" class="btn-primary btn-md">Save history</button>
                    <span id="histMsg" class="form-msg"></span>
                </div>
            </section>

            <section class="card">
                <div class="media-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="margin:0;">Media</h2>
                    <button id="mediaToggle" class="btn-secondary btn-sm" type="button">Expand</button>
                </div>
                <div id="mediaPanel" class="media-panel hidden">
                    <div class="media-tabs" style="margin:10px 0; display:flex; gap:8px;">
                        <button class="media-tab btn-secondary btn-sm active" data-cat="labs" type="button">Labs</button>
                        <button class="media-tab btn-secondary btn-sm" data-cat="imaging" type="button">Imaging</button>
                        <button class="media-tab btn-secondary btn-sm" data-cat="reports" type="button">Reports</button>
                    </div>
                    <div class="media-upload" style="display:grid; gap:8px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items:end;">
                        <label>Title
                            <input type="text" id="mediaTitle" placeholder="e.g., CBC, Chest X-ray">
                        </label>
                        <label>Category
                            <input type="text" id="mediaCategory" value="Labs" readonly>
                        </label>
                        <label>File
                            <input type="file" id="mediaFile" accept="image/*,.pdf" capture="environment">
                        </label>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <button id="mediaUploadBtn" class="btn-primary btn-sm" type="button">Scan / Upload</button>
                            <span id="mediaMsg" class="form-msg"></span>
                        </div>
                    </div>
                    <div class="media-lists" style="margin-top:12px;">
                        <div class="media-list" data-cat="labs">
                            <div class="empty">No media yet.</div>
                        </div>
                        <div class="media-list hidden" data-cat="imaging">
                            <div class="empty">No media yet.</div>
                        </div>
                        <div class="media-list hidden" data-cat="reports">
                            <div class="empty">No media yet.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="card">
                <h2>Future Appointments</h2>
                <div class="table-wrap">
                    <table class="table" aria-label="Future appointments">
                        <thead>
                            <tr>
                                <th>Date</th><th>Time</th><th>Doctor</th><th>Room</th><th>Type</th><th>Status</th><th>Summary</th><th>Notes</th><th class="actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="futureBody">
                            <tr><td colspan="9" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="card">
                <h2>Past Appointments</h2>
                <div class="table-wrap">
                    <table class="table" aria-label="Past appointments">
                        <thead>
                            <tr>
                                <th>Date</th><th>Time</th><th>Doctor</th><th>Room</th><th>Type</th><th>Status</th><th>Summary</th><th>Notes</th><th class="actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pastBody">
                            <tr><td colspan="9" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <div id="drawerBackdrop" class="backdrop"></div>
    <aside id="apptDrawer" class="drawer" aria-hidden="true" aria-label="Appointment details">
        <div class="drawer-header">
            <div class="drawer-title">Appointment</div>
            <button class="drawer-close" type="button" id="drawerCloseBtn" aria-label="Close">×</button>
        </div>
        <div class="drawer-body">
            <div class="field-row"><div class="label">Date</div><div class="value" id="d-date">—</div></div>
            <div class="field-row"><div class="label">Time</div><div class="value" id="d-time">—</div></div>
            <div class="field-row"><div class="label">Doctor</div><div class="value" id="d-doctor">—</div></div>
            <div class="field-row"><div class="label">Room</div><div class="value" id="d-room">—</div></div>
            <div class="field-row"><div class="label">Type</div><div class="value" id="d-type">—</div></div>
            <div class="field-row"><div class="label">Status</div><div class="value" id="d-status">—</div></div>
            <div class="field-row"><div class="label">Vitals</div><div class="value" id="d-vitals">—</div></div>
            <div class="field-row" style="align-items:start;"><div class="label">Summary</div><div class="value"><textarea id="d-summary" class="note-input" placeholder="Note / summary…"></textarea></div></div>
            <div class="field-row" style="align-items:start;"><div class="label">Comment</div><div class="value"><textarea id="d-comment" class="comment-input" placeholder="Comment…"></textarea></div></div>
        </div>
        <div class="drawer-footer">
            <button class="btn-small" id="drawerEditBtn" style="margin-right:auto; display:none;">Edit Appointment…</button>
            <button class="btn-small" id="drawerCancelBtn" type="button">Cancel</button>
            <button class="btn-small primary" id="drawerSaveBtn" type="button">Save</button>
        </div>
    </aside>

    <script>
        // Add patientId to query string if present
        const params = new URLSearchParams(location.search);
        const patientId = params.get('id');
        if (patientId) {
            // Patient view page - handled by JS module
        }
    </script>
    <?php
}
