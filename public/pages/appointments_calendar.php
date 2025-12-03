<?php
function renderCalendarPage() {
    ?>
    <div class="calendar-page">
        <?php renderSidebar('appointments_calendar'); ?>

        <div class="calendar-main" style="background:#f8fafc; padding:8px; border-radius:12px;">
            <div class="topbar" style="gap:10px; flex-wrap:wrap;">
                <h1 class="title" style="margin-right:auto;">Appointments Calendar</h1>
                <div id="calTitle" class="muted" style="font-weight:700; color:#1f2937;"></div>
                <div class="legend pill" style="padding:8px 12px; border-radius:8px; background:#eef2ff; color:#1f2937; font-weight:600;">
                    Colors: Blue = Scheduled | Green = Checked-in | Orange = Completed | Red = Cancelled
                </div>
                <div class="topbar-actions" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <label class="muted-small" style="display:flex; align-items:center; gap:6px;">
                        Jump to date
                        <input type="date" id="calDateInput" style="padding:6px 8px;">
                    </label>
                    <button id="todayBtn" type="button" class="btn-secondary">Today</button>
                    <button id="weekBtn" type="button" class="btn-secondary">Week</button>
                    <button id="dayBtn" type="button" class="btn-secondary">Day</button>
                </div>
            </div>

            <div class="calendar-content" style="display:flex; flex-direction:row; gap:12px; align-items:flex-start; padding:8px;">
                <div class="calendar-shell" style="flex:1 1 auto; min-height:70vh; background:#fff; border-radius:12px; box-shadow: 0 10px 35px rgba(0,0,0,0.08); padding:8px;">
                    <div id="calendar"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Calendar modals for appointment interactions -->
    <div id="createModal" class="modal hidden" role="dialog" aria-label="Create appointment">
        <div class="modal-backdrop"></div>
        <div class="modal-card">
            <header class="modal-header">
                <h2>Create Appointment</h2>
                <button id="createClose" class="icon-btn" aria-label="Close">x</button>
            </header>
            <form id="createForm" class="modal-body">
                <label>Date
                    <input type="date" id="createDate" required>
                </label>
                <label>From
                    <input type="time" id="createFrom" required>
                </label>
                <label>To
                    <input type="time" id="createTo" required>
                </label>
                <label>Patient
                    <select id="createPatient" required></select>
                </label>
                <label>Doctor
                    <select id="createDoctor" required></select>
                </label>
                <label>Room
                    <select id="createRoom" required></select>
                </label>
                <label>Type
                    <select id="createType">
                        <option>Consultation</option>
                        <option>Follow-up</option>
                        <option>Procedure</option>
                    </select>
                </label>
                <label>Summary
                    <input type="text" id="createSummary" placeholder="Summary">
                </label>
                <label>Comments
                    <textarea id="createComment" rows="3" placeholder="Comments."></textarea>
                </label>
                <div class="modal-actions">
                    <div id="createMsg" class="form-msg"></div>
                    <button id="createCancel" type="button" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Create</button>
                </div>
            </form>
        </div>
    </div>

    <div id="calEditModal" class="modal hidden" role="dialog" aria-label="Edit appointment">
        <div class="modal-backdrop"></div>
        <div class="modal-card">
            <header class="modal-header">
                <h2>Edit Appointment</h2>
                <button id="calEditClose" class="icon-btn" aria-label="Close">x</button>
            </header>
            <form id="calEditForm" class="modal-body">
                <input type="hidden" id="calEditId">
                <div class="grid">
                    <label>Date
                        <input type="date" id="calEditDate" required>
                    </label>
                    <label>From
                        <input type="time" id="calEditFrom" required>
                    </label>
                    <label>To
                        <input type="time" id="calEditTo" required>
                    </label>
                </div>
                <div class="grid">
                    <label>Doctor
                        <select id="calEditDoctor" required></select>
                    </label>
                    <label>Room
                        <select id="calEditRoom" required></select>
                    </label>
                    <label>Type
                        <input type="text" id="calEditType" placeholder="Consultation">
                    </label>
                </div>
                <label>Summary
                    <input type="text" id="calEditSummary" placeholder="Summary">
                </label>
                <label>Comment
                    <textarea id="calEditComment" rows="3" placeholder="Comment"></textarea>
                </label>
                <div class="modal-actions">
                    <div id="calEditMsg" class="form-msg"></div>
                    <button id="calEditCancel" type="button" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <?php
}
