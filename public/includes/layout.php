<?php
function renderHeader($pageTitle, $page) {
    $bodyClass = ($page === 'login') ? 'login-page' : '';
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
    <body class="<?php echo $bodyClass; ?>">
    <?php
}

function renderFooter() {
    ?>
        <script src="/medical_clinic/public/js/app.js" defer></script>
    </body>
    </html>
    <?php
}

function renderSidebar($activePage) {
    ?>
    <aside class="sidebar" role="navigation" aria-label="Main">
        <div class="brand">
            <div class="brand-logo">BC</div>
            <div class="brand-name">BrightCare</div>
        </div>

        <nav class="nav">
            <div class="nav-section">
                <button class="nav-toggle collapsed" type="button">
                    <span class="nav-icon">A</span>
                    <span class="nav-label">Appointments</span>
                    <span class="nav-chevron">&gt;</span>
                </button>
                <div class="nav-links collapsed">
                    <a class="nav-link <?php echo $activePage === 'appointments_calendar' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=appointments_calendar">Calendar</a>
                    <a class="nav-link <?php echo $activePage === 'appointments' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=appointments">View</a>
                    <a class="nav-link <?php echo $activePage === 'waitlist' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=waitlist">Waiting List</a>
                    <a class="nav-link <?php echo $activePage === 'appointment_new' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=appointment_new">Add</a>
                </div>
            </div>

            <div class="nav-section">
                <button class="nav-toggle collapsed" type="button">
                    <span class="nav-icon">P</span>
                    <span class="nav-label">Patients</span>
                    <span class="nav-chevron">&gt;</span>
                </button>
                <div class="nav-links collapsed">
                    <a class="nav-link <?php echo $activePage === 'patients' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=patients">View</a>
                    <a class="nav-link <?php echo $activePage === 'patient_new' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=patient_new">Add</a>
                </div>
            </div>

            <div class="nav-section">
                <button class="nav-toggle collapsed" type="button">
                    <span class="nav-icon">D</span>
                    <span class="nav-label">Doctors</span>
                    <span class="nav-chevron">&gt;</span>
                </button>
                <div class="nav-links collapsed">
                    <a class="nav-link <?php echo $activePage === 'doctors' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=doctors">View</a>
                    <a class="nav-link <?php echo $activePage === 'doctor_new' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=doctor_new">Add</a>
                </div>
            </div>

            <div class="nav-section">
                <button class="nav-toggle collapsed" type="button">
                    <span class="nav-icon">R</span>
                    <span class="nav-label">Rooms</span>
                    <span class="nav-chevron">&gt;</span>
                </button>
                <div class="nav-links collapsed">
                    <a class="nav-link <?php echo $activePage === 'rooms' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=rooms">View</a>
                    <a class="nav-link <?php echo $activePage === 'room_new' ? 'active' : ''; ?>" 
                       href="/medical_clinic/public/index.php?page=room_new">Add</a>
                </div>
            </div>
        </nav>

        <div class="sidebar-footer">
            <button id="logoutBtn" class="logout-btn" type="button">Log out</button>
        </div>
    </aside>
    <?php
}

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

