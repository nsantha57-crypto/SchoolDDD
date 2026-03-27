var lastLoadedDates = {
    'students-table': '',
    'teachers-table': '',
    'prefects-table': ''
};
var deferredPrompt;

// Authentication State
var currentUser = {
    role: localStorage.getItem('userRole') || 'viewer', // 'viewer', 'class_teacher', 'flower_teacher', 'principal', 'admin'
    assignedClass: localStorage.getItem('assignedClass') || null
};

function handleRoleChange() {
    var role = document.getElementById('login-role').value;
    var pinGroup = document.getElementById('login-pin-group');
    var classGroup = document.getElementById('login-class-group');
    
    if (role === 'viewer') {
        pinGroup.style.display = 'none';
        classGroup.style.display = 'none';
    } else if (role === 'class_teacher') {
        pinGroup.style.display = 'block';
        classGroup.style.display = 'block';
    } else {
        pinGroup.style.display = 'block';
        classGroup.style.display = 'none';
    }
}

function processLogin() {
    var role = document.getElementById('login-role').value;
    var pin = document.getElementById('login-pin').value;
    var assignedClass = document.getElementById('login-class').value;
    
    if (role === 'admin' && (pin === 'admin123' || pin === '1234')) {
        currentUser.role = 'admin';
    } else if (role === 'principal' && (pin === 'prin123' || pin === '1234')) {
        currentUser.role = 'principal';
    } else if (role === 'flower_teacher' && (pin === 'flower123' || pin === '1234')) {
        currentUser.role = 'flower_teacher';
    } else if (role === 'class_teacher' && (pin === 'class123' || pin === '1234')) {
        currentUser.role = 'class_teacher';
        currentUser.assignedClass = assignedClass;
    } else if (role === 'viewer') {
        currentUser.role = 'viewer';
    } else {
        alert("වැරදි මුරපදයක්! (Invalid PIN!)");
        return;
    }
    
    // Persistence
    localStorage.setItem('userRole', currentUser.role);
    if (currentUser.assignedClass) {
        localStorage.setItem('assignedClass', currentUser.assignedClass);
    } else {
        localStorage.removeItem('assignedClass');
    }
    
    document.getElementById('login-modal').style.display = 'none';
    applyAccessControl();
    
    // Feedback
    var roleNames = {
        'admin': 'ප්‍රධාන පරිපාලක (Admin)',
        'principal': 'ප්‍රධානාචාර්ය (Principal)',
        'flower_teacher': 'මල් ලකුණු භාර ගුරු (Flower Teacher)',
        'class_teacher': 'පන්ති භාර ගුරු (Class Teacher)',
        'viewer': 'නරඹන්නෙකු (Viewer)'
    };
    alert(roleNames[currentUser.role] + " ලෙස සාර්ථකව ඇතුල් විය! (Logged in as " + currentUser.role + ")");
}

function applyAccessControl() {
    var allInputs = document.querySelectorAll('input:not(#login-pin), select:not(#login-role):not(#login-class), textarea');
    var allButtons = document.querySelectorAll('button:not(#menu-toggle):not(#theme-toggle):not(.btn-install)');
    
    // Default disable for everyone except admin
    if (currentUser.role !== 'admin') {
        allInputs.forEach(i => i.disabled = true);
        allButtons.forEach(b => {
            // Keep login button and lesson read-more buttons visible
            if (b.closest('#login-modal') || b.closest('.lesson-card') || b.closest('#lesson-modal')) return;
            // Hide other action buttons
            b.style.display = 'none';
        });
    } else {
        allInputs.forEach(i => i.disabled = false);
        allButtons.forEach(b => b.style.display = '');
        return; // Admin has full access, no further checks needed
    }
    
    // Principal overrides
    if (currentUser.role === 'principal') {
        // 5th col is Gilanpasa
        var gilanpasaInputs = document.querySelectorAll('#students-table td:nth-child(5) input');
        gilanpasaInputs.forEach(input => input.disabled = false);
        
        var classGilanpasa = document.querySelectorAll('#classes-table td:nth-child(4) input');
        classGilanpasa.forEach(input => input.disabled = false);
        
        document.querySelectorAll('.btn-save-all').forEach(b => b.style.display = '');
    }
    
    // Flower Teacher overrides
    if (currentUser.role === 'flower_teacher') {
        // 4th col is Flower marks
        var flowerInputs = document.querySelectorAll('#students-table td:nth-child(4) input');
        flowerInputs.forEach(input => input.disabled = false);
        
        var classFlower = document.querySelectorAll('#classes-table td:nth-child(3) input');
        classFlower.forEach(input => input.disabled = false);
        
        document.querySelectorAll('.btn-save-all').forEach(b => b.style.display = '');
    }
    
    // Class Teacher overrides
    if (currentUser.role === 'class_teacher' && currentUser.assignedClass) {
        var classFilter = document.getElementById('student-class-filter');
        if (classFilter) {
            classFilter.value = currentUser.assignedClass;
            filterStudentsByClass(); // Apply filter
            classFilter.disabled = true; // Lock dropdown
        }
        
        var studentRows = document.querySelectorAll('#students-table tbody tr');
        studentRows.forEach(row => {
            var gradeInput = row.querySelector('td:nth-child(2) select, td:nth-child(2) input');
            var gradeVal = gradeInput ? gradeInput.value.trim() : '';
            var cleanGradeVal = gradeVal.replace(/[^0-9]/g, '');
            var cleanFilterVal = currentUser.assignedClass.replace(/[^0-9]/g, '');
            
            if (cleanGradeVal === cleanFilterVal || gradeVal.indexOf(currentUser.assignedClass) !== -1 || gradeVal === "") {
                var rowInputs = row.querySelectorAll('input, select');
                rowInputs.forEach(i => i.disabled = false);
                var rowBtns = row.querySelectorAll('button');
                rowBtns.forEach(b => b.style.display = '');
            } else {
                row.style.display = 'none'; // Ensure others are hidden
            }
            // Ensure they can select attendance date
            var attDate = document.getElementById('student-attendance-date');
            if(attDate) attDate.disabled = false;
        });
        
        // Show add student btn and save btns
        var addStudentBtn = document.querySelector('#students .btn-primary');
        if (addStudentBtn) addStudentBtn.style.display = '';
        document.querySelectorAll('#students .btn-save-all').forEach(b => b.style.display = '');
    }
    
    // Update Role Status Badge
    var badge = document.getElementById('role-status-badge');
    if (badge) {
        var labels = {
            'admin': 'පරිපාලක (Admin)',
            'principal': 'ප්‍රධානාචාර්ය (Principal)',
            'flower_teacher': 'මල් ගුරු (Teacher)',
            'class_teacher': (currentUser.assignedClass || '') + ' පන්ති ගුරු',
            'viewer': 'නරඹන්නා (Viewer)'
        };
        badge.innerText = labels[currentUser.role] || labels['viewer'];
        badge.style.display = (currentUser.role === 'viewer') ? 'none' : 'block';
        badge.style.background = (currentUser.role === 'admin') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)';
        badge.style.color = (currentUser.role === 'admin') ? 'var(--danger-color)' : 'var(--primary-color)';
    }
    
    // Viewers and non-admins shouldn't see upload zones
    var uploadZone = document.querySelector('.gallery-upload-zone');
    if (uploadZone) {
        uploadZone.style.display = (currentUser.role === 'admin') ? 'flex' : 'none';
    }

    // Lessons Unlock Control Visibility
    var booksAdminMsg = document.getElementById('books-admin-controls');
    if (booksAdminMsg) {
        booksAdminMsg.style.display = (currentUser.role === 'admin' || currentUser.role === 'principal') ? 'block' : 'none';
    }
}

