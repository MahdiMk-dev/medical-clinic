<?php
function renderAppointmentNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('appointment_new'); ?>
        <main class="container">
            <header class="page-header">
                <h1>New Appointment</h1>
            </header>
            <div class="card">
                <form id="appointmentForm">
                    <div class="grid">
                        <label>Date
                            <input type="date" id="apptDate" required>
                        </label>
                        <label>From
                            <input type="time" id="apptFrom" required>
                        </label>
                        <label>To
                            <input type="time" id="apptTo" required>
                        </label>
                        <label>Patient
                            <select id="apptPatient" required></select>
                        </label>
                        <label>Doctor
                            <select id="apptDoctor" required></select>
                        </label>
                        <label>Room
                            <select id="apptRoom" required></select>
                        </label>
                    </div>
                    <label>Type
                        <select id="apptType">
                            <option>Consultation</option>
                            <option>Follow-up</option>
                            <option>Procedure</option>
                        </select>
                    </label>
                    <label>Summary
                        <input type="text" id="apptSummary" placeholder="Summary">
                    </label>
                    <label>Comments
                        <textarea id="apptComment" rows="4" placeholder="Comments…"></textarea>
                    </label>
                    <div class="grid">
                        <label>Blood Pressure
                            <input type="text" id="apptBp" placeholder="e.g., 120/80">
                        </label>
                        <label>Heart Rate
                            <input type="text" id="apptHr" placeholder="e.g., 72">
                        </label>
                        <label>Temperature
                            <input type="text" id="apptTemp" placeholder="e.g., 37.0°C">
                        </label>
                        <label>Resp. Rate
                            <input type="text" id="apptRr" placeholder="e.g., 16">
                        </label>
                        <label>SpO2
                            <input type="text" id="apptSpo2" placeholder="e.g., 98%">
                        </label>
                    </div>
                    <label>Vitals Notes
                        <textarea id="apptVitalsNotes" rows="2" placeholder="Additional vitals notes"></textarea>
                    </label>
                    <div id="formMsg" class="form-msg"></div>
                    <div class="form-actions">
                        <a href="/medical_clinic/public/index.php?page=appointments" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <?php
}
