const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

// Supabase setup with proper error handling
let supabase;
try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        throw new Error('Missing Supabase credentials. Please check your .env file.');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    process.exit(1);
}

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/', express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Submit project route (without auth)
app.post('/api/submit-project', upload.fields([
    { name: 'presentation', maxCount: 1 },
    { name: 'documentation', maxCount: 1 },
    { name: 'projectFolder', maxCount: 10 }
]), async (req, res) => {
    try {
        const formData = JSON.parse(req.body.projectData);
        
        // First, create the student group
        const { data: groupData, error: groupError } = await supabase
            .from('student_groups')
            .insert([{
                group_number: parseInt(formData.group_number),
                student1_name: formData.students[0].name,
                student1_id: formData.students[0].id,
                student1_course: formData.students[0].course,
                student1_section: formData.students[0].section,
                student1_year: formData.students[0].year,
                student1_email: formData.students[0].email,
                student1_contact: formData.students[0].contact,
                student2_name: formData.students[1].name,
                student2_id: formData.students[1].id,
                student2_course: formData.students[1].course,
                student2_section: formData.students[1].section,
                student2_year: formData.students[1].year,
                student2_email: formData.students[1].email,
                student2_contact: formData.students[1].contact,
                student3_name: formData.students[2].name,
                student3_id: formData.students[2].id,
                student3_course: formData.students[2].course,
                student3_section: formData.students[2].section,
                student3_year: formData.students[2].year,
                student3_email: formData.students[2].email,
                student3_contact: formData.students[2].contact
            }])
            .select()
            .single();

        if (groupError) throw groupError;

        // Then, create the project
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert([{
                group_id: groupData.id,
                group_number: parseInt(formData.group_number),
                title: formData.title,
                abstract: formData.abstract,
                requirements: formData.requirements,
                languages: formData.languages,
                presentation_file: req.files.presentation[0].filename,
                documentation_file: req.files.documentation[0].filename,
                project_folder: req.files.projectFolder ? 
                    req.files.projectFolder.map(f => f.filename).join(',') : null
            }])
            .select();

        if (projectError) throw projectError;

        res.json({ 
            message: 'Project submitted successfully',
            data: { group: groupData, project: projectData }
        });
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ 
            error: 'Failed to submit project',
            details: error.message 
        });
    }
});

// Get all projects route (without auth)
app.get('/api/projects', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                student_groups!inner (*)
            `)
            .order('submission_date', { ascending: false });

        if (error) throw error;

        // Format the data properly for the frontend
        const formattedData = data.map(project => {
            const group = project.student_groups;
            return {
                id: project.id,
                group_number: project.group_number,
                title: project.title,
                abstract: project.abstract,
                category: project.category,
                requirements: project.requirements,
                languages: project.languages || [],
                presentation_file: project.presentation_file,
                documentation_file: project.documentation_file,
                project_folder: project.project_folder,
                submission_date: project.submission_date,
                status: project.status,
                students: [
                    {
                        name: group.student1_name,
                        id: group.student1_id,
                        course: group.student1_course,
                        section: group.student1_section,
                        year: group.student1_year,
                        email: group.student1_email,
                        contact: group.student1_contact
                    },
                    {
                        name: group.student2_name,
                        id: group.student2_id,
                        course: group.student2_course,
                        section: group.student2_section,
                        year: group.student2_year,
                        email: group.student2_email,
                        contact: group.student2_contact
                    },
                    {
                        name: group.student3_name,
                        id: group.student3_id,
                        course: group.student3_course,
                        section: group.student3_section,
                        year: group.student3_year,
                        email: group.student3_email,
                        contact: group.student3_contact
                    }
                ]
            };
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Clear all data route
app.post('/api/clear-data', async (req, res) => {
    try {
        const { error: projectsError } = await supabase
            .from('projects')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (projectsError) throw projectsError;

        // Delete all files in uploads directory
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            fs.readdirSync(uploadsDir).forEach(file => {
                fs.unlinkSync(path.join(uploadsDir, file));
            });
        }

        res.json({ message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Add route for sharing projects
app.get('/project/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).send('Project not found');
        }

        // Send a simple HTML page with project details
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Project Details - ${data.title}</title>
                    <link rel="stylesheet" href="/styles/global.css">
                    <link rel="stylesheet" href="/styles/faculty-dashboard.css">
                </head>
                <body>
                    <div class="project-card">
                        <h1>${data.title}</h1>
                        <p>Group ${data.group_number}</p>
                        <p>${data.abstract}</p>
                        <div class="file-buttons">
                            ${data.presentation_file ? `
                                <a href="/uploads/${data.presentation_file}" class="file-btn" target="_blank">
                                    <span class="icon">📊</span>
                                    <span class="text">View Presentation</span>
                                </a>
                            ` : ''}
                            ${data.documentation_file ? `
                                <a href="/uploads/${data.documentation_file}" class="file-btn" target="_blank">
                                    <span class="icon">📄</span>
                                    <span class="text">View Documentation</span>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading project');
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Current directory: ${__dirname}`);
});
