// Enable file input tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Add file name display
    document.getElementById('config_file').addEventListener('change', function(e) {
        var fileName = e.target.files[0].name;
        var fileInfo = document.querySelector('.form-text');
        fileInfo.textContent = 'Selected file: ' + fileName;
    });
});
