<?php
function renderPatientsPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('patients'); ?>

        <main class="container">
            <header class="page-header">
                <h1>Patients</h1>
                <a class="link-new" href="/medical_clinic/public/index.php?page=patient_new">+ New Patient</a>
            </header>

            <div class="filters card">
                <input id="q" placeholder="Search name / phone / email / ID" />
                <button id="searchBtn" class="btn-secondary">Search</button>
                <span id="statusMsg" class="muted"></span>
            </div>

            <div class="card">
                <div class="table-wrap">
                    <table class="table" id="patientsTable" aria-label="Patients table">
                        <thead>
                            <tr>
                                <th style="width:90px;">ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>DOB</th>
                                <th style="width:240px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="patientsBody">
                            <tr><td colspan="6" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
    <?php
}
