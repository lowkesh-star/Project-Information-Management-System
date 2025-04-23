// Main JavaScript file for common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userType = localStorage.getItem('userType');

    if (isLoggedIn === 'true') {
        if (userType === 'student') {
            window.location.href = 'pages/student-dashboard.html';
        } else if (userType === 'faculty') {
            window.location.href = 'pages/faculty-dashboard.html';
        }
    }
});












