<?php
/**
 * BrightCare - Unified PHP Entry Point
 * Routes all pages and renders appropriate content
 */

// Get requested page from query parameter
$page = isset($_GET['page']) ? basename($_GET['page']) : 'appointments';
$id = isset($_GET['id']) ? $_GET['id'] : null;
$patientId = isset($_GET['patientId']) ? $_GET['patientId'] : null;

// Determine page title and template
$pageTitle = 'BrightCare';
$pageContent = '';
$cssFiles = [];
$jsFiles = [];

switch ($page) {
    case 'login':
        $pageTitle = 'Login — BrightCare';
        $template = 'login';
        break;
    case 'appointments':
        $pageTitle = 'Appointments — BrightCare';
        $template = 'appointments';
        break;
    case 'appointments_calendar':
        $pageTitle = 'Calendar — BrightCare';
        $template = 'appointments_calendar';
        break;
    case 'appointment_new':
        $pageTitle = 'New Appointment — BrightCare';
        $template = 'appointment_new';
        break;
    case 'patients':
        $pageTitle = 'Patients — BrightCare';
        $template = 'patients';
        break;
    case 'patient_new':
        $pageTitle = 'New Patient — BrightCare';
        $template = 'patient_new';
        break;
    case 'patient_view':
        $pageTitle = 'Patient Details — BrightCare';
        $template = 'patient_view';
        break;
    case 'doctors':
        $pageTitle = 'Doctors — BrightCare';
        $template = 'doctors';
        break;
    case 'doctor_new':
        $pageTitle = 'New Doctor — BrightCare';
        $template = 'doctor_new';
        break;
    case 'rooms':
        $pageTitle = 'Rooms — BrightCare';
        $template = 'rooms';
        break;
    case 'room_new':
        $pageTitle = 'New Room — BrightCare';
        $template = 'room_new';
        break;
    case 'waitlist':
        $pageTitle = 'Waitlist — BrightCare';
        $template = 'waitlist';
        break;
    default:
        $template = 'appointments';
        break;
}

// Function to render header
function renderHeader($pageTitle, $page) {
    ?>
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title><?php echo htmlspecialchars($pageTitle); ?></title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/medical_clinic/public/css/main.css">
        <?php if ($page === 'appointments_calendar'): ?>
            <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>
        <?php endif; ?>
    </head>
    <body>
    <?php
}

// Function to render footer
function renderFooter() {
    ?>
        <script src="/medical_clinic/public/js/app.js" defer></script>
    </body>
    </html>
    <?php
}

// Function to render sidebar
function renderSidebar($activePage) {
    ?>
    <aside class="sidebar" role="navigation" aria-label="Main">
        <div class="brand">
            <div class="brand-logo">BC</div>
            <div class="brand-name">BrightCare</div>
        </div>

        <nav class="nav">
            <div class="nav-section">
                <div class="nav-title">Appointments</div>
                <a class="nav-link <?php echo $activePage === 'appointments_calendar' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=appointments_calendar">Calendar</a>
                <a class="nav-link <?php echo $activePage === 'appointments' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=appointments">View</a>
                <a class="nav-link <?php echo $activePage === 'waitlist' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=waitlist">Waiting List</a>
                <a class="nav-link <?php echo $activePage === 'appointment_new' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=appointment_new">Add</a>
            </div>

            <div class="nav-section">
                <div class="nav-title">Patients</div>
                <a class="nav-link <?php echo $activePage === 'patients' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=patients">View</a>
                <a class="nav-link <?php echo $activePage === 'patient_new' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=patient_new">Add</a>
            </div>

            <div class="nav-section">
                <div class="nav-title">Doctors</div>
                <a class="nav-link <?php echo $activePage === 'doctors' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=doctors">View</a>
                <a class="nav-link <?php echo $activePage === 'doctor_new' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=doctor_new">Add</a>
            </div>

            <div class="nav-section">
                <div class="nav-title">Rooms</div>
                <a class="nav-link <?php echo $activePage === 'rooms' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=rooms">View</a>
                <a class="nav-link <?php echo $activePage === 'room_new' ? 'active' : ''; ?>" 
                   href="/medical_clinic/public/index.php?page=room_new">Add</a>
            </div>
        </nav>

        <div class="sidebar-footer">
            <button id="logoutBtn" class="logout-btn" type="button">Log out</button>
        </div>
    </aside>
    <?php
}

// Function to render login page content
function renderLoginPage() {
    ?>
    <div class="login-wrapper">
        <div class="login-box">
            <h1 class="title">Sign in</h1>
            <p class="subtitle">BrightCare Clinic Management</p>

            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required />
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password" name="password" required />
                        <button type="button" class="toggle-password">Show</button>
                    </div>
                </div>

                <div class="form-actions">
                    <label class="remember">
                        <input type="checkbox" id="remember" />
                        Remember me
                    </label>
                    <button type="submit" id="loginBtn">Sign in</button>
                </div>

                <div id="loginMessage"></div>
            </form>
        </div>
    </div>
    <?php
}

// Function to render appointments page content
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