// PWA Install Prompt Listener
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    var installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed');
    var installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';
});

function initApp() {
    // 1. Theme Toggle (Dark/Light Mode)
    var themeBtn = document.getElementById('theme-toggle');
    var root = document.documentElement;

    if (themeBtn && root) {
        var isDark = false;
        try {
            isDark = localStorage.getItem('theme') === 'dark';
        } catch (e) {
            console.warn('localStorage not available', e);
        }
        
        if (isDark) {
            root.setAttribute('data-theme', 'dark');
            themeBtn.innerHTML = '<i class="fas fa-palette"></i>';
        }
        
        themeBtn.onclick = function() {
            var currentTheme = root.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                root.removeAttribute('data-theme');
                try { localStorage.setItem('theme', 'light'); } catch(e){}
                themeBtn.innerHTML = '<i class="fas fa-palette"></i>';
            } else {
                root.setAttribute('data-theme', 'dark');
                try { localStorage.setItem('theme', 'dark'); } catch(e){}
                themeBtn.innerHTML = '<i class="fas fa-palette"></i>';
            }
        };
    }

    // 2. Navigation Logic (Bulletproof)
    var navLinks = document.querySelectorAll('.nav-links li');
    var sections = document.querySelectorAll('.page-section');
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var menuToggle = document.getElementById('menu-toggle');
    
    function toggleSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    }

    if (menuToggle) {
        menuToggle.onclick = toggleSidebar;
    }

    if (overlay) {
        overlay.onclick = toggleSidebar;
    }
    
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].onclick = function() {
            // Remove active class from all links
            for (var j = 0; j < navLinks.length; j++) {
                navLinks[j].className = navLinks[j].className.replace('active', '').trim();
            }
            // Remove active class from all sections
            for (var k = 0; k < sections.length; k++) {
                sections[k].className = sections[k].className.replace('active', '').trim();
            }
            
            // Add active to the clicked link
            if (this.className.indexOf('active') === -1) {
                this.className += ' active';
            }
            
            // Add active to the corresponding section
            var targetId = this.getAttribute('data-target');
            if (targetId) {
                var targetSection = document.getElementById(targetId);
                if (targetSection) {
                    if (targetSection.className.indexOf('active') === -1) {
                        targetSection.className += ' active';
                    }
                    
                    // NEW: Refresh table data for the specific section's current date
                    if (targetId === 'students') refreshTableUI('students-table');
                    if (targetId === 'teachers') refreshTableUI('teachers-table');
                    if (targetId === 'prefects') refreshTableUI('prefects-table');

                    // Smooth scroll on mobile
                    if (window.innerWidth <= 992) {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }

            // Ensure access control is correct for the new section
            if (typeof applyAccessControl === 'function') applyAccessControl();

            // Close sidebar after clicking
            toggleSidebar();
        };

    }

    // 3. Notices Section - Dropdown logic
    var recipientSelect = document.getElementById('notice-recipient');
    var classSelector = document.getElementById('class-selector');
    
    if (recipientSelect && classSelector) {
        recipientSelect.onchange = function(e) {
            if (e.target.value === 'class_wise') {
                classSelector.style.display = 'block';
            } else {
                classSelector.style.display = 'none';
            }
            saveData();
        };
    }

    // 4. Logo Upload Preview
    var logoUpload = document.getElementById('logo-upload');
    var sidebarLogo = document.getElementById('sidebar-logo');
    var sidebarPlaceholder = document.getElementById('sidebar-logo-placeholder');
    var mobileMainLogo = document.querySelector('.mobile-main-logo');
    var mobilePlaceholder = document.getElementById('mobile-logo-placeholder');
    var favicon = document.getElementById('favicon');
    var appleIcon = document.getElementById('apple-icon');
    
    function updateAllLogos(src) {
        if (sidebarLogo) {
            sidebarLogo.src = src;
            sidebarLogo.style.display = src ? 'block' : 'none';
        }
        if (sidebarPlaceholder) {
            sidebarPlaceholder.style.display = src ? 'none' : 'flex';
        }
        // Home Logo
        var homeLogo = document.getElementById('home-logo');
        var homeLogoPlaceholder = document.getElementById('home-logo-placeholder');
        if (homeLogo) {
            homeLogo.src = src;
            homeLogo.style.display = src ? 'block' : 'none';
        }
        if (homeLogoPlaceholder) {
            homeLogoPlaceholder.style.display = src ? 'none' : 'flex';
        }
        if (mobileMainLogo) {
            mobileMainLogo.src = src;
            mobileMainLogo.style.display = src ? 'block' : 'none';
        }
        if (mobilePlaceholder) {
            mobilePlaceholder.style.display = src ? 'none' : 'flex';
        }
        if (favicon) favicon.href = src || 'assets/flower-logo.png';
        if (appleIcon) appleIcon.href = src || 'assets/flower-logo.png';
        
        // Dynamic Manifest Update (Disabled as Blob URLs break mobile installation)
        // updateDynamicManifest(src);
    }
    
    function updateDynamicManifest(src) {
        if (!src) return;
        var manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) return;

        // Current manifest structure
        var m = {
            "name": getElValue('school-name') || "පාසල් කළමනාකරණ පද්ධතිය",
            "short_name": "කළමනාකරණය",
            "description": "School Management System",
            "start_url": "index.html",
            "display": "standalone",
            "background_color": "#fffde7",
            "theme_color": "#6366f1",
            "icons": [
                { "src": src, "sizes": "192x192", "type": "image/png" },
                { "src": src, "sizes": "512x512", "type": "image/png" }
            ]
        };
        
        try {
            var stringManifest = JSON.stringify(m);
            var blob = new Blob([stringManifest], {type: 'application/json'});
            var manifestUrl = URL.createObjectURL(blob);
            manifestLink.href = manifestUrl;
            console.log("Dynamic Manifest Updated with new logo");
        } catch(e) {
            console.warn("Could not create dynamic manifest", e);
        }
    }
    
    if (logoUpload) {
        logoUpload.onchange = function(e) {
            var file = e.target.files ? e.target.files[0] : null;
            if (file) {
                var reader = new FileReader();
                reader.onload = function(evt) {
                    updateAllLogos(evt.target.result);
                    try {
                        localStorage.setItem('school-logo', evt.target.result);
                    } catch(e) {
                        console.warn("Logo too large to save in localStorage");
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        // Load saved logo
        var savedLogo = localStorage.getItem('school-logo');
        if (savedLogo) {
            updateAllLogos(savedLogo);
        } else {
            updateAllLogos('assets/flower-logo.png'); // Show default flower logo
        }
    }

    // 4.1 Gallery Upload logic
    var galleryUpload = document.getElementById('gallery-upload');
    var galleryGrid = document.getElementById('gallery-grid');
    var dropZone = document.getElementById('drop-zone');
    
    function handleFiles(files) {
        if (!files || files.length === 0) return;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            
            // Check file size (localStorage limit is ~5MB total)
            if (file.size > 1024 * 1024) { // Warn for files > 1MB
                var proceed = confirm("මෙම ඡායාරූපය තරමක් විශාලයි (" + (file.size / (1024*1024)).toFixed(2) + "MB). මෙය සුරැකීමේදී ගැටලු ඇතිවිය හැක. කුඩා ඡායාරූපයක් භාවිතා කිරීමට උත්සාහ කරන්න. එසේ වුවත් මෙය එක් කිරීමට කැමතිද?");
                if (!proceed) continue;
            }

            var reader = new FileReader();
            reader.onload = function(evt) {
                var photoData = {
                    src: evt.target.result,
                    name: '',
                    date: new Date().toISOString().split('T')[0]
                };
                
                // Attempt to save and catch storage errors
                try {
                    addGalleryPhoto(photoData, true); // True to prepend
                    saveData();
                } catch(e) {
                    alert("දත්ත ගබඩාව පිරී ඇත (Memory Full). කරුණාකර පැරණි ඡායාරූප කිහිපයක් මකා දමා නැවත උත්සාහ කරන්න.");
                }

                // Ensure the view scrolls to see the new photo at top
                if (galleryGrid) galleryGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            reader.readAsDataURL(file);
        }
    }

    if (galleryUpload) {
        galleryUpload.onchange = function(e) { handleFiles(e.target.files); };
    }

    if (dropZone) {
        dropZone.ondragover = function(e) { e.preventDefault(); this.style.borderColor = 'var(--primary-color)'; };
        dropZone.ondragleave = function(e) { e.preventDefault(); this.style.borderColor = 'var(--border-color)'; };
        dropZone.ondrop = function(e) { e.preventDefault(); this.style.borderColor = 'var(--border-color)'; handleFiles(e.dataTransfer.files); };
    }

    // Dynamic Header Visibility & Title Update Logic
    var schoolNameInput = document.getElementById('school-name');
    var displaySchoolName = document.getElementById('display-school-name');
    var mobileSchoolTitle = document.querySelector('.mobile-school-title');
    
    if (schoolNameInput) {
        schoolNameInput.addEventListener('input', function() {
            var val = this.value || 'පාසල් නම';
            if (displaySchoolName) displaySchoolName.innerText = val;
            if (mobileSchoolTitle) mobileSchoolTitle.innerText = val;
            var sidebarSchoolName = document.getElementById('sidebar-school-name');
            if (sidebarSchoolName) sidebarSchoolName.innerText = val;
        });
    }

    // 5. Dynamic Marks Calculation for Interview Board
    initializeMarksCalculation();

    // 6. Initialize Flatpickr for Date Inputs
    if (typeof flatpickr !== 'undefined') {
        flatpickr("input[type='date'], .datepicker", {
            dateFormat: "Y-m-d",
            allowInput: true,
            onChange: function(selectedDates, dateStr, instance) { 
                var inputId = instance.element.id;
                var tableId = '';
                
                if (inputId === 'student-attendance-date') tableId = 'students-table';
                else if (inputId === 'teacher-attendance-date') tableId = 'teachers-table';
                else if (inputId === 'prefect-attendance-date') tableId = 'prefects-table';

                if (tableId) {
                    // 1. Save current UI data to the OLD date before switching
                    saveData(); 
                    
                    // 2. Update the tracking variable to the NEW date
                    lastLoadedDates[tableId] = dateStr;
                    
                    // 3. Load UI data for the NEW date
                    refreshTableUI(tableId);
                } else {
                    saveData();
                }
            }
        });
    }

    // Initialize tracking dates from current input values
    lastLoadedDates['students-table'] = getElValue('student-attendance-date') || 'no-date';
    lastLoadedDates['teachers-table'] = getElValue('teacher-attendance-date') || 'no-date';
    lastLoadedDates['prefects-table'] = getElValue('prefect-attendance-date') || 'no-date';

    // 7. Load Data from LocalStorage
    loadData();
    
    // Apply initial access control right away
    applyAccessControl();

    // 8. Attach Auto-save Listeners
    attachAutoSave();
    
    // 9. Initial filter run
    if (typeof filterStudentsByClass === 'function') filterStudentsByClass();

    // 10. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js').then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    // 11. Install Button Logic
    var installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.onclick = function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                    installBtn.style.display = 'none';
                });
            }
        };
    }
}

