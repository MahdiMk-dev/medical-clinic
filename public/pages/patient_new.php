<?php
function renderPatientNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('patient_new'); ?>
        <main class="container">
            <header class="page-header">
                <h1>New Patient</h1>
            </header>
            <div class="card">
                <form id="patientForm">
                    <div class="grid">
                        <label>First Name
                            <input type="text" id="patientFirst" required>
                        </label>
                        <label>Last Name
                            <input type="text" id="patientLast" required>
                        </label>
                    </div>
                    <label>Phone
                        <input type="tel" id="patientPhone">
                    </label>
                    <label>Email
                        <input type="email" id="patientEmail">
                    </label>
                    <label>Date of Birth
                        <input type="date" id="patientDOB">
                    </label>
                    <label>Address
                        <textarea id="patientAddress" rows="3" placeholder="Address…"></textarea>
                    </label>
                    <div id="formMsg" class="form-msg"></div>
                    <div class="form-actions">
                        <a href="/medical_clinic/public/index.php?page=patients" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <?php
}
