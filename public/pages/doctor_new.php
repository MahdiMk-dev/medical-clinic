<?php
function renderDoctorNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('doctor_new'); ?>
        <main class="container">
            <header class="page-header">
                <h1>New Doctor</h1>
            </header>
            <div class="card">
                <form id="doctorForm">
                    <div class="grid">
                        <label>First Name
                            <input type="text" id="doctorFirst" required>
                        </label>
                        <label>Middle Name
                            <input type="text" id="doctorMiddle">
                        </label>
                        <label>Last Name
                            <input type="text" id="doctorLast" required>
                        </label>
                    </div>
                    <label>Syndicate Number
                        <input type="text" id="doctorSyndicate" placeholder="Membership / license number">
                    </label>
                    <label>Phone
                        <input type="tel" id="doctorPhone" placeholder="e.g., +1 555 123 4567">
                    </label>
                    <div id="formMsg" class="form-msg"></div>
                    <div class="form-actions">
                        <a href="/medical_clinic/public/index.php?page=doctors" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <?php
}