// Function to render calendar page content
function renderCalendarPage() {
    ?>
    <div class="calendar-page">
        <?php renderSidebar('appointments_calendar'); ?>

        <div class="calendar-main">
            <div class="topbar">
                <h1 class="title">Appointments Calendar</h1>
                <button id="todayBtn" type="button" class="btn-secondary">Today</button>
                <button id="weekBtn" type="button" class="btn-secondary">Week</button>
                <button id="dayBtn" type="button" class="btn-secondary">Day</button>
            </div>

            <div class="calendar-content">
                <div class="calendar-shell">
                    <div id="calendar"></div>
                    <div class="legend">
                        Colors: Blue = Scheduled | Green = Checked-in | Orange = Completed | Red = Cancelled
                    </div>
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
                <button id="createClose" class="icon-btn" aria-label="Close">×</button>
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
                    <textarea id="createComment" rows="3" placeholder="Comments…"></textarea>
                </label>
                <div class="modal-actions">
                    <div id="createMsg" class="form-msg"></div>
                    <button id="createCancel" type="button" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Create</button>
                </div>
            </form>
        </div>
    </div>

    <div id="eventModal" class="modal hidden" role="dialog" aria-label="Event actions">
        <div class="modal-backdrop"></div>
        <div class="modal-card">
            <header class="modal-header">
                <h2 id="eventTitle">Event</h2>
                <button id="eventClose" class="icon-btn" aria-label="Close">×</button>
            </header>
            <div class="modal-body">
                <button id="eventEdit" type="button" class="btn-primary full-width">Edit</button>
                <button id="eventMove" type="button" class="btn-secondary full-width">Move to Different Time</button>
                <button id="eventCancel" type="button" class="btn-danger full-width">Cancel</button>
            </div>
        </div>
    </div>
    <?php
}

// Function to render patients page content
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

// Function to render patient view page content
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
                        <tr>
                            <th>Created at</th>
                            <td class="value-cell"><span id="val-created_at"></span></td>
                            <td class="actions-cell"></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="card">
                <h2>Future Appointments</h2>
                <div class="table-wrap">
                    <table class="table" aria-label="Future appointments">
                        <thead>
                            <tr>
                                <th>Date</th><th>Time</th><th>Doctor</th><th>Room</th><th>Type</th><th>Status</th><th>Summary</th><th class="actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="futureBody">
                            <tr><td colspan="8" class="empty">Loading…</td></tr>
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
                                <th>Date</th><th>Time</th><th>Doctor</th><th>Room</th><th>Type</th><th>Status</th><th>Summary</th><th class="actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pastBody">
                            <tr><td colspan="8" class="empty">Loading…</td></tr>
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

// Function to render appointment creation page
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

// Function to render patient creation page
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

// Function to render doctors page
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
                <input id="doctorSearch" placeholder="Search name / specialty…" />
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
                                <th>Last Name</th>
                                <th>Specialty</th>
                                <th style="width:200px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="doctorsBody">
                            <tr><td colspan="5" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
    <?php
}

// Function to render doctor creation page
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
                        <label>Last Name
                            <input type="text" id="doctorLast" required>
                        </label>
                    </div>
                    <label>Specialty
                        <input type="text" id="doctorSpecialty" placeholder="e.g., Cardiology">
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

// Function to render rooms page
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
                <input id="roomSearch" placeholder="Search room number / name…" />
                <button id="roomSearchBtn" class="btn-secondary">Search</button>
                <span id="roomMsg" class="muted"></span>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table class="table" id="roomsTable" aria-label="Rooms table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th style="width:200px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="roomsBody">
                            <tr><td colspan="3" class="empty">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
    <?php
}

// Function to render room creation page
function renderRoomNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('room_new'); ?>
        <main class="container">
            <header class="page-header">
                <h1>New Room</h1>
            </header>
            <div class="card">
                <form id="roomForm">
                    <label>Room Number
                        <input type="text" id="roomNum" required>
                    </label>
                    <label>Name / Description
                        <input type="text" id="roomName" placeholder="e.g., Surgery Room A">
                    </label>
                    <div id="formMsg" class="form-msg"></div>
                    <div class="form-actions">
                        <a href="/medical_clinic/public/index.php?page=rooms" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <?php
}

// Function to render waitlist page
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
                        <button id="wlCreateBtn" type="button" class="btn-small primary">Create</button>
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

// Simple placeholder pages (you can expand these as needed)
function renderPlaceholderPage($title, $pageName) {
    ?>
    <div class="layout">
        <?php renderSidebar($pageName); ?>
        <main class="container">
            <header class="page-header">
                <h1><?php echo htmlspecialchars($title); ?></h1>
            </header>
            <div class="card">
                <p><?php echo htmlspecialchars($title); ?> page content coming soon.</p>
            </div>
        </main>
    </div>
    <?php
}

// Start output
renderHeader($pageTitle, $page);

// Render page content based on template
if ($page === 'login') {
    renderLoginPage();
} elseif ($page === 'appointments_calendar') {
    renderCalendarPage();
} elseif ($page === 'appointments') {
    renderAppointmentsPage();
} elseif ($page === 'appointment_new') {
    renderAppointmentNewPage();
} elseif ($page === 'patients') {
    renderPatientsPage();
} elseif ($page === 'patient_view') {
    renderPatientViewPage();
} elseif ($page === 'patient_new') {
    renderPatientNewPage();
} elseif ($page === 'doctors') {
    renderDoctorsPage();
} elseif ($page === 'doctor_new') {
    renderDoctorNewPage();
} elseif ($page === 'rooms') {
    renderRoomsPage();
} elseif ($page === 'room_new') {
    renderRoomNewPage();
} elseif ($page === 'waitlist') {
    renderWaitlistPage();
} else {
    // Placeholder for other pages
    renderPlaceholderPage($pageTitle, $page);
}

// End output
renderFooter();
?>
