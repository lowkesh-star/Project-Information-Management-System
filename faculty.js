// Add this at the beginning of the file
const API_BASE_URL = 'http://localhost:3000';

// Sample data structure for projects
let projects = [];

document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    setupFilters();
});

// Add a function to check server connection
async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        if (!response.ok) throw new Error('Server response not ok');
        const data = await response.json();
        console.log('Server connection test:', data.message);
        return true;
    } catch (error) {
        console.error('Server connection failed:', error);
        return false;
    }
}

// Update the loadProjects function
async function loadProjects() {
    try {
        const response = await fetch('http://localhost:3000/api/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        
        const projects = await response.json();
        if (!Array.isArray(projects)) {
            throw new Error('Invalid data format received from server');
        }
        
        displayProjects(projects);
        updateStats(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsList').innerHTML = `
            <div class="error-message">
                ${error.message}
                <button onclick="loadProjects()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

function displayProjects(projects) {
    const projectsList = document.getElementById('projectsList');
    const template = document.getElementById('projectCardTemplate');
    projectsList.innerHTML = '';

    if (!projects || projects.length === 0) {
        projectsList.innerHTML = '<div class="no-projects">No projects submitted yet</div>';
        return;
    }

    projects.forEach(project => {
        try {
            const card = template.content.cloneNode(true);
            
            // Set project title and group number
            card.querySelector('.project-title').textContent = project.title || 'Untitled Project';
            card.querySelector('.group-number').textContent = `Group ${project.group_number || 'N/A'}`;
            
            // Set course and section tags
            const mainCourse = project.students[0]?.course || 'N/A';
            const mainSection = project.students[0]?.section || 'N/A';
            card.querySelector('.course-tag').textContent = mainCourse;
            card.querySelector('.section-tag').textContent = `Section ${mainSection}`;

            // Set student details with error handling
            const studentDetails = card.querySelector('.students-grid');
            if (studentDetails) {
                // Clear existing content
                studentDetails.innerHTML = '';
                
                // Create student cards
                for (let i = 0; i < 3; i++) {
                    const studentDiv = document.createElement('div');
                    studentDiv.className = 'student-details';
                    
                    // Get student data from the students array
                    const student = project.students?.[i] || {};
                    const name = student.name || 'N/A';
                    const id = student.id || 'N/A';
                    const course = student.course || 'N/A';
                    const section = student.section || 'N/A';
                    const year = student.year || 'N/A';
                    const email = student.email || 'N/A';
                    const contact = student.contact || 'N/A';

                    studentDiv.innerHTML = `
                        <h5>Student ${i + 1}</h5>
                        <p class="student-name"><strong>Name:</strong> ${name}</p>
                        <p class="student-id"><strong>ID:</strong> ${id}</p>
                        <p class="student-course"><strong>Course:</strong> ${course}</p>
                        <p class="student-section"><strong>Section:</strong> ${section}</p>
                        <p class="student-year"><strong>Year:</strong> ${year}</p>
                        <p class="student-email"><strong>Email:</strong> ${email}</p>
                        <p class="student-contact"><strong>Contact:</strong> ${contact}</p>
                    `;
                    
                    studentDetails.appendChild(studentDiv);
                }
            }

            // Set project abstract
            card.querySelector('.project-abstract').textContent = project.abstract || 'No abstract provided';
            
            // Set languages with error handling
            const languagesList = card.querySelector('.languages-list');
            if (languagesList) {
                languagesList.innerHTML = '';
                if (Array.isArray(project.languages) && project.languages.length > 0) {
                    project.languages.forEach(lang => {
                        const langTag = document.createElement('span');
                        langTag.className = 'language-tag';
                        langTag.textContent = lang;
                        languagesList.appendChild(langTag);
                    });
                } else {
                    const langTag = document.createElement('span');
                    langTag.className = 'language-tag';
                    langTag.textContent = 'No languages specified';
                    languagesList.appendChild(langTag);
                }
            }
            
            // Setup file buttons with error handling
            if (project.presentation_file) {
                setupFileButton(card.querySelector('.presentation-btn'), project.presentation_file);
            }
            if (project.documentation_file) {
                setupFileButton(card.querySelector('.documentation-btn'), project.documentation_file);
            }
            if (project.project_folder) {
                setupFileButton(card.querySelector('.project-files-btn'), project.project_folder);
            }
            
            // Setup share button
            const shareBtn = card.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => shareProject(project));
            }
            
            // Set submission date
            const submissionDate = project.submission_date ? 
                new Date(project.submission_date).toLocaleDateString() : 'N/A';
            const submissionElement = card.querySelector('.submission-date');
            if (submissionElement) {
                submissionElement.textContent = `Submitted: ${submissionDate}`;
            }

            // Add toggle functionality
            const toggleBtn = card.querySelector('.toggle-details-btn');
            const expandedDetails = card.querySelector('.expanded-details');
            
            toggleBtn.addEventListener('click', () => {
                const isExpanded = expandedDetails.style.display !== 'none';
                expandedDetails.style.display = isExpanded ? 'none' : 'block';
                toggleBtn.innerHTML = isExpanded ? 
                    '<span class="icon">👥</span> View Team Details' : 
                    '<span class="icon">👥</span> Hide Team Details';
            });

            // Set year in the meta section
            const yearTag = card.querySelector('.year-tag');
            const studentYear = project.students?.[0]?.year || 'N/A';
            yearTag.textContent = `Year: ${studentYear}`;

            projectsList.appendChild(card);
        } catch (error) {
            console.error('Error displaying project:', error, project);
        }
    });
}

function setupFilters() {
    const groupSearch = document.getElementById('groupSearch');
    const courseSearch = document.getElementById('courseSearch');
    const sectionSearch = document.getElementById('sectionSearch');
    const languageFilter = document.getElementById('languageFilter');
    const sortFilter = document.getElementById('sortFilter');

    [groupSearch, courseSearch, sectionSearch, languageFilter, sortFilter].forEach(
        element => element.addEventListener('input', filterProjects)
    );
}

function filterProjects() {
    const groupTerm = document.getElementById('groupSearch').value.toLowerCase();
    const selectedCourse = document.getElementById('courseSearch').value;
    const sectionTerm = document.getElementById('sectionSearch').value.toLowerCase();
    const languageFilter = document.getElementById('languageFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    const cards = document.querySelectorAll('.project-card');
    
    cards.forEach(card => {
        const groupNumber = card.querySelector('.group-number').textContent.toLowerCase();
        const studentCourses = Array.from(card.querySelectorAll('.student-course')).map(el => {
            const courseText = el.textContent;
            return courseText.split(':')[1]?.trim() || '';
        });
        const section = card.querySelector('.section-tag').textContent.toLowerCase();
        const languages = Array.from(card.querySelectorAll('.language-tag')).map(tag => tag.textContent);

        const matchesGroup = groupNumber.includes(groupTerm);
        const matchesCourse = selectedCourse === '' || studentCourses.some(course => course === selectedCourse);
        const matchesSection = section.includes(sectionTerm);
        const matchesLanguage = !languageFilter || languages.includes(languageFilter);

        card.style.display = (matchesGroup && matchesCourse && matchesSection && matchesLanguage) ? 'block' : 'none';
    });

    // Sort visible cards
    sortCards(sortFilter);
}

function sortCards(sortFilter) {
    const projectsList = document.getElementById('projectsList');
    const cards = Array.from(projectsList.children);
    
    cards.sort((a, b) => {
        if (sortFilter === 'group') {
            const groupA = parseInt(a.querySelector('.group-number').textContent.match(/\d+/)[0]);
            const groupB = parseInt(b.querySelector('.group-number').textContent.match(/\d+/)[0]);
            return groupA - groupB;
        } else if (sortFilter === 'recent') {
            const dateA = new Date(a.querySelector('.submission-date').textContent.split(': ')[1]);
            const dateB = new Date(b.querySelector('.submission-date').textContent.split(': ')[1]);
            return dateB - dateA;
        }
    });
    
    cards.forEach(card => projectsList.appendChild(card));
}

function setupFileButton(button, fileName) {
    if (!fileName) {
        button.style.display = 'none';
        return;
    }

    button.addEventListener('click', () => {
        window.open(`http://localhost:3000/uploads/${fileName}`, '_blank');
    });
}

async function shareProject(project) {
    try {
        const shareData = {
            title: `Project by Group ${project.group_number}`,
            text: `Check out this project: ${project.title}`,
            url: `http://localhost:3000/project/${project.id}`
        };

        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.url);
            alert('Share link copied to clipboard!');
        }
    } catch (error) {
        console.error('Error sharing project:', error);
        alert('Failed to share project. Please try again.');
    }
}

function updateStats(projects) {
    document.getElementById('totalProjects').textContent = projects.length;
    const uniqueGroups = new Set(projects.map(p => p.group_number)).size;
    document.getElementById('totalGroups').textContent = uniqueGroups;
    
    if (projects.length > 0) {
        const latest = new Date(Math.max(...projects.map(p => new Date(p.submission_date))));
        document.getElementById('latestSubmission').textContent = latest.toLocaleDateString();
    }
}

async function clearAllData() {
    if (confirm('Are you sure you want to clear all project data? This cannot be undone.')) {
        try {
            const response = await fetch('http://localhost:3000/api/clear-data', {
                method: 'POST'
            });
            
            if (response.ok) {
                alert('All data has been cleared successfully.');
                loadProjects(); // Reload the empty project list
            } else {
                throw new Error('Failed to clear data');
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Failed to clear data. Please try again.');
        }
    }
}

function logout() {
    window.location.href = 'login.html';
}

// Add this to your existing CSS
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .error-message {
            background-color: #fee2e2;
            border: 1px solid #ef4444;
            color: #dc2626;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0.5rem;
            text-align: center;
        }
        
        .retry-btn {
            background-color: #dc2626;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            border: none;
            margin-top: 0.5rem;
            cursor: pointer;
        }
        
        .retry-btn:hover {
            background-color: #b91c1c;
        }

        .no-projects {
            text-align: center;
            padding: 2rem;
            color: #666;
            font-size: 1.1rem;
        }

        .student-details {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        
        .student-details h5 {
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }
        
        .student-details p {
            margin: 0.3rem 0;
            color: #444;
        }
        
        .student-details strong {
            color: #2c3e50;
            font-weight: 600;
        }

        select.search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
            cursor: pointer;
        }
        
        select.search-input:focus {
            outline: none;
            border-color: #007bff;
        }
    </style>
`);
