<?php
// Auto-generated router after splitting page renders.
$page = isset($_GET['page']) ? basename($_GET['page']) : 'appointments';
$id = isset($_GET['id']) ? $_GET['id'] : null;
$patientId = isset($_GET['patientId']) ? $_GET['patientId'] : null;

$pageTitles = array(
    'login' => 'Login ? BrightCare',
    'appointments' => 'Appointments ? BrightCare',
    'appointments_calendar' => 'Calendar ? BrightCare',
    'appointment_new' => 'New Appointment ? BrightCare',
    'patients' => 'Patients ? BrightCare',
    'patient_view' => 'Patient Details ? BrightCare',
    'patient_new' => 'New Patient ? BrightCare',
    'doctors' => 'Doctors ? BrightCare',
    'doctor_new' => 'New Doctor ? BrightCare',
    'rooms' => 'Rooms ? BrightCare',
    'room_new' => 'New Room ? BrightCare',
    'waitlist' => 'Waitlist ? BrightCare',
);
$pageTitle = $pageTitles[$page] ?? 'BrightCare';

require_once __DIR__ . '/includes/layout.php';

$pageFiles = array(
    'login' => 'pages/login.php',
    'appointments' => 'pages/appointments.php',
    'appointments_calendar' => 'pages/appointments_calendar.php',
    'appointment_new' => 'pages/appointment_new.php',
    'patients' => 'pages/patients.php',
    'patient_view' => 'pages/patient_view.php',
    'patient_new' => 'pages/patient_new.php',
    'doctors' => 'pages/doctors.php',
    'doctor_new' => 'pages/doctor_new.php',
    'rooms' => 'pages/rooms.php',
    'room_new' => 'pages/room_new.php',
    'waitlist' => 'pages/waitlist.php',
);

$pageFunctions = array(
    'login' => 'renderLoginPage',
    'appointments' => 'renderAppointmentsPage',
    'appointments_calendar' => 'renderCalendarPage',
    'appointment_new' => 'renderAppointmentNewPage',
    'patients' => 'renderPatientsPage',
    'patient_view' => 'renderPatientViewPage',
    'patient_new' => 'renderPatientNewPage',
    'doctors' => 'renderDoctorsPage',
    'doctor_new' => 'renderDoctorNewPage',
    'rooms' => 'renderRoomsPage',
    'room_new' => 'renderRoomNewPage',
    'waitlist' => 'renderWaitlistPage',
);

renderHeader($pageTitle, $page);

if (isset($pageFiles[$page]) && file_exists(__DIR__ . '/' . $pageFiles[$page])) {
    require_once __DIR__ . '/' . $pageFiles[$page];
    $fn = $pageFunctions[$page] ?? null;
    if ($fn && function_exists($fn)) {
        $fn();
    } else {
        renderPlaceholderPage($pageTitle, $page);
    }
} else {
    renderPlaceholderPage($pageTitle, $page);
}

renderFooter();
?>
