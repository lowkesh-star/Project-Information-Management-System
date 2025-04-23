const programmingLanguages = [
    'Python', 'Java', 'JavaScript', 'C++', 'C#', 'Ruby', 'PHP',
    'Swift', 'Kotlin', 'Go', 'Rust', 'TypeScript'
];

// Store student data
let studentData = {
    students: [],
    project: null
};

const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', function() {
    // Populate languages grid
    const languagesGrid = document.querySelector('.languages-grid');
    programmingLanguages.forEach(lang => {
        const div = document.createElement('div');
        div.innerHTML = `
            <label>
                <input type="checkbox" name="languages" value="${lang}"> ${lang}
            </label>
        `;
        languagesGrid.appendChild(div);
    });

    // Handle group form submission
    document.getElementById('studentGroupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('groupForm').style.display = 'none';
        document.getElementById('projectForm').style.display = 'block';
    });

    // Handle project form submission
    document.getElementById('projectSubmissionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        // In a real application, you would handle project submission here
        alert('Project submitted successfully!');
        window.location.href = 'student-dashboard.html';
    });

    const languageSelect = document.getElementById('languages');
    const selectedLanguagesDiv = document.getElementById('selected-languages');

    // Update selected languages display
    function updateSelectedLanguages() {
        const selectedOptions = Array.from(languageSelect.selectedOptions);
        selectedLanguagesDiv.innerHTML = selectedOptions.map(option => 
            `<div class="selected-language">
                ${option.text}
                <button type="button" onclick="removeLanguage('${option.value}')">&times;</button>
            </div>`
        ).join('');
    }

    // Remove a selected language
    window.removeLanguage = function(value) {
        const option = Array.from(languageSelect.options).find(opt => opt.value === value);
        if (option) {
            option.selected = false;
        }
        updateSelectedLanguages();
    };

    // Listen for changes in selection
    languageSelect.addEventListener('change', updateSelectedLanguages);

    // Add file input listeners
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const fileNameDiv = this.parentElement.querySelector('.selected-file-name');
            if (this.files.length > 0) {
                if (this.multiple) {
                    fileNameDiv.textContent = `Selected ${this.files.length} files`;
                } else {
                    fileNameDiv.textContent = `Selected: ${this.files[0].name}`;
                }
            } else {
                fileNameDiv.textContent = 'No file chosen';
            }
        });
    });
});

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    window.location.href = '../index.html';
}

// Update file label when files are selected
function updateFileLabel(input) {
    const fileNameDisplay = input.parentElement.querySelector('.file-name-display');
    if (fileNameDisplay) {
        if (input.files.length > 0) {
            if (input.multiple) {
                fileNameDisplay.textContent = `${input.files.length} files selected`;
            } else {
                fileNameDisplay.textContent = input.files[0].name;
            }
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    }
}

// Handle student form submission
function handleStudentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Collect data for all three students
    studentData.students = [
        {
            name: formData.get('name1'),
            id: formData.get('id1'),
            course: formData.get('course1'),
            section: formData.get('section1'),
            year: formData.get('year1'),
            email: formData.get('email1'),
            contact: formData.get('contact1')
        },
        {
            name: formData.get('name2'),
            id: formData.get('id2'),
            course: formData.get('course2'),
            section: formData.get('section2'),
            year: formData.get('year2'),
            email: formData.get('email2'),
            contact: formData.get('contact2')
        },
        {
            name: formData.get('name3'),
            id: formData.get('id3'),
            course: formData.get('course3'),
            section: formData.get('section3'),
            year: formData.get('year3'),
            email: formData.get('email3'),
            contact: formData.get('contact3')
        }
    ];

    // Show project form
    document.querySelector('.student-group-form').style.display = 'none';
    document.querySelector('.project-form').style.display = 'block';
}

// Update the handleProjectSubmit function
async function handleProjectSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        // Check server connection first
        const testResponse = await fetch(`${API_BASE_URL}/test`);
        if (!testResponse.ok) {
            throw new Error('Unable to connect to server. Please make sure the server is running.');
        }

        // Validate form data
        if (!form.projectTitle.value) throw new Error('Project title is required');
        if (!form.projectAbstract.value) throw new Error('Project abstract is required');
        if (!form.category.value) throw new Error('Project category is required');
        if (!form.languages.selectedOptions.length) throw new Error('Please select at least one programming language');

        // Create project data object
        const projectData = {
            group_number: parseInt(form.groupNumber.value),
            title: form.projectTitle.value,
            abstract: form.projectAbstract.value,
            category: form.category.value,
            requirements: form.requirements.value,
            languages: Array.from(form.languages.selectedOptions).map(opt => opt.value),
            students: studentData.students,
            submission_date: new Date().toISOString()
        };

        // Validate files
        const presentationFile = form.presentation.files[0];
        const documentationFile = form.documentation.files[0];
        const projectFiles = form.projectFolder.files;

        if (!presentationFile) throw new Error('Please select a presentation file');
        if (!documentationFile) throw new Error('Please select a documentation file');
        if (projectFiles.length === 0) throw new Error('Please select project files');

        // Create FormData
        const formData = new FormData();
        formData.append('projectData', JSON.stringify(projectData));
        formData.append('presentation', presentationFile);
        formData.append('documentation', documentationFile);
        Array.from(projectFiles).forEach(file => {
            formData.append('projectFolder', file);
        });

        // Submit to server
        const response = await fetch(`${API_BASE_URL}/api/submit-project`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to submit project');
        }

        alert('Project submitted successfully!');
        window.location.href = 'student-dashboard.html';

    } catch (error) {
        console.error('Error submitting project:', error);
        alert(error.message || 'Failed to submit project. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Project';
    }
}

// Add file selection feedback
document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function() {
        const fileUpload = this.parentElement;
        if (this.files.length > 0) {
            fileUpload.classList.add('has-file');
            const fileName = this.files.length === 1 ? 
                this.files[0].name : 
                `${this.files.length} files selected`;
            fileUpload.querySelector('p').textContent = fileName;
        } else {
            fileUpload.classList.remove('has-file');
            fileUpload.querySelector('p').textContent = 
                this.hasAttribute('webkitdirectory') ? 'Project Folder' : 'Choose file';
        }
    });
});

// Add loading indicator styles
const style = document.createElement('style');
style.textContent = `
    .submit-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);