// Function to filter students by selected class
function filterStudentsByClass() {
    var filterSelect = document.getElementById('student-class-filter');
    if (!filterSelect) return;
    
    var filterVal = filterSelect.value;
    var rows = document.querySelectorAll('#students-table tbody tr');
    
    rows.forEach(row => {
        var gradeInput = row.querySelector('td:nth-child(2) select, td:nth-child(2) input'); // Grade is in 2nd column
        var gradeVal = gradeInput ? gradeInput.value.trim() : '';
        
        if (filterVal === 'all' || !filterVal) {
            row.style.display = '';
        } else {
            // Check if the grade value matches the filter (e.g. "5" or "5 ශ්‍රේණිය")
            // We strip any non-numeric characters to compare cleanly if it's a numeric grade
            var cleanGradeVal = gradeVal.replace(/[^0-9]/g, '');
            var cleanFilterVal = filterVal.replace(/[^0-9]/g, '');
            
            if (cleanGradeVal === cleanFilterVal || gradeVal.indexOf(filterVal) !== -1) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Function to trigger save manually
function manualSave() {
    saveData();
    alert("සියලුම දත්ත සාර්ථකව සුරකින ලදී! (All data saved successfully!)");
}

// Function to collect all data and save to localStorage (Date-Specific Logic)
function saveData() {
    var raw = localStorage.getItem('schoolAppData');
    var data = raw ? JSON.parse(raw) : {};
    
    // 1. Static Configuration
    data.home = {
        name: getElValue('school-name'),
        address: getElValue('school-address'),
        theme: getElValue('school-theme'),
        principal: getElValue('principal-name'),
        phone1: getElValue('phone-1'),
        phone2: getElValue('phone-2'),
        phone3: getElValue('phone-3')
    };
    
    data.dates = {
        students: getElValue('student-attendance-date'),
        teachers: getElValue('teacher-attendance-date'),
        prefects: getElValue('prefect-attendance-date')
    };
    
    data.classInfo = {
        teacher: getElValue('class-teacher-name'),
        topStudents: Array.from(document.querySelectorAll('#top-students-list input')).map(i => i.value)
    };

    data.lessons = {
        unlockLevel: getElValue('unlock-level') || 1
    };

    if (!data.registry) data.registry = {}; 
    if (!data.dailyRecords) data.dailyRecords = {};

    // 2. Students Registry & Daily Records
    var studentTable = document.getElementById('students-table');
    if (studentTable) {
        var rows = studentTable.querySelectorAll('tbody tr');
        var date = lastLoadedDates['students-table'] || 'no-date'; 
        if (!data.dailyRecords[date]) data.dailyRecords[date] = {};
        data.dailyRecords[date]['students-table'] = {};
        
        var reg = [];
        rows.forEach(row => {
            var inputs = row.querySelectorAll('input:not([type="checkbox"]), select');
            var checks = row.querySelectorAll('input[type="checkbox"]');
            var name = (inputs[0] ? inputs[0].value : '');
            if (name) {
                // Identity part: slices first 7 inputs (Name, Parent, WA1, WA2, BDay, Addr, Grade)
                reg.push(Array.from(inputs).slice(0, 7).map(i => i.value));
                // Daily part: (Att, Flower, Gilanpasa, TermMarks)
                data.dailyRecords[date]['students-table'][name] = {
                    att: (checks[0] ? checks[0].checked : false),
                    flower: (inputs[7] ? inputs[7].value : ''),
                    gilanpasa: (inputs[8] ? inputs[8].value : ''),
                    term: (inputs[9] ? inputs[9].value : '')
                };
            }
        });
        data.registry['students-table'] = reg;
    }

    // 3. Teachers
    var teacherTable = document.getElementById('teachers-table');
    if (teacherTable) {
        var rows = teacherTable.querySelectorAll('tbody tr');
        var date = lastLoadedDates['teachers-table'] || 'no-date';
        if (!data.dailyRecords[date]) data.dailyRecords[date] = {};
        data.dailyRecords[date]['teachers-table'] = {};
        var reg = [];
        rows.forEach(row => {
            var inputs = row.querySelectorAll('input:not([type="checkbox"]), select');
            var name = (inputs[0] ? inputs[0].value : '');
            if (name) {
                reg.push(Array.from(inputs).slice(0, 4).map(i => i.value));
                var checks = row.querySelectorAll('input[type="checkbox"]');
                data.dailyRecords[date]['teachers-table'][name] = { att: (checks[0] ? checks[0].checked : false) };
            }
        });
        data.registry['teachers-table'] = reg;
    }

    // 4. Prefects
    var prefectTable = document.getElementById('prefects-table');
    if (prefectTable) {
        var rows = prefectTable.querySelectorAll('tbody tr');
        var date = lastLoadedDates['prefects-table'] || 'no-date';
        if (!data.dailyRecords[date]) data.dailyRecords[date] = {};
        data.dailyRecords[date]['prefects-table'] = {};
        var reg = [];
        rows.forEach(row => {
            var inputs = row.querySelectorAll('input:not([type="checkbox"]), select');
            var name = (inputs[0] ? inputs[0].value : '');
            if (name) {
                reg.push(Array.from(inputs).slice(0, 3).map(i => i.value));
                var checks = row.querySelectorAll('input[type="checkbox"]');
                data.dailyRecords[date]['prefects-table'][name] = { att: (checks[0] ? checks[0].checked : false) };
            }
        });
        data.registry['prefects-table'] = reg;
    }

    // Legacy Tables & Gallery
    data.tables = {
        interview: getTableData('interview-table'),
        classes: getTableData('classes-table')
    };
    
    data.gallery = [];
    document.querySelectorAll('#gallery-grid .gallery-card').forEach(card => {
        var img = card.querySelector('img');
        var gInputs = card.querySelectorAll('input');
        data.gallery.push({ 
            src: (img ? img.src : ''), 
            name: (gInputs[0] ? gInputs[0].value : ''), 
            date: (gInputs[1] ? gInputs[1].value : '') 
        });
    });

    try {
        localStorage.setItem('schoolAppData', JSON.stringify(data));
    } catch(e) {
        console.warn("Storage Full");
    }
}

function addGalleryPhoto(photoData, top = false) {
    var galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    
    var card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
        <img src="${photoData.src}" alt="Event">
        <div class="gallery-info">
            <input type="text" class="table-input" placeholder="උත්සවයේ නම (Event Name)..." value="${photoData.name}">
            <input type="date" class="table-input mt-1" value="${photoData.date}">
            <button class="btn btn-danger btn-sm mt-2" onclick="if(confirm('මකන්නද? (Are you sure you want to delete?)')) { this.closest('.gallery-card').remove(); saveData(); }" style="width:100%"><i class="fas fa-trash"></i> මකන්න</button>
        </div>
    `;
    if (top) {
        galleryGrid.prepend(card);
    } else {
        galleryGrid.appendChild(card);
    }
    attachAutoSave(); // Attach to new inputs
}

function getTableData(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return [];
    var rows = table.querySelectorAll('tbody tr');
    var tableData = [];
    
    rows.forEach(row => {
        var rowData = [];
        var inputs = row.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                rowData.push({ type: 'checkbox', value: input.checked });
            } else if (input.tagName === 'SELECT') {
                rowData.push({ type: 'select', value: input.value });
            } else {
                rowData.push({ type: 'text', value: input.value });
            }
        });
        tableData.push(rowData);
    });
    return tableData;
}

// Function to load data from localStorage
function loadData() {
    var savedData = localStorage.getItem('schoolAppData');
    if (!savedData) {
        applyUnlockLevel(1); // Default
        return;
    }
    
    try {
        var data = JSON.parse(savedData);
        
        // Restore Lesson Unlock Level
        if (data.lessons) {
            var level = data.lessons.unlockLevel || 1;
            if (document.getElementById('unlock-level')) {
                document.getElementById('unlock-level').value = level;
            }
            applyUnlockLevel(level);
        } else {
            applyUnlockLevel(1);
        }
        
        // Restore Home section
        if (data.home) {
            if (document.getElementById('school-name')) {
                document.getElementById('school-name').value = data.home.name || '';
                if (document.getElementById('display-school-name')) {
                    document.getElementById('display-school-name').innerText = data.home.name || 'පාසල් නම';
                }
                var sidebarSchoolName = document.getElementById('sidebar-school-name');
                if (sidebarSchoolName) {
                    sidebarSchoolName.innerText = data.home.name || 'පාසල් නම';
                }
                var mobileSchoolTitle = document.querySelector('.mobile-school-title');
                if (mobileSchoolTitle) {
                    mobileSchoolTitle.innerText = data.home.name || 'පාසල් නම';
                }
            }
            if (document.getElementById('school-address')) document.getElementById('school-address').value = data.home.address || '';
            if (document.getElementById('school-theme')) document.getElementById('school-theme').value = data.home.theme || '';
            if (document.getElementById('principal-name')) document.getElementById('principal-name').value = data.home.principal || '';
            if (document.getElementById('phone-1')) document.getElementById('phone-1').value = data.home.phone1 || '';
            if (document.getElementById('phone-2')) document.getElementById('phone-2').value = data.home.phone2 || '';
            if (document.getElementById('phone-3')) document.getElementById('phone-3').value = data.home.phone3 || '';
        }

        // Restore Dates
        if (data.dates) {
            if (document.getElementById('student-attendance-date')) document.getElementById('student-attendance-date').value = data.dates.students || '';
            if (document.getElementById('teacher-attendance-date')) document.getElementById('teacher-attendance-date').value = data.dates.teachers || '';
            if (document.getElementById('prefect-attendance-date')) document.getElementById('prefect-attendance-date').value = data.dates.prefects || '';
        }

        // Restore Class Info
        if (data.classInfo) {
            if (document.getElementById('class-teacher-name')) document.getElementById('class-teacher-name').value = data.classInfo.teacher || '';
            var topInputs = document.querySelectorAll('#top-students-list input');
            topInputs.forEach((input, index) => {
                if (data.classInfo.topStudents[index]) input.value = data.classInfo.topStudents[index];
            });
        }

        // Restore Registry Based Tables
        if (data.registry) {
            restoreRegistryTable('students-table', data.registry['students-table'], data.dailyRecords);
            restoreRegistryTable('teachers-table', data.registry['teachers-table'], data.dailyRecords);
            restoreRegistryTable('prefects-table', data.registry['prefects-table'], data.dailyRecords);
        }

        // Restore Legacy/Static Tables
        if (data.tables) {
            restoreTable('interview-table', data.tables.interview);
            restoreTable('classes-table', data.tables.classes);
        }

        // Restore Gallery
        if (data.gallery && data.gallery.length > 0) {
            var galleryGrid = document.getElementById('gallery-grid');
            if (galleryGrid) {
                galleryGrid.innerHTML = '';
                data.gallery.forEach(item => addGalleryPhoto(item));
            }
        }

        // Update tracking variables to match restored dates
        lastLoadedDates['students-table'] = getElValue('student-attendance-date') || 'no-date';
        lastLoadedDates['teachers-table'] = getElValue('teacher-attendance-date') || 'no-date';
        lastLoadedDates['prefects-table'] = getElValue('prefect-attendance-date') || 'no-date';

        console.log("Data loaded from localStorage");
    } catch (e) {
        console.error("Error loading data", e);
    }
}

function restoreRegistryTable(tableId, regData, dailyRecords) {
    if (!regData || regData.length === 0) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var firstRow = tbody.querySelector('tr');
    if (!firstRow) return;
    tbody.innerHTML = '';

    // Determine current date to apply status
    var dateInputId = tableId.replace('-table', '-attendance-date');
    if (tableId === 'students-table') dateInputId = 'student-attendance-date';
    else if (tableId === 'teachers-table') dateInputId = 'teacher-attendance-date';
    else if (tableId === 'prefects-table') dateInputId = 'prefect-attendance-date';
    
    var date = getElValue(dateInputId) || 'no-date';
    var statusMap = dailyRecords && dailyRecords[date] ? dailyRecords[date][tableId] : {};

    regData.forEach(identity => {
        var clonedRow = firstRow.cloneNode(true);
        var inputs = clonedRow.querySelectorAll('input:not([type="checkbox"]), select');
        var checks = clonedRow.querySelectorAll('input[type="checkbox"]');
        
        // Fill identity (Name, etc.)
        identity.forEach((val, idx) => {
            if (inputs[idx]) inputs[idx].value = val || '';
        });

        // Apply Status (Attendance/Marks) via Name Lookup
        var name = identity[0];
        var rec = statusMap && name ? statusMap[name] : null;

        if (tableId === 'students-table') {
            if (checks[0]) checks[0].checked = rec ? rec.att : false;
            if (inputs[7]) inputs[7].value = rec ? rec.flower : '';
            if (inputs[8]) inputs[8].value = rec ? rec.gilanpasa : '';
            if (inputs[9]) inputs[9].value = rec ? rec.term : '';
        } else {
            if (checks[0]) checks[0].checked = rec ? rec.att : false;
        }
        
        tbody.appendChild(clonedRow);
    });
}

function restoreTable(tableId, data) {
    if (!data || data.length === 0) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var firstRow = tbody.querySelector('tr');
    if (!firstRow) return;
    tbody.innerHTML = '';
    
    data.forEach(rowData => {
        var clonedRow = firstRow.cloneNode(true);
        var inputs = clonedRow.querySelectorAll('input, select');
        rowData.forEach((val, index) => {
            if (inputs[index]) {
                if (val.type === 'checkbox') inputs[index].checked = (val.value === true);
                else inputs[index].value = val.value || '';
            }
        });
        tbody.appendChild(clonedRow);
    });
    
    if (tableId === 'interview-table') {
        tbody.querySelectorAll('tr').forEach(row => calculateRowTotal(row));
        initializeMarksCalculation();
    }
}

function refreshTableUI(tableId) {
    var raw = localStorage.getItem('schoolAppData');
    if (!raw) return;
    var data = JSON.parse(raw);
    
    var dateInputId = (tableId === 'students-table') ? 'student-attendance-date' : 
                    (tableId === 'teachers-table') ? 'teacher-attendance-date' : 'prefect-attendance-date';
    
    var date = getElValue(dateInputId) || 'no-date';
    var records = data.dailyRecords && data.dailyRecords[date] ? data.dailyRecords[date][tableId] : {};
    
    var table = document.getElementById(tableId);
    var rows = table ? table.querySelectorAll('tbody tr') : null;
    if (!rows) return;

    rows.forEach(row => {
        var inputs = row.querySelectorAll('input:not([type="checkbox"]), select');
        var checks = row.querySelectorAll('input[type="checkbox"]');
        var name = (inputs[0] ? inputs[0].value : '');
        var rec = records && name ? records[name] : null;
        
        if (tableId === 'students-table') {
            if (checks[0]) checks[0].checked = rec ? rec.att : false;
            if (inputs[7]) inputs[7].value = rec ? rec.flower : '';
            if (inputs[8]) inputs[8].value = rec ? rec.gilanpasa : '';
            if (inputs[9]) inputs[9].value = rec ? rec.term : '';
        } else {
            if (checks[0]) checks[0].checked = rec ? rec.att : false;
        }
    });
    
    // Apply access control to updated rows
    if (typeof applyAccessControl === 'function') applyAccessControl();
}

// Attach event listeners to all inputs to trigger save
function attachAutoSave() {
    var inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.removeEventListener('input', saveData);
        input.addEventListener('input', saveData);
        input.removeEventListener('change', saveData);
        input.addEventListener('change', saveData);
    });
}

// Ensure the code runs regardless of when the script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Function to add a generic row to tables
function addRow(btn) {
    if (!btn || !btn.previousElementSibling) return;
    var tableBody = btn.previousElementSibling.querySelector('tbody');
    if (!tableBody) return;
    var firstRow = tableBody.querySelector('tr');
    
    var rowToClone = firstRow;
    
    // If table is empty, use a template based on the table ID
    if (!rowToClone) {
        var tableId = btn.previousElementSibling.id;
        var tempTable = document.createElement('table');
        if (tableId === 'students-table') {
            tempTable.innerHTML = `<table><tbody><tr class="student-row"><td><div class="student-details-container"><input type="text" class="table-input" placeholder="සිසුවාගේ නම (Student Name)..."><input type="text" class="table-input" placeholder="දෙමාපිය නම (Parent Name)..."><input type="text" class="table-input" placeholder="දෙමාපිය WhatsApp..."><input type="text" class="table-input" placeholder="සිසුවාගේ WhatsApp..."><input type="text" class="table-input datepicker" placeholder="උපන් දිනය (YYYY-MM-DD)..." title="උපන් දිනය"><input type="text" class="table-input full-width" placeholder="ලිපිනය (Address)..."></div></td><td><select class="table-input" style="width: 100px;"><option value="">පන්තිය...</option><option value="1">1 ශ්‍රේණිය</option><option value="2">2 ශ්‍රේණිය</option><option value="3">3 ශ්‍රේණිය</option><option value="4">4 ශ්‍රේණිය</option><option value="5">5 ශ්‍රේණිය</option><option value="6">6 ශ්‍රේණිය</option><option value="7">7 ශ්‍රේණිය</option><option value="8">8 ශ්‍රේණිය</option><option value="9">9 ශ්‍රේණිය</option><option value="10">10 ශ්‍රේණිය</option><option value="11">11 ශ්‍රේණිය</option><option value="12">12 ශ්‍රේණිය</option><option value="13">13 ශ්‍රේණිය</option></select></td><td><input type="checkbox" class="attendance-check" title="Present"> පැමිණීම</td><td><input type="number" min="0" max="10" class="table-input small-input" placeholder="0" title="මල් පූජාව"></td><td><input type="number" min="0" max="10" class="table-input small-input" placeholder="0" title="ගිලන්පස"></td><td><input type="number" min="0" max="100" class="table-input small-input" placeholder="0" title="වාර විභාග ලකුණු"></td><td><div class="student-actions"><button class="btn btn-warning btn-sm" onclick="sendAbsenceSMS(this)" title="නොපැමිණි බව දැන්වීම"><i class="fab fa-whatsapp"></i></button><button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button></div></td></tr></tbody></table>`;
        } else if (tableId === 'teachers-table') {
            tempTable.innerHTML = `<table><tbody><tr><td><div class="teacher-details-container"><input type="text" class="table-input" placeholder="ගුරුවරයාගේ නම (Teacher Name)..."><input type="text" class="table-input" placeholder="ලිපිනය (Address)..."><input type="text" class="table-input full-width" placeholder="WhatsApp / දුරකථන අංකය..."></div></td><td><input type="text" class="table-input" value="පන්ති භාර ගුරු" placeholder="තනතුර..."></td><td><input type="checkbox" class="attendance-check"></td><td><div class="teacher-actions"><button class="btn btn-warning btn-sm" onclick="sendTeacherLeave(this, 'whatsapp')"><i class="fab fa-whatsapp"></i> නිවාඩු</button><button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button></div></td></tr></tbody></table>`;
        } else if (tableId === 'prefects-table') {
            tempTable.innerHTML = `<table><tbody><tr><td><div class="prefect-details-container"><input type="text" class="table-input" placeholder="ශිෂ්‍ය නායකයාගේ නම..."><input type="text" class="table-input" placeholder="WhatsApp / දුරකථන අංකය..."></div></td><td><input type="text" class="table-input" value="සාමාන්‍ය ශිෂ්‍ය නායක" placeholder="තනතුර..."></td><td><input type="checkbox" class="attendance-check"></td><td><div style="display:flex; gap:5px;"><button class="btn btn-warning btn-sm" onclick="sendPrefectNotice(this)" title="දැන්වීමක් යවන්න"><i class="fab fa-whatsapp"></i></button><button class="btn btn-danger btn-sm" onclick="removeRow(this)" title="මකන්න"><i class="fas fa-trash"></i></button></div></td></tr></tbody></table>`;
        } else if (tableId === 'interview-table') {
            tempTable.innerHTML = `<table><tbody><tr><td><input type="text" class="table-input" placeholder="නම..."></td><td><input type="number" max="20" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td><input type="number" max="10" placeholder="0" class="mark-input"></td><td class="total-marks"><span class="badge badge-success">0</span></td><td><button class="btn btn-danger" onclick="removeRow(this)" title="මකන්න" style="padding: 0.6rem 0.8rem;"><i class="fas fa-trash"></i></button></td></tr></tbody></table>`;
        } else if (tableId === 'classes-table') {
             tempTable.innerHTML = `<table><tbody><tr><td><input type="text" class="table-input" placeholder="නම..."></td><td><input type="number" class="table-input small-input"></td><td><input type="number" class="table-input small-input"></td><td><input type="number" class="table-input small-input"></td><td><input type="text" class="table-input" placeholder="උදා: පන්ති නායක..."></td><td><button class="btn btn-danger" onclick="removeRow(this)" title="මකන්න" style="padding: 0.6rem 0.8rem;"><i class="fas fa-trash"></i></button></td></tr></tbody></table>`;
        }
        rowToClone = tempTable.querySelector('tr');
    }
    
    if (rowToClone) {
        var clonedRow = rowToClone.cloneNode(true);
        // Clear inputs in cloned row
        var inputs = clonedRow.querySelectorAll('input:not([type="checkbox"]), select');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].value = '';
        }
        var checkboxes = clonedRow.querySelectorAll('input[type="checkbox"]');
        for (var j = 0; j < checkboxes.length; j++) {
            checkboxes[j].checked = false;
        }
        var totalBadges = clonedRow.querySelectorAll('.badge');
        for (var k = 0; k < totalBadges.length; k++) {
            totalBadges[k].innerHTML = '0';
        }

        // Set default values based on table type
        var tableId = btn.previousElementSibling.id;
        if (tableId === 'teachers-table') {
            var roleInput = clonedRow.querySelector('td:nth-child(2) input');
            if (roleInput) roleInput.value = 'පන්ති භාර ගුරු';
        } else if (tableId === 'prefects-table') {
            var roleInput = clonedRow.querySelector('td:nth-child(2) input');
            if (roleInput) roleInput.value = 'සාමාන්‍ය ශිෂ්‍ය නායක';
        }

        tableBody.appendChild(clonedRow);
        
        // Save state
        saveData();
        attachAutoSave(); // Attach to new inputs
        
        // NEW: Re-filter after adding row if a filter is active
        filterStudentsByClass();
        
        // Re-initialize mark calculation listeners if it's the marks table
        if (btn.previousElementSibling.className.indexOf('marks-table') !== -1) {
            initializeMarksCalculation();
        }
        
        // Re-initialize flatpickr on new date inputs if any
        if (typeof flatpickr !== 'undefined') {
            var newDateInputs = clonedRow.querySelectorAll('input[type="date"], .datepicker');
            if (newDateInputs.length > 0) {
                flatpickr(newDateInputs, {
                    dateFormat: "Y-m-d",
                    allowInput: true,
                    onChange: function() { saveData(); }
                });
            }
        }
        
        if (typeof applyAccessControl === 'function') applyAccessControl();
    }
}

// SMS / WhatsApp Real Actions
function sendAbsenceSMS(btn) {
    sendIndividualWhatsApp(btn, 'student_absence');
}

function sendTeacherLeave(btn, method) {
    sendIndividualWhatsApp(btn, 'teacher_leave');
}

function sendPrefectNotice(btn) {
    sendIndividualWhatsApp(btn, 'prefect_notice');
}

function sendIndividualWhatsApp(btn, templateType) {
    if (!btn) return;
    var row = btn.parentNode;
    while (row && row.tagName !== 'TR') row = row.parentNode;
    if (!row) return;

    var inputs = row.querySelectorAll('input[type="text"]');
    var name = (inputs[0] && inputs[0].value) ? inputs[0].value : "පුද්ගලයා";
    
    var phone = "";
    var msg = "";
    var dateStr = new Date().toLocaleDateString();

    if (templateType === 'student_absence') {
        var parentName = (inputs[1] && inputs[1].value) ? inputs[1].value : "දෙමාපිය";
        phone = (inputs[2] && inputs[2].value) ? inputs[2].value : "";
        msg = "ගරු " + parentName + " මහත්මයාණෙනි/මහත්මියනි, ඔබේ දරුවා වන " + name + " අද " + dateStr + " දින පාසලට නොපැමිණි බව කරුණාවෙන් දන්වමු.";
    } else if (templateType === 'teacher_leave') {
        phone = (inputs[2] && inputs[2].value) ? inputs[2].value : "";
        msg = "ආයුබෝවන් " + name + " ගුරුතුමනි/තුමියනි, ඔබේ නිවාඩු ඉල්ලීම සම්බන්ධ පණිවිඩය ලැබුණු බවත් එය අනුමත වී ඇති බවත් කරුණාවෙන් දන්වමු.";
    } else if (templateType === 'prefect_notice') {
        phone = (inputs[1] && inputs[1].value) ? inputs[1].value : "";
        msg = "ආයුබෝවන් " + name + " ශිෂ්‍ය නායකතුමනි/තුමියනි, අද දින පැමිණීම සම්බන්ධ පණිවිඩය ලැබුණි.";
    }

    if (!phone) {
        alert("කරුණාකර දුරකථන අංකය ඇතුලත් කරන්න. (Please enter a phone number.)");
        return;
    }

    // Clean phone number
    var cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 10) {
        cleanPhone = '94' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+') && cleanPhone.length === 9) {
        cleanPhone = '94' + cleanPhone;
    }

    var url = "https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(msg);
    window.open(url, '_blank');
}

function sendNotice(method) {
    var noticeTextarea = document.querySelector('#notices textarea');
    var message = noticeTextarea ? noticeTextarea.value : '';
    if (!message) {
        alert("කරුණාකර පණිවිඩය ඇතුලත් කරන්න. (Please type a message.)");
        return;
    }

    if (method === 'whatsapp') {
        var url = "https://wa.me/?text=" + encodeURIComponent(message);
        window.open(url, '_blank');
    } else {
        alert("SMS යැවීමට backend සේවාවක් අවශ්‍ය වේ. (SMS sending requires a backend service.)");
    }
}

function generatePDF() {
    alert("Generating English PDF Report...\n\n[In production, this will download a physical .pdf file using jsPDF library based on the class metrics.]");
}

function calculateRowTotal(row) {
    if (!row) return;
    var marksInputs = row.querySelectorAll('.mark-input');
    var total = 0;
    for (var i = 0; i < marksInputs.length; i++) {
        var val = parseInt(marksInputs[i].value) || 0;
        total += val;
    }
    var totalBadge = row.querySelector('.total-marks .badge');
    if (totalBadge) {
        totalBadge.innerHTML = total.toString();
        // Optional color logic
        if (total >= 75) {
            totalBadge.className = 'badge badge-success';
        } else if (total >= 50) {
            totalBadge.className = 'badge bg-warning text-dark';
        } else {
            totalBadge.className = 'badge bg-danger';
        }
    }
}

function initializeMarksCalculation() {
    var markInputs = document.querySelectorAll('.marks-table .mark-input');
    for (var i = 0; i < markInputs.length; i++) {
        // Remove existing listener to prevent duplicates on clone
        markInputs[i].removeEventListener('input', markInputHandler);
        markInputs[i].addEventListener('input', markInputHandler);
    }
}

function markInputHandler(e) {
    // Validate max amount dynamically based on placeholder or max attribute
    var target = e.target || e.srcElement;
    var maxAttr = target.getAttribute('max');
    var max = maxAttr ? parseInt(maxAttr) : 10;
    
    if (target.value > max) target.value = max;
    if (target.value < 0) target.value = 0;
    
    var row = target.parentNode;
    while (row && row.tagName !== 'TR') {
        row = row.parentNode;
    }
    
    if (row) {
        calculateRowTotal(row);
    }
    saveData(); // Save on mark change
}


// Function to remove a row from tables
function removeRow(btn) {
    if (!btn) return;
    
    var row = btn.parentNode;
    while (row && row.tagName !== 'TR') {
        row = row.parentNode;
    }
    
    if (row && row.parentNode) {
        var tbody = row.parentNode;
        // Keep at least one row in the table
        if (tbody.querySelectorAll('tr').length > 1) {
            tbody.removeChild(row);
        } else {
            // If it's the last row, just clear its inputs instead of deleting it
            var inputs = row.querySelectorAll('input:not([type="checkbox"])');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].value = '';
            }
            var checkboxes = row.querySelectorAll('input[type="checkbox"]');
            for (var j = 0; j < checkboxes.length; j++) {
                checkboxes[j].checked = false;
            }
            var totalBadges = row.querySelectorAll('.badge');
            for (var k = 0; k < totalBadges.length; k++) {
                totalBadges[k].innerHTML = '0';
            }
            if (row.parentNode.parentNode.className.indexOf('marks-table') !== -1) {
                calculateRowTotal(row);
            }
        }
        saveData(); // Save after removal
    }
}

/**
 * LESSONS LOGIC
 */

// Function to show lesson content in modal
function showLesson(id) {
    // Check if locked for non-admins
    var currentLevel = parseInt(getElValue('unlock-level') || 1);
    if (currentUser.role === 'viewer' && id > currentLevel) {
        alert("මෙම පාඩම තවමත් වසා ඇත. කරුණාකර පෙර පාඩම් අවසන් කරන්න. (This lesson is locked. Please complete previous lessons.)");
        return;
    }

    var modal = document.getElementById('lesson-modal');
    var body = document.getElementById('lesson-detail-body');
    if (!modal || !body) return;

    var content = "";
    if (id === 1) {
        content = `
            <article class="lesson-article">
                <header style="text-align:center; margin-bottom: 2rem;">
                    <span class="badge badge-success">පාඩම 01 - නව විෂය නිර්දේශය</span>
                    <h1 style="color:var(--primary-color); font-size: 2.5rem; margin-top:1rem;">තෙරුවන් හඳුනාගනිමු (Theruwan Hedinaganimu)</h1>
                </header>
                
                <p>බෞද්ධයන් වන අපගේ පරම පූජනීය වස්තුව වන්නේ තෙරුවන් හෙවත් රත්නත්‍රයයි. එනම් බුද්ධ, ධම්ම, සංඝ යන රත්නත්‍රයයි. ලෝකවාසී සියලු සත්වයන්ට සැපත උදාකරදීම සඳහා තෙරුවන්ගේ ආශිර්වාදය ඉවහල් වේ.</p>
                
                <h2>1. බුද්ධ රත්නය (The Buddha)</h2>
                <p>අනන්ත අපරිමාණ ගුණයෙන් යුතු වූ බුදුරජාණන් වහන්සේ බුද්ධ රත්නය ලෙස හැඳින්වේ. උන්වහන්සේගේ ගුණ නවයක් (නව අරහාදී බුදු ගුණ) ප්‍රධාන වශයෙන් දැක්විය හැක. උන්වහන්සේ සියලු කෙලෙසුන් කෙරෙන් දුරුවූ හෙයින් 'අරහං' වන සේක.</p>

                <h2>2. ධම්ම රත්නය (The Dhamma)</h2>
                <p>බුදුරජාණන් වහන්සේ දේශනා කළා වූ උතුම් වූ ශ්‍රී සද්ධර්මය ධම්ම රත්නයයි. එය 'ස්වාක්ඛාත' හෙවත් මනාකොට දේශනා කළ ගුණයෙන් යුක්ත වේ. ධර්මයෙහි හැසිරෙන්නා ධර්මය විසින්ම රකිනු ලබයි.</p>

                <h2>3. සංඝ රත්නය (The Sangha)</h2>
                <p>බුදුරජාණන් වහන්සේගේ මඟ ගිය උතුම් වූ අරිය මහා සංඝරත්නය මීට අයත් වේ. උන්වහන්සේලා ලෝකයේ පින්කෙත ලෙස හැඳින්වේ.</p>
                
                <div class="highlight">
                    "තෙරුවන් සරණ යාම බෞද්ධයෙකුගේ ජීවිතයේ ආරම්භය මෙන්ම උතුම්ම ආරක්ෂාවද වේ. මෙම උතුම් වස්තුව ගැන නිවැරදිව දැනගැනීමෙන් අපගේ ශ්‍රද්ධාව තවත් තහවුරු වේ."
                </div>

                <div style="text-align:center; margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="closeLesson()">පාඩම අවසන් කරන්න</button>
                </div>
            </article>
        `;
    } else if (id === 2) {
        content = `
            <article class="lesson-article">
                <header style="text-align:center; margin-bottom: 2rem;">
                    <span class="badge badge-success">පාඩම 02 - අවසාන (Grade 10/11)</span>
                    <h1 style="color:var(--primary-color); font-size: 2.5rem; margin-top:1rem;">බුදු සිරිතේ අවසන් 25 වසර (Budu Sirithe Awasan 25 Wasara)</h1>
                </header>

                <p>බුදුරජාණන් වහන්සේ බුද්ධත්වයෙන් පසු පුරා වසර 45 ක් මුළුල්ලේ ලෝක සත්වයාට නිර්වාණ මාර්ගය පෙන්වා දුන් සේක. ඉන් අවසන් වසර 25 උන්වහන්සේගේ ශාසනික මෙහෙවර ඉතා තීව්‍ර වූ සහ ඉතා වැදගත් සිදුවීම් රැසක් සිදු වූ කාලයකි.</p>
                
                <h2>ජේතවනාරාමය සහ පූර්වාරාමය</h2>
                <p>බුදුරජාණන් වහන්සේ වැඩිම වස් කාලයක් (වස් 24 ක්) ගත කළේ සැවැත් නුවර ජේතවනාරාමයේ සහ විශාඛා උපාසිකාව කරවූ පූර්වාරාමයේය. අවසන් කාලය වන විට බොහෝ රජවරුන් සහ සිටුවරුන් උන්වහන්සේගේ ශ්‍රාවකයන් බවට පත්ව සිටියහ.</p>

                <h2>සුවිශේෂී සිදුවීම්</h2>
                <ul>
                    <li><strong>අංගුලිමාල දමනය:</strong> දහසක් මිනිසුන් මරා ඇඟිලි මාලයක් පැලඳි මිනීමරුවෙකු වූ අංගුලිමාල, බුදුරජාණන් වහන්සේගේ මහා කරුණාවෙන් දමනය වී රහත් භාවයට පත් විය.</li>
                    <li><strong>දේවදත්ත තෙරුන්ගේ කුමන්ත්‍රණ:</strong> ශාසනය බෙදා තමා නායකත්වය ගැනීමට දේවදත්ත තෙරුන් දැරූ උත්සාහයන් සහ බුදුරජාණන් වහන්සේට කළ හිරිහැර පරාජය කිරීම මෙකල සිදු වූ වැදගත් සිදුවීමකි.</li>
                    <li><strong>ධර්ම දේශනා:</strong> මහා මංගල සූත්‍රය, පරාභව සූත්‍රය සහ වසල සූත්‍රය ආදී ලෝකය යහපත කරා ගෙන යන සූත්‍ර දේශනා රැසක් මෙම කාලය තුළ දේශනා කෙරිණි.</li>
                </ul>

                <h2>මහා පරිනිබ්බාණය (The Passing Away)</h2>
                <p>අසූවන වියේදී බුදුරජාණන් වහන්සේ කුසිනාරා නුවර උපවත්තන සල් උයනේදී පරිනිර්වාණයට පත් වූ සේක. උන්වහන්සේගේ අවසන් අවවාදය වූයේ "සියලු සංස්කාර ධර්මයන් නැසෙන සුළු ය, අප්‍රමාදීව කුසල් දම් සම්පූර්ණ කරන්න" (වයධම්මා සංඛාරා - අප්පමාදේන සම්පාදේථ) යන්නයි.</p>
                
                <div class="highlight">
                    බුදුරජාණන් වහන්සේගේ මෙම අවසන් අවුරුදු 25 ශාසනයේ ස්ථාවර භාවය සහ ධර්මයේ ව්‍යාප්තිය සඳහා ප්‍රධාන වශයෙන් දායක වූ ස්වර්ණමය යුගයකි.
                </div>

                <div style="text-align:center; margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="closeLesson()">පාඩම අවසන් කරන්න</button>
                </div>
            </article>
        `;
    }

    body.innerHTML = content;
    modal.style.display = "flex";
}

function closeLesson() {
    var modal = document.getElementById('lesson-modal');
    if (modal) modal.style.display = "none";
}

// Ensure the page initializes correctly on load
// Added helper function for compatibility
function getElValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
}


// Setup click handler for lesson modal (outside click closes it)
window.addEventListener('click', function(event) {
    var modal = document.getElementById('lesson-modal');
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

/**
 * UNLOCK LEVEL LOGIC
 */
function updateUnlockLevel() {
    var level = document.getElementById('unlock-level').value;
    applyUnlockLevel(level);
    saveData();
    
    var statusBadge = document.getElementById('unlock-status-badge');
    if (statusBadge) {
        statusBadge.innerText = "මට්ටම: " + level;
    }
}

function applyUnlockLevel(level) {
    level = parseInt(level);
    var lesson1 = document.getElementById('lesson-card-1');
    var lesson2 = document.getElementById('lesson-card-2');
    
    if (lesson1) {
        if (level >= 1 || currentUser.role === 'admin' || currentUser.role === 'principal') {
            lesson1.classList.remove('locked');
        } else {
            lesson1.classList.add('locked');
        }
    }
    
    if (lesson2) {
        if (level >= 2 || currentUser.role === 'admin' || currentUser.role === 'principal') {
            lesson2.classList.remove('locked');
        } else {
            lesson2.classList.add('locked');
        }
    }
}
