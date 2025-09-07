// Enhanced Todo App JavaScript

// Global Variables
let todos = [];
let templates = []; // Store task templates
let currentFilter = 'in-progress';
let currentSort = 'created';
let currentSearch = '';
let editingTodoId = null; // Track which todo is being edited
let selectedTodos = new Set(); // Track selected todos for bulk actions
let draggedTodoId = null; // Track which todo is being dragged
let currentTheme = 'light'; // Track current theme
let activeTimers = new Map(); // Track active timers: todoId -> interval ID

// Collection of Quran verses that rotate daily
const quranVerses = [
    { text: "And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.", reference: "Surah At-Talaq 65:3" },
    { text: "And it is He who created the heavens and earth in truth. And the day He says, \"Be,\" and it is, His word is the truth.", reference: "Surah Al-An'am 6:73" },
    { text: "And whoever fears Allah - He will make for him a way out.", reference: "Surah At-Talaq 65:2" },
    { text: "And whoever does righteous deeds, whether male or female, while being a believer - those will enter Paradise.", reference: "Surah An-Nisa 4:124" },
    { text: "And Allah would not punish them while they seek forgiveness.", reference: "Surah Al-Anfal 8:33" },
    { text: "And give good tidings to those who believe and do righteous deeds that they will have gardens.", reference: "Surah Al-Baqarah 2:25" },
    { text: "And whoever believes in Allah and does righteousness - He will admit him into gardens beneath which rivers flow.", reference: "Surah At-Taghabun 64:9" },
    { text: "And Allah is the best of planners.", reference: "Surah Al-Anfal 8:30" },
    { text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", reference: "Surah Al-Baqarah 2:152" },
    { text: "And whoever trusts in Allah - then He is sufficient for him.", reference: "Surah At-Talaq 65:3" },
    { text: "Indeed, with hardship comes ease.", reference: "Surah Ash-Sharh 94:6" },
    { text: "And Allah loves the doers of good.", reference: "Surah Al-Baqarah 2:195" },
    { text: "And seek help through patience and prayer.", reference: "Surah Al-Baqarah 2:45" },
    { text: "And it is Allah who sends down rain from heaven, and We produce thereby the vegetation of every kind.", reference: "Surah Al-An'am 6:99" },
    { text: "And whoever does good deeds, whether male or female, and is a believer - such will enter Paradise.", reference: "Surah Ghafir 40:40" }
];

// Get daily verse based on current date
function getDailyVerse() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const verseIndex = dayOfYear % quranVerses.length;
    return quranVerses[verseIndex];
}

// Priority weights for completion calculation
const priorityWeights = {
    high: 3,    // High priority tasks count 3x
    medium: 2,  // Medium priority tasks count 2x
    low: 1      // Low priority tasks count 1x
};

// Update statistics display with weighted completion
function updateStats() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const inProgressTasks = totalTasks - completedTasks;
    
    // Calculate weighted completion rate
    let totalWeight = 0;
    let completedWeight = 0;
    
    todos.forEach(todo => {
        const weight = priorityWeights[todo.priority || 'medium'];
        totalWeight += weight;
        if (todo.completed) {
            completedWeight += weight;
        }
    });
    
    const weightedCompletionRate = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
    document.getElementById('completionRate').textContent = weightedCompletionRate + '%';
}

// Load daily verse
function loadDailyVerse() {
    const dailyVerse = getDailyVerse();
    document.getElementById('verseText').textContent = dailyVerse.text;
    document.getElementById('verseReference').textContent = '— ' + dailyVerse.reference;
}

// Load saved todos from localStorage when the page starts
function loadTodos() {
    const savedTodos = localStorage.getItem('myEnhancedTodos');
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
        // Check for overdue recurring tasks on load
        checkOverdueRecurringTasks();
        displayTodos();
        updateStats();
    }
    loadDailyVerse();
    loadTemplates(); // Load templates on startup
    checkForSyncData(); // Check for sync data in URL
    setupReminderSystem(); // Initialize notifications
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('myEnhancedTodos', JSON.stringify(todos));
}

// Toggle recurring options visibility
function toggleRecurringOptions() {
    const isRecurringInput = document.getElementById('isRecurringInput');
    const recurringOptions = document.getElementById('recurringOptions');
    
    if (isRecurringInput.checked) {
        recurringOptions.style.display = 'flex';
        updateIntervalLabel(); // Update label based on current frequency
    } else {
        recurringOptions.style.display = 'none';
    }
}

// Update interval label based on frequency
function updateIntervalLabel() {
    const frequencyInput = document.getElementById('frequencyInput');
    const intervalLabel = document.getElementById('intervalLabel');
    const frequency = frequencyInput.value;
    
    switch (frequency) {
        case 'daily':
            intervalLabel.textContent = 'day(s)';
            break;
        case 'weekly':
            intervalLabel.textContent = 'week(s)';
            break;
        case 'monthly':
            intervalLabel.textContent = 'month(s)';
            break;
        case 'yearly':
            intervalLabel.textContent = 'year(s)';
            break;
    }
}

// Calculate next due date for recurring tasks
function calculateNextDueDate(dueDate, frequency, interval) {
    if (!dueDate) return null;
    
    const currentDate = new Date(dueDate);
    
    switch (frequency) {
        case 'daily':
            currentDate.setDate(currentDate.getDate() + interval);
            break;
        case 'weekly':
            currentDate.setDate(currentDate.getDate() + (interval * 7));
            break;
        case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + interval);
            break;
        case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + interval);
            break;
    }
    
    return currentDate.toISOString().split('T')[0];
}

// Create next recurring task instance
function createNextRecurringTask(originalTask) {
    const nextDueDate = calculateNextDueDate(
        originalTask.dueDate,
        originalTask.recurrence.frequency,
        originalTask.recurrence.interval
    );
    
    const nextTask = {
        ...originalTask,
        id: Date.now(),
        progress: 0,
        completed: false,
        dueDate: nextDueDate,
        createdDate: new Date().toISOString().split('T')[0]
    };
    
    return nextTask;
}

// Check for overdue recurring tasks and create missed instances
function checkOverdueRecurringTasks() {
    const today = new Date().toISOString().split('T')[0];
    let tasksAdded = 0;
    
    todos.forEach(todo => {
        if (todo.isRecurring && !todo.completed && todo.dueDate) {
            const dueDate = new Date(todo.dueDate + 'T00:00:00');
            const todayDate = new Date(today + 'T00:00:00');
            
            // If task is overdue, create the next instance and mark this one as "missed"
            if (dueDate < todayDate) {
                // Mark current task as completed but with 0% progress to indicate it was missed
                todo.completed = true;
                todo.progress = 0; // 0% indicates it was missed, not actually completed
                
                // Create next instance with updated due date
                let nextDueDate = calculateNextDueDate(
                    todo.dueDate,
                    todo.recurrence.frequency,
                    todo.recurrence.interval
                );
                
                // If the next calculated date is still in the past, fast-forward to today or future
                while (nextDueDate && new Date(nextDueDate + 'T00:00:00') <= todayDate) {
                    nextDueDate = calculateNextDueDate(
                        nextDueDate,
                        todo.recurrence.frequency,
                        todo.recurrence.interval
                    );
                }
                
                if (nextDueDate) {
                    const nextTask = {
                        ...todo,
                        id: Date.now() + tasksAdded, // Ensure unique IDs
                        progress: 0,
                        completed: false,
                        dueDate: nextDueDate,
                        createdDate: new Date().toISOString().split('T')[0]
                    };
                    
                    todos.push(nextTask);
                    tasksAdded++;
                }
            }
        }
    });
    
    if (tasksAdded > 0) {
        saveTodos();
        displayTodos();
        updateStats();
    }
}

// Template Management Functions
function loadTemplates() {
    const savedTemplates = localStorage.getItem('myTodoTemplates');
    if (savedTemplates) {
        templates = JSON.parse(savedTemplates);
    } else {
        // Create default templates if none exist
        templates = [
            {
                name: "Daily Exercise",
                icon: "💪",
                title: "Complete daily workout",
                description: "30 minutes of physical exercise",
                categories: "health, fitness",
                priority: "high",
                isRecurring: true,
                frequency: "daily",
                interval: 1,
                dueDateOffset: 0
            },
            {
                name: "Weekly Review",
                icon: "📊",
                title: "Weekly planning and review session",
                description: "Review last week's progress and plan for the upcoming week",
                categories: "planning, productivity",
                priority: "medium",
                isRecurring: true,
                frequency: "weekly",
                interval: 1,
                dueDateOffset: 0
            },
            {
                name: "Study Session",
                icon: "📚",
                title: "Study session",
                description: "Focused learning time",
                categories: "education, learning",
                priority: "high",
                isRecurring: false,
                frequency: "daily",
                interval: 1,
                dueDateOffset: 0
            }
        ];
        saveTemplates();
    }
    updateTemplateDropdown();
}

function saveTemplates() {
    localStorage.setItem('myTodoTemplates', JSON.stringify(templates));
}

function updateTemplateDropdown() {
    const templateSelect = document.getElementById('templateSelect');
    templateSelect.innerHTML = '<option value="">Select a template...</option>';
    
    templates.forEach((template, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${template.name} ${template.icon || '📝'}`;
        templateSelect.appendChild(option);
    });
}

function saveAsTemplate() {
    const titleInput = document.getElementById('todoInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const categoriesInput = document.getElementById('categoriesInput');
    const priorityInput = document.getElementById('priorityInput');
    const isRecurringInput = document.getElementById('isRecurringInput');
    const frequencyInput = document.getElementById('frequencyInput');
    const intervalInput = document.getElementById('intervalInput');

    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    const template = {
        name: templateName,
        icon: prompt('Enter an emoji icon (optional):') || '📝',
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        categories: categoriesInput.value.trim(),
        priority: priorityInput.value,
        isRecurring: isRecurringInput.checked,
        frequency: frequencyInput.value,
        interval: parseInt(intervalInput.value),
        dueDateOffset: 0 // Default to today, could be enhanced later
    };

    templates.push(template);
    saveTemplates();
    updateTemplateDropdown();
    
    // Show success feedback
    alert(`Template "${templateName}" saved successfully!`);
}

function loadTemplate() {
    const templateSelect = document.getElementById('templateSelect');
    const selectedIndex = templateSelect.value;
    
    if (selectedIndex === '') return;
    
    const template = templates[selectedIndex];
    if (!template) return;

    // Populate form fields
    document.getElementById('todoInput').value = template.title || '';
    document.getElementById('descriptionInput').value = template.description || '';
    document.getElementById('categoriesInput').value = template.categories || '';
    document.getElementById('priorityInput').value = template.priority || 'medium';
    
    // Handle recurring options
    const isRecurringInput = document.getElementById('isRecurringInput');
    isRecurringInput.checked = template.isRecurring || false;
    
    if (template.isRecurring) {
        document.getElementById('frequencyInput').value = template.frequency || 'daily';
        document.getElementById('intervalInput').value = template.interval || 1;
        document.getElementById('recurringOptions').style.display = 'flex';
        updateIntervalLabel();
    } else {
        document.getElementById('recurringOptions').style.display = 'none';
    }
    
    // Calculate due date based on offset (for now, just set to today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dueDateInput').value = today;
    
    // Focus on title field for easy editing
    document.getElementById('todoInput').focus();
}

function manageTemplates() {
    if (templates.length === 0) {
        alert('No templates found. Create a template first by filling out the form and clicking "Save as Template".');
        return;
    }

    let templateList = 'Current Templates:\n\n';
    templates.forEach((template, index) => {
        templateList += `${index + 1}. ${template.icon} ${template.name}\n`;
    });
    
    templateList += '\nEnter the number of the template to delete (or cancel to close):';
    
    const templateToDelete = prompt(templateList);
    if (!templateToDelete) return;
    
    const index = parseInt(templateToDelete) - 1;
    if (index >= 0 && index < templates.length) {
        const templateName = templates[index].name;
        if (confirm(`Delete template "${templateName}"?`)) {
            templates.splice(index, 1);
            saveTemplates();
            updateTemplateDropdown();
            alert(`Template "${templateName}" deleted successfully!`);
        }
    }
}

// Time Tracking Functions
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function startTimer(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.timeTracking) return;
    
    // Stop any other running timers
    stopAllTimers();
    
    // Initialize timeTracking if not exists (for older todos)
    if (!todo.timeTracking) {
        todo.timeTracking = {
            totalTime: 0,
            isRunning: false,
            startTime: null,
            sessions: []
        };
    }
    
    todo.timeTracking.isRunning = true;
    todo.timeTracking.startTime = Date.now();
    
    // Start interval to update display every second
    const intervalId = setInterval(() => {
        displayTodos(); // Refresh display to show running time
    }, 1000);
    
    activeTimers.set(todoId, intervalId);
    saveTodos();
    displayTodos();
}

function stopTimer(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.timeTracking || !todo.timeTracking.isRunning) return;
    
    const endTime = Date.now();
    const sessionDuration = Math.floor((endTime - todo.timeTracking.startTime) / 1000);
    
    // Add session to history
    todo.timeTracking.sessions.push({
        start: new Date(todo.timeTracking.startTime),
        end: new Date(endTime),
        duration: sessionDuration
    });
    
    // Update total time
    todo.timeTracking.totalTime += sessionDuration;
    todo.timeTracking.isRunning = false;
    todo.timeTracking.startTime = null;
    
    // Clear the interval
    const intervalId = activeTimers.get(todoId);
    if (intervalId) {
        clearInterval(intervalId);
        activeTimers.delete(todoId);
    }
    
    saveTodos();
    displayTodos();
}

function stopAllTimers() {
    activeTimers.forEach((intervalId, todoId) => {
        stopTimer(todoId);
    });
}

function toggleTimer(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Initialize timeTracking if not exists (for older todos)
    if (!todo.timeTracking) {
        todo.timeTracking = {
            totalTime: 0,
            isRunning: false,
            startTime: null,
            sessions: []
        };
    }
    
    if (todo.timeTracking.isRunning) {
        stopTimer(todoId);
    } else {
        startTimer(todoId);
    }
}

function getCurrentTime(todo) {
    if (!todo.timeTracking) return 0;
    
    let currentTime = todo.timeTracking.totalTime;
    
    if (todo.timeTracking.isRunning && todo.timeTracking.startTime) {
        const currentSessionTime = Math.floor((Date.now() - todo.timeTracking.startTime) / 1000);
        currentTime += currentSessionTime;
    }
    
    return currentTime;
}

// Attachment Functions
function addAttachment(todoId, type = 'url') {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Initialize attachments array if not exists (for older todos)
    if (!todo.attachments) {
        todo.attachments = [];
    }
    
    let name, url, note;
    
    switch (type) {
        case 'url':
            url = prompt('Enter URL:');
            if (!url) return;
            name = prompt('Enter a name for this link (optional):') || url;
            break;
        case 'file':
            const fileName = prompt('Enter file name or path:');
            if (!fileName) return;
            name = fileName;
            url = fileName; // For file references
            break;
        case 'note':
            note = prompt('Enter your note:');
            if (!note) return;
            name = note.substring(0, 30) + (note.length > 30 ? '...' : '');
            break;
    }
    
    const attachment = {
        id: Date.now(),
        type: type,
        name: name,
        url: url,
        note: note,
        createdAt: new Date().toISOString()
    };
    
    todo.attachments.push(attachment);
    saveTodos();
    displayTodos();
}

function removeAttachment(todoId, attachmentId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.attachments) return;
    
    if (confirm('Remove this attachment?')) {
        todo.attachments = todo.attachments.filter(att => att.id !== attachmentId);
        saveTodos();
        displayTodos();
    }
}

function openAttachment(attachment) {
    if (attachment.type === 'url' && attachment.url) {
        window.open(attachment.url, '_blank');
    } else if (attachment.type === 'note' && attachment.note) {
        alert(attachment.note);
    } else if (attachment.type === 'file') {
        alert(`File reference: ${attachment.name}`);
    }
}

function formatAttachments(todo) {
    if (!todo.attachments || todo.attachments.length === 0) return '';
    
    return todo.attachments.map(att => {
        let icon = '📎';
        if (att.type === 'url') icon = '🔗';
        else if (att.type === 'file') icon = '📁';
        else if (att.type === 'note') icon = '📝';
        
        return `
            <div class="attachment-item">
                <span class="attachment-icon" onclick="openAttachment(${JSON.stringify(att).replace(/"/g, '&quot;')})">${icon}</span>
                <span class="attachment-name" onclick="openAttachment(${JSON.stringify(att).replace(/"/g, '&quot;')})">${att.name}</span>
                <button class="attachment-remove" onclick="removeAttachment(${todo.id}, ${att.id})" title="Remove attachment">×</button>
            </div>
        `;
    }).join('');
}

function showAttachmentMenu(todoId) {
    const choice = prompt(`Choose attachment type:
1 - URL/Link
2 - File Reference  
3 - Text Note

Enter 1, 2, or 3:`);
    
    switch (choice) {
        case '1':
            addAttachment(todoId, 'url');
            break;
        case '2':
            addAttachment(todoId, 'file');
            break;
        case '3':
            addAttachment(todoId, 'note');
            break;
        default:
            return; // Cancel
    }
}

// Sub-task Functions
function addSubTask(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Initialize subTasks array if not exists (for older todos)
    if (!todo.subTasks) {
        todo.subTasks = [];
    }
    
    const subTaskTitle = prompt('Enter sub-task title:');
    if (!subTaskTitle || !subTaskTitle.trim()) return;
    
    const subTask = {
        id: Date.now(),
        title: subTaskTitle.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todo.subTasks.push(subTask);
    saveTodos();
    displayTodos();
}

function toggleSubTask(todoId, subTaskId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.subTasks) return;
    
    const subTask = todo.subTasks.find(st => st.id === subTaskId);
    if (!subTask) return;
    
    subTask.completed = !subTask.completed;
    
    // Check if all sub-tasks are completed and auto-complete parent if needed
    checkParentTaskCompletion(todo);
    
    saveTodos();
    displayTodos();
    updateStats();
}

function removeSubTask(todoId, subTaskId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.subTasks) return;
    
    if (confirm('Remove this sub-task?')) {
        todo.subTasks = todo.subTasks.filter(st => st.id !== subTaskId);
        saveTodos();
        displayTodos();
    }
}

function checkParentTaskCompletion(todo) {
    if (!todo.subTasks || todo.subTasks.length === 0) return;
    
    const allSubTasksCompleted = todo.subTasks.every(st => st.completed);
    
    if (allSubTasksCompleted && !todo.completed) {
        // Auto-complete parent task
        todo.completed = true;
        todo.progress = 100;
        
        // If parent is recurring, create next instance
        if (todo.isRecurring) {
            const nextTask = createNextRecurringTask(todo);
            todos.push(nextTask);
        }
    } else if (!allSubTasksCompleted && todo.completed && todo.subTasks.length > 0) {
        // If not all sub-tasks done, mark parent as incomplete
        todo.completed = false;
        if (todo.progress === 100) {
            todo.progress = 75; // Set to 75% when marking incomplete due to sub-tasks
        }
    }
}

function getSubTaskProgress(todo) {
    if (!todo.subTasks || todo.subTasks.length === 0) return null;
    
    const completedSubTasks = todo.subTasks.filter(st => st.completed).length;
    return {
        completed: completedSubTasks,
        total: todo.subTasks.length,
        percentage: Math.round((completedSubTasks / todo.subTasks.length) * 100)
    };
}

function formatSubTasks(todo) {
    if (!todo.subTasks || todo.subTasks.length === 0) return '';
    
    return todo.subTasks.map(subTask => {
        return `
            <div class="subtask-item ${subTask.completed ? 'completed' : ''}">
                <input type="checkbox" ${subTask.completed ? 'checked' : ''} 
                       onchange="toggleSubTask(${todo.id}, ${subTask.id})" 
                       class="subtask-checkbox">
                <span class="subtask-title ${subTask.completed ? 'completed' : ''}">${subTask.title}</span>
                <button class="subtask-remove" onclick="removeSubTask(${todo.id}, ${subTask.id})" title="Remove sub-task">×</button>
            </div>
        `;
    }).join('');
}

// Data Backup/Restore Functions
function backupAllData() {
    const backupData = {
        todos: todos,
        templates: templates,
        exportDate: new Date().toISOString(),
        appVersion: "1.0",
        totalTasks: todos.length,
        completedTasks: todos.filter(t => t.completed).length
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `todo-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert(`Backup created successfully!\n\nExported:\n• ${backupData.totalTasks} total tasks\n• ${backupData.completedTasks} completed tasks\n• ${templates.length} templates`);
}

function restoreFromBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                
                // Validate backup data
                if (!backupData.todos || !Array.isArray(backupData.todos)) {
                    throw new Error('Invalid backup file format');
                }
                
                // Ask user for confirmation
                const confirmation = confirm(`Restore from backup?\n\nThis will replace all current data:\n• ${backupData.todos.length} tasks\n• ${(backupData.templates || []).length} templates\n\nCurrent data will be lost. Continue?`);
                
                if (confirmation) {
                    // Restore data
                    todos = backupData.todos;
                    templates = backupData.templates || [];
                    
                    // Save to localStorage
                    saveTodos();
                    saveTemplates();
                    updateTemplateDropdown();
                    
                    // Refresh display
                    displayTodos();
                    updateStats();
                    
                    alert(`Backup restored successfully!\n\nRestored:\n• ${todos.length} tasks\n• ${templates.length} templates`);
                }
            } catch (error) {
                alert(`Error reading backup file: ${error.message}`);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllData() {
    if (confirm('⚠️ WARNING: This will permanently delete ALL data!\n\n• All tasks\n• All templates\n• All time tracking\n• All attachments\n\nThis cannot be undone. Are you sure?')) {
        if (confirm('Final confirmation: Delete everything?')) {
            // Clear all data
            todos = [];
            templates = [];
            
            // Clear localStorage
            localStorage.removeItem('myEnhancedTodos');
            localStorage.removeItem('myTodoTemplates');
            
            // Stop all timers
            stopAllTimers();
            
            // Reset to default templates
            loadTemplates();
            
            // Refresh display
            displayTodos();
            updateStats();
            
            alert('All data has been cleared. Default templates have been restored.');
        }
    }
}

// Calendar Integration Functions
function generateCalendarEvent(todo) {
    if (!todo.dueDate) {
        alert('This task has no due date. Please set a due date first.');
        return;
    }
    
    const title = `TODO: ${todo.title}`;
    const description = todo.description ? `Description: ${todo.description}\n\nPriority: ${todo.priority}\nProgress: ${todo.progress}%` : `Priority: ${todo.priority}\nProgress: ${todo.progress}%`;
    const startDate = new Date(todo.dueDate + 'T09:00:00'); // Default to 9 AM
    const endDate = new Date(todo.dueDate + 'T10:00:00');   // 1 hour duration
    
    // Format dates for calendar URLs
    const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Create calendar URLs
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateStr}/${endDateStr}&details=${encodeURIComponent(description)}`;
    const outlookCalUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDateStr}&enddt=${endDateStr}&body=${encodeURIComponent(description)}`;
    
    // Ask user which calendar to use
    const choice = prompt(`Add "${todo.title}" to calendar:\n\n1 - Google Calendar\n2 - Outlook Calendar\n3 - Download .ics file\n\nEnter 1, 2, or 3:`);
    
    switch (choice) {
        case '1':
            window.open(googleCalUrl, '_blank');
            break;
        case '2':
            window.open(outlookCalUrl, '_blank');
            break;
        case '3':
            downloadIcsFile(todo, startDate, endDate);
            break;
        default:
            return; // Cancel
    }
}

function downloadIcsFile(todo, startDate, endDate) {
    const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Enhanced Todo App//EN
BEGIN:VEVENT
UID:${todo.id}@todo-app
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:TODO: ${todo.title}
DESCRIPTION:${todo.description || 'No description'}\nPriority: ${todo.priority}\nProgress: ${todo.progress}%
PRIORITY:${todo.priority === 'high' ? '1' : todo.priority === 'medium' ? '5' : '9'}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `todo-${todo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    link.click();
    
    alert('Calendar file downloaded! Import it into your calendar app.');
}

function showCalendarView() {
    const tasksWithDates = todos.filter(todo => todo.dueDate && !todo.completed);
    
    if (tasksWithDates.length === 0) {
        alert('No incomplete tasks with due dates found.');
        return;
    }
    
    // Group tasks by date
    const tasksByDate = {};
    tasksWithDates.forEach(todo => {
        const date = todo.dueDate;
        if (!tasksByDate[date]) tasksByDate[date] = [];
        tasksByDate[date].push(todo);
    });
    
    // Sort dates
    const sortedDates = Object.keys(tasksByDate).sort();
    
    let calendarView = 'UPCOMING TASKS CALENDAR VIEW\n';
    calendarView += '=' .repeat(40) + '\n\n';
    
    sortedDates.forEach(date => {
        const dateObj = new Date(date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString();
        
        calendarView += `📅 ${dayName}, ${formattedDate}\n`;
        calendarView += '-'.repeat(30) + '\n';
        
        tasksByDate[date].forEach(todo => {
            const priorityIcon = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢';
            calendarView += `${priorityIcon} ${todo.title} (${todo.progress}%)\n`;
            if (todo.description) {
                calendarView += `   ${todo.description}\n`;
            }
        });
        calendarView += '\n';
    });
    
    alert(calendarView);
}

// Device Sync Functions (URL-based sharing)
function generateSyncUrl() {
    const syncData = {
        todos: todos,
        templates: templates,
        timestamp: Date.now()
    };
    
    const compressedData = btoa(JSON.stringify(syncData));
    const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(compressedData)}`;
    
    // Create a shareable link
    const tempInput = document.createElement('input');
    tempInput.value = syncUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    alert(`Sync URL copied to clipboard!\n\nShare this URL to sync your tasks to another device:\n\n${syncUrl.substring(0, 100)}...\n\nNote: This URL contains all your task data. Keep it secure!`);
}

function generateQRCode() {
    const syncData = {
        todos: todos,
        templates: templates,
        timestamp: Date.now()
    };
    
    const compressedData = btoa(JSON.stringify(syncData));
    const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(compressedData)}`;
    
    // Use a QR code service (this will open in new tab)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(syncUrl)}`;
    window.open(qrUrl, '_blank');
    
    alert('QR Code opened in new tab!\n\nScan with another device to sync your tasks.');
}

function checkForSyncData() {
    const urlParams = new URLSearchParams(window.location.search);
    const syncParam = urlParams.get('sync');
    
    if (syncParam) {
        try {
            const decodedData = atob(decodeURIComponent(syncParam));
            const syncData = JSON.parse(decodedData);
            
            if (syncData.todos && Array.isArray(syncData.todos)) {
                const importDate = new Date(syncData.timestamp).toLocaleString();
                const confirmation = confirm(`Sync data found!\n\nImport ${syncData.todos.length} tasks from ${importDate}?\n\nThis will replace your current data.`);
                
                if (confirmation) {
                    todos = syncData.todos;
                    templates = syncData.templates || [];
                    
                    saveTodos();
                    saveTemplates();
                    updateTemplateDropdown();
                    displayTodos();
                    updateStats();
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    alert(`Sync completed!\n\nImported:\n• ${todos.length} tasks\n• ${templates.length} templates`);
                }
            }
        } catch (error) {
            alert('Invalid sync data in URL.');
        }
    }
}

function showSyncOptions() {
    const choice = prompt(`Device Sync Options:\n\n1 - Generate Sync URL (copy to clipboard)\n2 - Generate QR Code (scan with phone)\n3 - Manual Export/Import (use backup files)\n\nEnter 1, 2, or 3:`);
    
    switch (choice) {
        case '1':
            generateSyncUrl();
            break;
        case '2':
            generateQRCode();
            break;
        case '3':
            alert('Use the Backup/Restore buttons above:\n• Export backup on this device\n• Import backup on target device');
            break;
        default:
            return;
    }
}

// Reminder/Notification Functions
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return false;
    }
    
    if (Notification.permission === "granted") {
        return true;
    } else if (Notification.permission !== "denied") {
        return Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("Notifications enabled! You'll receive reminders for upcoming tasks.");
                return true;
            } else {
                alert("Notifications disabled. You can enable them later in browser settings.");
                return false;
            }
        });
    } else {
        alert("Notifications are blocked. Please enable them in browser settings if you want reminders.");
        return false;
    }
}

function checkReminders() {
    if (Notification.permission !== "granted") return;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    todos.forEach(todo => {
        if (!todo.completed && todo.dueDate) {
            const dueDate = todo.dueDate;
            let shouldNotify = false;
            let notificationTitle = '';
            let notificationBody = '';
            
            // Check if task is due today and it's after 9 AM
            if (dueDate === today && now.getHours() >= 9) {
                const lastNotified = localStorage.getItem(`notified_${todo.id}_today`);
                if (!lastNotified || (Date.now() - parseInt(lastNotified)) > 2 * 60 * 60 * 1000) { // 2 hours
                    shouldNotify = true;
                    notificationTitle = '📅 Task Due Today!';
                    notificationBody = `"${todo.title}" is due today (${todo.progress}% complete)`;
                    localStorage.setItem(`notified_${todo.id}_today`, Date.now().toString());
                }
            }
            
            // Check if task is due tomorrow
            if (dueDate === tomorrow) {
                const lastNotified = localStorage.getItem(`notified_${todo.id}_tomorrow`);
                if (!lastNotified || (Date.now() - parseInt(lastNotified)) > 24 * 60 * 60 * 1000) { // 24 hours
                    shouldNotify = true;
                    notificationTitle = '⏰ Task Due Tomorrow';
                    notificationBody = `"${todo.title}" is due tomorrow (${todo.progress}% complete)`;
                    localStorage.setItem(`notified_${todo.id}_tomorrow`, Date.now().toString());
                }
            }
            
            // Check if task is overdue
            if (dueDate < today) {
                const lastNotified = localStorage.getItem(`notified_${todo.id}_overdue`);
                if (!lastNotified || (Date.now() - parseInt(lastNotified)) > 24 * 60 * 60 * 1000) { // 24 hours
                    shouldNotify = true;
                    notificationTitle = '🚨 Overdue Task!';
                    notificationBody = `"${todo.title}" was due ${new Date(dueDate + 'T00:00:00').toLocaleDateString()}`;
                    localStorage.setItem(`notified_${todo.id}_overdue`, Date.now().toString());
                }
            }
            
            if (shouldNotify) {
                showNotification(notificationTitle, notificationBody, todo);
            }
        }
    });
}

function showNotification(title, body, todo) {
    const notification = new Notification(title, {
        body: body,
        icon: '📝', // You could add an actual icon here
        badge: '📝',
        tag: `todo-${todo.id}`,
        requireInteraction: false,
        silent: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
        
        // Optionally scroll to the task or highlight it
        const taskElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
        if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            taskElement.style.animation = 'highlight 2s ease';
        }
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
}

function setupReminderSystem() {
    // Request permission on first setup
    requestNotificationPermission();
    
    // Set up periodic checking (every 30 minutes)
    setInterval(checkReminders, 30 * 60 * 1000);
    
    // Check reminders immediately
    setTimeout(checkReminders, 5000); // Wait 5 seconds after page load
}

function testNotification() {
    if (Notification.permission === "granted") {
        showNotification("🧪 Test Notification", "Notifications are working! You'll receive reminders for your tasks.", {id: 'test'});
    } else {
        requestNotificationPermission().then(granted => {
            if (granted) {
                showNotification("🧪 Test Notification", "Notifications are now enabled!", {id: 'test'});
            }
        });
    }
}

// Collapsible Section Functions
function toggleCollapsible(sectionId) {
    const content = document.getElementById(sectionId + 'Content');
    const arrow = document.getElementById(sectionId + 'Arrow');
    
    if (content.style.display === 'none' || !content.style.display) {
        // Show content
        content.style.display = 'block';
        arrow.style.transform = 'rotate(90deg)';
        arrow.textContent = '🔽';
        
        // Animate in
        setTimeout(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
            content.style.opacity = '1';
        }, 10);
    } else {
        // Hide content
        arrow.style.transform = 'rotate(0deg)';
        arrow.textContent = '▶️';
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        
        // Hide after animation
        setTimeout(() => {
            content.style.display = 'none';
        }, 300);
    }
}

// This function adds a new todo or updates an existing one
function addTodo() {
    // Get all form values
    const titleInput = document.getElementById('todoInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const categoriesInput = document.getElementById('categoriesInput');
    const priorityInput = document.getElementById('priorityInput');
    const progressInput = document.getElementById('progressInput');
    const isRecurringInput = document.getElementById('isRecurringInput');
    const frequencyInput = document.getElementById('frequencyInput');
    const intervalInput = document.getElementById('intervalInput');

    const todoTitle = titleInput.value.trim();
    const dueDate = dueDateInput.value;
    const description = descriptionInput.value.trim();
    const categories = processCategories(categoriesInput.value);
    const priority = priorityInput.value;
    const progress = parseInt(progressInput.value);
    const isRecurring = isRecurringInput.checked;
    const frequency = frequencyInput.value;
    const interval = parseInt(intervalInput.value);

    // Check if the user entered a title
    if (todoTitle === '') {
        shakeFormOnError('todoInput');
        return;
    }

    if (editingTodoId) {
        // We're editing an existing todo
        const todoIndex = todos.findIndex(t => t.id === editingTodoId);
        if (todoIndex !== -1) {
            // Update existing todo (preserve original creation date)
            todos[todoIndex] = {
                ...todos[todoIndex], // Keep existing properties
                title: todoTitle,
                description: description,
                dueDate: dueDate,
                categories: categories,
                priority: priority,
                progress: progress,
                completed: progress === 100 // Auto-complete if 100%
            };
        }
        
        // Exit edit mode
        cancelEdit();
    } else {
        // Create a new enhanced todo object
        const newTodo = {
            id: Date.now(),
            title: todoTitle,
            description: description,
            dueDate: dueDate,
            categories: categories,
            priority: priority,
            progress: progress,
            completed: progress === 100, // Auto-complete if 100%
            createdDate: new Date().toISOString().split('T')[0],
            isRecurring: isRecurring,
            recurrence: isRecurring ? { frequency: frequency, interval: interval } : null,
            timeTracking: {
                totalTime: 0, // Total time in seconds
                isRunning: false,
                startTime: null,
                sessions: [] // Array of {start, end, duration} objects
            },
            attachments: [], // Array of {type, name, url, note} objects
            subTasks: [] // Array of {id, title, completed, createdAt} objects
        };

        // Add the new todo to our array
        todos.push(newTodo);

        // Clear all input fields
        titleInput.value = '';
        dueDateInput.value = '';
        descriptionInput.value = '';
        categoriesInput.value = '';
        priorityInput.value = 'medium';
        progressInput.value = '0';
        isRecurringInput.checked = false;
        frequencyInput.value = 'daily';
        intervalInput.value = '1';
        document.getElementById('recurringOptions').style.display = 'none';
    }

    // Save to localStorage
    saveTodos();

    // Update the display with animations
    displayTodos();
    updateStats();
    animateStatNumbers();
}

// This function shows todos based on current filter
function displayTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    // Filter todos based on current filter and search
    let filteredTodos = todos.filter(todo => {
        // First apply status filter
        let statusMatch = true;
        if (currentFilter === 'completed') statusMatch = todo.completed;
        else if (currentFilter === 'in-progress') statusMatch = !todo.completed;
        
        // Then apply search filter
        let searchMatch = true;
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            const titleMatch = todo.title.toLowerCase().includes(searchLower);
            const descriptionMatch = (todo.description || '').toLowerCase().includes(searchLower);
            const categoriesMatch = (todo.categories || []).some(cat => 
                cat.toLowerCase().includes(searchLower)
            );
            searchMatch = titleMatch || descriptionMatch || categoriesMatch;
        }
        
        return statusMatch && searchMatch;
    });

    // Sort the filtered todos
    filteredTodos = sortTodos([...filteredTodos]); // Create copy to avoid mutating original

    // Display message if no todos match filter
    if (filteredTodos.length === 0) {
        const message = document.createElement('p');
        message.style.textAlign = 'center';
        message.style.color = '#666';
        message.style.fontStyle = 'italic';
        message.textContent = `No ${currentFilter === 'all' ? '' : currentFilter} tasks found.`;
        todoList.appendChild(message);
        return;
    }

    // Create HTML for each filtered todo
    filteredTodos.forEach((todo, index) => {
        const listItem = document.createElement('li');
        const priority = todo.priority || 'medium';
        const isSelected = selectedTodos.has(todo.id);
        const isMissedTask = todo.completed && todo.progress === 0 && todo.isRecurring;
        listItem.className = `todo-item priority-${priority} ${todo.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''} ${isMissedTask ? 'missed-task' : ''}`;
        
        // Add drag and drop attributes
        listItem.draggable = true;
        listItem.dataset.todoId = todo.id;
        
        // Format due date for display (fix timezone issue)
        const dueDateText = todo.dueDate 
            ? new Date(todo.dueDate + 'T00:00:00').toLocaleDateString() 
            : 'No due date';

        // Priority display mapping
        const priorityDisplay = {
            high: '🔴 High',
            medium: '🟡 Medium', 
            low: '🟢 Low'
        };
        
        listItem.innerHTML = `
            <div class="todo-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="bulk-checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleTodoSelection(${todo.id})">
                    <div class="todo-title ${todo.completed ? 'completed' : ''}">
                        ${todo.title}
                        ${todo.isRecurring ? '<span class="recurring-badge" title="Recurring task">🔄</span>' : ''}
                        ${isMissedTask ? '<span class="missed-badge" title="Missed recurring task">❌ Missed</span>' : ''}
                        <span class="priority-badge priority-${priority}">
                            ${priorityDisplay[priority]}
                        </span>
                    </div>
                </div>
                <div class="todo-actions">
                    <div class="progress-container">
                        <select class="progress-select" onchange="updateProgress(${todo.id}, this.value)">
                            <option value="0" ${todo.progress === 0 ? 'selected' : ''}>0%</option>
                            <option value="25" ${todo.progress === 25 ? 'selected' : ''}>25%</option>
                            <option value="50" ${todo.progress === 50 ? 'selected' : ''}>50%</option>
                            <option value="75" ${todo.progress === 75 ? 'selected' : ''}>75%</option>
                            <option value="100" ${todo.progress === 100 ? 'selected' : ''}>100%</option>
                        </select>
                    </div>
                    ${(() => {
                        const currentTime = getCurrentTime(todo);
                        const isRunning = todo.timeTracking && todo.timeTracking.isRunning;
                        return `<div class="time-tracking">
                            <span class="time-display">${currentTime > 0 ? formatTime(currentTime) : '0s'}</span>
                            <button class="timer-btn ${isRunning ? 'running' : ''}" onclick="toggleTimer(${todo.id})" title="${isRunning ? 'Stop timer' : 'Start timer'}">
                                ${isRunning ? '⏹️' : '▶️'}
                            </button>
                        </div>`;
                    })()}
                    <div class="attachment-controls">
                        <button class="attachment-btn" onclick="showAttachmentMenu(${todo.id})" title="Add attachment">📎</button>
                        ${todo.attachments && todo.attachments.length > 0 ? `<span class="attachment-count">${todo.attachments.length}</span>` : ''}
                    </div>
                    <div class="subtask-controls">
                        <button class="subtask-btn" onclick="addSubTask(${todo.id})" title="Add sub-task">📝</button>
                        ${(() => {
                            const progress = getSubTaskProgress(todo);
                            return progress ? `<span class="subtask-count">${progress.completed}/${progress.total}</span>` : '';
                        })()}
                    </div>
                    <button class="calendar-btn" onclick="generateCalendarEvent(${JSON.stringify(todo).replace(/"/g, '&quot;')})" title="Add to calendar">📅</button>
                    <button class="edit-btn" onclick="editTodo(${todo.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
                </div>
            </div>
            
            ${todo.description ? `
                <div class="todo-details">
                    <div class="todo-description">${todo.description}</div>
                </div>
            ` : ''}
            
            ${todo.categories && todo.categories.length > 0 ? `
                <div class="categories-container">
                    <strong>Categories:</strong> ${generateCategoryTags(todo.categories, true)}
                </div>
            ` : ''}
            
            ${todo.attachments && todo.attachments.length > 0 ? `
                <div class="attachments-container">
                    <strong>Attachments:</strong>
                    <div class="attachments-list">
                        ${formatAttachments(todo)}
                    </div>
                </div>
            ` : ''}
            
            ${todo.subTasks && todo.subTasks.length > 0 ? `
                <div class="subtasks-container">
                    <strong>Sub-tasks:</strong>
                    <div class="subtasks-list">
                        ${formatSubTasks(todo)}
                    </div>
                </div>
            ` : ''}
            
            <div class="todo-meta">
                <span class="todo-due-date ${todo.completed ? 'completed' : ''}">
                    📅 Due: ${dueDateText}
                </span>
                <span>📊 Progress: ${todo.progress}%</span>
                <span>🏆 Priority: ${priorityDisplay[priority]} (Weight: ${priorityWeights[priority]}x)</span>
                <span>📅 Created: ${new Date(todo.createdDate).toLocaleDateString()}</span>
            </div>
        `;

        // Add drag and drop event listeners
        addDragAndDropListeners(listItem);

        todoList.appendChild(listItem);
    });

    // Update bulk actions visibility and selection count
    updateBulkActionsDisplay();
    
    // Enhance accessibility for newly created todo items
    enhanceTodoItemAccessibility();
}

// Update progress and auto-complete at 100%
function updateProgress(id, newProgress) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const wasCompleted = todo.completed;
        todo.progress = parseInt(newProgress);
        todo.completed = todo.progress === 100; // Auto-complete at 100%
        
        // If task just got completed and is recurring, create next instance
        if (!wasCompleted && todo.completed && todo.isRecurring) {
            const nextTask = createNextRecurringTask(todo);
            todos.push(nextTask);
        }
        
        saveTodos();
        displayTodos();
        updateStats();
        animateStatNumbers();
    }
}

// Filter todos by status
function filterTodos(filter) {
    currentFilter = filter;
    
    // Update filter button styles
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Map filter names to correct button IDs
    const buttonIds = {
        'all': 'filterAll',
        'in-progress': 'filterInProgress',
        'completed': 'filterCompleted'
    };
    
    const buttonId = buttonIds[filter];
    if (buttonId) {
        document.getElementById(buttonId).classList.add('active');
    }
    
    displayTodos();
    addFadeInToNewItems();
}

// Update sort option
function updateSort() {
    currentSort = document.getElementById('sortSelect').value;
    displayTodos();
    addFadeInToNewItems();
}

// Update search
function updateSearch() {
    currentSearch = document.getElementById('searchInput').value.toLowerCase().trim();
    displayTodos();
    addFadeInToNewItems();
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearch = '';
    displayTodos();
    addFadeInToNewItems();
}

// Process categories from comma-separated string
function processCategories(categoriesString) {
    if (!categoriesString || !categoriesString.trim()) return [];
    return categoriesString
        .split(',')
        .map(cat => cat.trim().toLowerCase())
        .filter(cat => cat.length > 0);
}

// Generate category tags HTML
function generateCategoryTags(categories, clickable = false) {
    if (!categories || categories.length === 0) return '';
    
    return categories.map(category => {
        const clickHandler = clickable ? `onclick="filterByCategory('${category}')"` : '';
        return `<span class="category-tag" ${clickHandler}>${category}</span>`;
    }).join('');
}

// Filter by category (when clicking on a category tag)
function filterByCategory(category) {
    document.getElementById('searchInput').value = category;
    currentSearch = category.toLowerCase();
    displayTodos();
    addFadeInToNewItems();
}

// Sort todos based on current sort option
function sortTodos(todosToSort) {
    return todosToSort.sort((a, b) => {
        switch(currentSort) {
            case 'title':
                return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
            
            case 'due':
                // Handle empty due dates
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1; // Empty dates go to end
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            
            case 'priority':
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return priorityOrder[b.priority || 'medium'] - priorityOrder[a.priority || 'medium'];
            
            case 'progress':
                return (b.progress || 0) - (a.progress || 0); // Highest progress first
            
            case 'created':
            default:
                return new Date(b.createdDate) - new Date(a.createdDate); // Newest first
        }
    });
}

// Delete a todo with animation
function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        // Try to animate the deletion
        if (!animateDelete(id)) {
            // Fallback if animation fails
            todos = todos.filter(todo => todo.id !== id);
            saveTodos();
            displayTodos();
            updateStats();
            animateStatNumbers();
        }
    }
}

// Edit a todo - populate form with existing data
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Set editing mode
    editingTodoId = id;

    // Populate form fields
    document.getElementById('todoInput').value = todo.title;
    document.getElementById('dueDateInput').value = todo.dueDate || '';
    document.getElementById('descriptionInput').value = todo.description || '';
    document.getElementById('categoriesInput').value = (todo.categories || []).join(', ');
    document.getElementById('priorityInput').value = todo.priority || 'medium';
    document.getElementById('progressInput').value = todo.progress || 0;

    // Update button states
    document.getElementById('addTaskBtn').textContent = 'Update Task';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    // Scroll to form
    document.getElementById('todoInput').focus();
}

// Cancel editing mode
function cancelEdit() {
    editingTodoId = null;

    // Clear form fields
    document.getElementById('todoInput').value = '';
    document.getElementById('dueDateInput').value = '';
    document.getElementById('descriptionInput').value = '';
    document.getElementById('categoriesInput').value = '';
    document.getElementById('priorityInput').value = 'medium';
    document.getElementById('progressInput').value = '0';

    // Reset button states
    document.getElementById('addTaskBtn').textContent = 'Add Task';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// Animation helper functions
function showLoadingButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
}

function hideLoadingButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function animateStatNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        stat.classList.add('success-pulse');
        setTimeout(() => {
            stat.classList.remove('success-pulse');
        }, 600);
    });
}

function shakeFormOnError(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.add('error-shake');
        setTimeout(() => {
            input.classList.remove('error-shake');
        }, 500);
    }
}

function animateDelete(todoId) {
    const todoItems = document.querySelectorAll('.todo-item');
    let targetItem = null;
    
    // Find the todo item by checking the delete button's onclick attribute
    todoItems.forEach(item => {
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn && deleteBtn.getAttribute('onclick').includes(todoId)) {
            targetItem = item;
        }
    });
    
    if (targetItem) {
        targetItem.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            // Actually remove the todo after animation
            todos = todos.filter(todo => todo.id !== todoId);
            saveTodos();
            displayTodos();
            updateStats();
            animateStatNumbers();
        }, 300);
        return true; // Indicate we're handling the animation
    }
    return false; // Fallback to immediate deletion
}

function addFadeInToNewItems() {
    // Add fade-in class to todo list container
    const todoList = document.getElementById('todoList');
    if (todoList) {
        todoList.classList.add('fade-in');
        setTimeout(() => {
            todoList.classList.remove('fade-in');
        }, 500);
    }
}

// Export functions
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportAsJSON() {
    // Show loading (simulate brief processing time)
    const button = event.target;
    button.classList.add('loading');
    button.disabled = true;
    
    setTimeout(() => {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalTasks: todos.length,
            completedTasks: todos.filter(t => t.completed).length,
            todos: todos
        };
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        downloadFile(jsonContent, `todos-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        
        button.classList.remove('loading');
        button.disabled = false;
    }, 500);
}

function exportAsCSV() {
    const button = event.target;
    button.classList.add('loading');
    button.disabled = true;
    
    setTimeout(() => {
        const headers = ['Title', 'Description', 'Due Date', 'Categories', 'Priority', 'Progress', 'Completed', 'Created Date'];
        const csvRows = [headers.join(',')];
        
        todos.forEach(todo => {
            const row = [
                `"${(todo.title || '').replace(/"/g, '""')}"`,
                `"${(todo.description || '').replace(/"/g, '""')}"`,
                todo.dueDate || '',
                `"${(todo.categories || []).join('; ')}"`,
                todo.priority || 'medium',
                todo.progress || 0,
                todo.completed ? 'Yes' : 'No',
                todo.createdDate || ''
            ];
            csvRows.push(row.join(','));
        });
        
        downloadFile(csvRows.join('\n'), `todos-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        
        button.classList.remove('loading');
        button.disabled = false;
    }, 400);
}

function exportAsText() {
    const button = event.target;
    button.classList.add('loading');
    button.disabled = true;
    
    setTimeout(() => {
        const lines = [];
        lines.push('='.repeat(50));
        lines.push('TODO LIST EXPORT');
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        lines.push(`Total Tasks: ${todos.length}`);
        lines.push(`Completed: ${todos.filter(t => t.completed).length}`);
        lines.push(`In Progress: ${todos.filter(t => !t.completed).length}`);
        lines.push('='.repeat(50));
        lines.push('');

        // Group by status
        const completedTodos = todos.filter(t => t.completed);
        const inProgressTodos = todos.filter(t => !t.completed);

        if (inProgressTodos.length > 0) {
            lines.push('📋 IN PROGRESS TASKS:');
            lines.push('-'.repeat(30));
            inProgressTodos.forEach((todo, index) => {
                lines.push(`${index + 1}. ${todo.title}`);
                if (todo.description) lines.push(`   Description: ${todo.description}`);
                if (todo.dueDate) lines.push(`   Due: ${new Date(todo.dueDate + 'T00:00:00').toLocaleDateString()}`);
                if (todo.categories && todo.categories.length > 0) lines.push(`   Categories: ${todo.categories.join(', ')}`);
                lines.push(`   Priority: ${(todo.priority || 'medium').toUpperCase()}`);
                lines.push(`   Progress: ${todo.progress || 0}%`);
                lines.push('');
            });
        }

        if (completedTodos.length > 0) {
            lines.push('✅ COMPLETED TASKS:');
            lines.push('-'.repeat(30));
            completedTodos.forEach((todo, index) => {
                lines.push(`${index + 1}. ${todo.title}`);
                if (todo.description) lines.push(`   Description: ${todo.description}`);
                if (todo.categories && todo.categories.length > 0) lines.push(`   Categories: ${todo.categories.join(', ')}`);
                lines.push(`   Completed: ${new Date(todo.createdDate).toLocaleDateString()}`);
                lines.push('');
            });
        }

        downloadFile(lines.join('\n'), `todos-export-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
        
        button.classList.remove('loading');
        button.disabled = false;
    }, 600);
}

// Drag and Drop Functions
function addDragAndDropListeners(listItem) {
    listItem.addEventListener('dragstart', handleDragStart);
    listItem.addEventListener('dragover', handleDragOver);
    listItem.addEventListener('drop', handleDrop);
    listItem.addEventListener('dragenter', handleDragEnter);
    listItem.addEventListener('dragleave', handleDragLeave);
    listItem.addEventListener('dragend', handleDragEnd);
    
    // Add swipe gesture listeners for mobile
    addSwipeListeners(listItem);
}

function handleDragStart(e) {
    draggedTodoId = parseInt(this.dataset.todoId);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (parseInt(this.dataset.todoId) !== draggedTodoId) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const targetTodoId = parseInt(this.dataset.todoId);
    if (draggedTodoId && targetTodoId && draggedTodoId !== targetTodoId) {
        // Find the indices of the dragged and target todos
        const draggedIndex = todos.findIndex(t => t.id === draggedTodoId);
        const targetIndex = todos.findIndex(t => t.id === targetTodoId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove the dragged item and insert it before the target
            const draggedTodo = todos.splice(draggedIndex, 1)[0];
            todos.splice(targetIndex, 0, draggedTodo);
            
            // Save and refresh
            saveTodos();
            displayTodos();
            animateStatNumbers();
        }
    }

    this.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Clean up all drag-over classes
    document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedTodoId = null;
}

// Mobile Swipe Gesture Functions
let swipeState = {
    isSwipeActive: false,
    startX: 0,
    currentX: 0,
    startTime: 0,
    currentTodo: null,
    swipeThreshold: 80, // Minimum distance for swipe action
    timeThreshold: 300  // Maximum time for quick swipe
};

function addSwipeListeners(todoItem) {
    // Touch events for swipe gestures
    todoItem.addEventListener('touchstart', handleSwipeStart, { passive: false });
    todoItem.addEventListener('touchmove', handleSwipeMove, { passive: false });
    todoItem.addEventListener('touchend', handleSwipeEnd, { passive: false });
    
    // Add swipe hint element
    const swipeHint = document.createElement('div');
    swipeHint.className = 'swipe-action-hint';
    swipeHint.textContent = '✓';
    todoItem.appendChild(swipeHint);
}

function handleSwipeStart(e) {
    const touch = e.touches[0];
    swipeState.isSwipeActive = true;
    swipeState.startX = touch.clientX;
    swipeState.currentX = touch.clientX;
    swipeState.startTime = Date.now();
    swipeState.currentTodo = this;
    
    // Prevent scrolling during horizontal swipe
    if (Math.abs(e.touches[0].clientX - swipeState.startX) > 10) {
        e.preventDefault();
    }
}

function handleSwipeMove(e) {
    if (!swipeState.isSwipeActive || !swipeState.currentTodo) return;
    
    const touch = e.touches[0];
    swipeState.currentX = touch.clientX;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    
    // Only handle left swipe (negative deltaX)
    if (deltaX < 0) {
        const swipeDistance = Math.abs(deltaX);
        const maxSwipe = swipeState.swipeThreshold + 20;
        const clampedDistance = Math.min(swipeDistance, maxSwipe);
        
        // Apply transform and add swiping class
        swipeState.currentTodo.classList.add('swiping');
        swipeState.currentTodo.style.setProperty('--swipe-offset', `-${clampedDistance}px`);
        
        // Show swipe hint when threshold is reached
        const swipeHint = swipeState.currentTodo.querySelector('.swipe-action-hint');
        const todoId = parseInt(swipeState.currentTodo.dataset.todoId);
        const todo = todos.find(t => t.id === todoId);
        
        if (swipeDistance > swipeState.swipeThreshold * 0.5) {
            swipeHint.classList.add('visible');
            
            // Change hint based on todo completion status
            if (todo && todo.completed) {
                swipeHint.className = 'swipe-action-hint delete visible';
                swipeHint.textContent = '🗑';
            } else {
                swipeHint.className = 'swipe-action-hint complete visible';
                swipeHint.textContent = '✓';
            }
        } else {
            swipeHint.classList.remove('visible');
        }
        
        // Prevent default to avoid scrolling
        e.preventDefault();
    }
}

function handleSwipeEnd(e) {
    if (!swipeState.isSwipeActive || !swipeState.currentTodo) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const swipeDistance = Math.abs(deltaX);
    const swipeTime = Date.now() - swipeState.startTime;
    const todoId = parseInt(swipeState.currentTodo.dataset.todoId);
    const todo = todos.find(t => t.id === todoId);
    
    // Reset swipe state
    swipeState.currentTodo.classList.remove('swiping');
    swipeState.currentTodo.classList.add('swipe-releasing');
    swipeState.currentTodo.style.removeProperty('--swipe-offset');
    
    const swipeHint = swipeState.currentTodo.querySelector('.swipe-action-hint');
    swipeHint.classList.remove('visible');
    
    // Check if swipe action should trigger
    const isValidSwipe = deltaX < 0 && 
                        swipeDistance > swipeState.swipeThreshold && 
                        swipeTime < swipeState.timeThreshold * 2;
    
    if (isValidSwipe && todo) {
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Perform action based on todo state
        if (todo.completed) {
            // Delete completed todo
            setTimeout(() => deleteTodo(todoId), 100);
        } else {
            // Complete incomplete todo
            setTimeout(() => {
                const todoElement = todos.find(t => t.id === todoId);
                if (todoElement) {
                    const wasCompleted = todoElement.completed;
                    todoElement.completed = true;
                    todoElement.progress = 100;
                    
                    // If task just got completed and is recurring, create next instance
                    if (!wasCompleted && todoElement.isRecurring) {
                        const nextTask = createNextRecurringTask(todoElement);
                        todos.push(nextTask);
                    }
                    
                    saveTodos();
                    displayTodos();
                    updateStats();
                    animateStatNumbers();
                }
            }, 100);
        }
    }
    
    // Clean up
    setTimeout(() => {
        if (swipeState.currentTodo) {
            swipeState.currentTodo.classList.remove('swipe-releasing');
        }
    }, 300);
    
    // Reset swipe state
    swipeState.isSwipeActive = false;
    swipeState.currentTodo = null;
    swipeState.startX = 0;
    swipeState.currentX = 0;
}

// Bulk Selection Functions
function toggleTodoSelection(todoId) {
    if (selectedTodos.has(todoId)) {
        selectedTodos.delete(todoId);
    } else {
        selectedTodos.add(todoId);
    }
    updateBulkActionsDisplay();
    displayTodos(); // Refresh to show selection state
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const visibleTodos = getFilteredTodos();
    
    if (checkbox.checked) {
        // Select all visible todos
        visibleTodos.forEach(todo => selectedTodos.add(todo.id));
    } else {
        // Deselect all todos
        selectedTodos.clear();
    }
    
    updateBulkActionsDisplay();
    displayTodos();
}

function updateBulkActionsDisplay() {
    const selectedCount = selectedTodos.size;
    const bulkActions = document.getElementById('bulkActions');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // Update count display
    selectedCountSpan.textContent = `${selectedCount} selected`;
    
    // Show/hide bulk actions
    if (selectedCount > 0) {
        bulkActions.classList.add('visible');
    } else {
        bulkActions.classList.remove('visible');
    }
    
    // Update select all checkbox state
    const visibleTodos = getFilteredTodos();
    if (selectedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedCount === visibleTodos.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

function getFilteredTodos() {
    return todos.filter(todo => {
        // Apply same filtering logic as displayTodos
        let statusMatch = true;
        if (currentFilter === 'completed') statusMatch = todo.completed;
        else if (currentFilter === 'in-progress') statusMatch = !todo.completed;
        
        let searchMatch = true;
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            const titleMatch = todo.title.toLowerCase().includes(searchLower);
            const descriptionMatch = (todo.description || '').toLowerCase().includes(searchLower);
            const categoriesMatch = (todo.categories || []).some(cat => 
                cat.toLowerCase().includes(searchLower)
            );
            searchMatch = titleMatch || descriptionMatch || categoriesMatch;
        }
        
        return statusMatch && searchMatch;
    });
}

function clearSelection() {
    selectedTodos.clear();
    updateBulkActionsDisplay();
    displayTodos();
}

function bulkComplete() {
    if (selectedTodos.size === 0) return;
    
    if (confirm(`Mark ${selectedTodos.size} selected tasks as complete?`)) {
        todos.forEach(todo => {
            if (selectedTodos.has(todo.id)) {
                const wasCompleted = todo.completed;
                todo.completed = true;
                todo.progress = 100;
                
                // If task just got completed and is recurring, create next instance
                if (!wasCompleted && todo.isRecurring) {
                    const nextTask = createNextRecurringTask(todo);
                    todos.push(nextTask);
                }
            }
        });
        
        saveTodos();
        displayTodos();
        updateStats();
        animateStatNumbers();
        clearSelection();
    }
}

function bulkIncomplete() {
    if (selectedTodos.size === 0) return;
    
    if (confirm(`Mark ${selectedTodos.size} selected tasks as incomplete?`)) {
        todos.forEach(todo => {
            if (selectedTodos.has(todo.id)) {
                todo.completed = false;
                if (todo.progress === 100) {
                    todo.progress = 75; // Set to 75% when marking incomplete
                }
            }
        });
        
        saveTodos();
        displayTodos();
        updateStats();
        animateStatNumbers();
        clearSelection();
    }
}

function bulkDelete() {
    if (selectedTodos.size === 0) return;
    
    if (confirm(`Delete ${selectedTodos.size} selected tasks? This cannot be undone.`)) {
        todos = todos.filter(todo => !selectedTodos.has(todo.id));
        
        saveTodos();
        displayTodos();
        updateStats();
        animateStatNumbers();
        clearSelection();
    }
}

// Keyboard shortcuts for common actions
document.addEventListener('keydown', function(e) {
    // Ctrl+N or Cmd+N - Focus on new task input
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('todoInput').focus();
    }
    
    // Escape key - Cancel editing or clear form
    if (e.key === 'Escape') {
        if (editingTodoId) {
            cancelEdit();
        } else {
            // Clear form if not editing
            document.getElementById('todoInput').value = '';
            document.getElementById('dueDateInput').value = '';
            document.getElementById('descriptionInput').value = '';
            document.getElementById('priorityInput').value = 'medium';
            document.getElementById('progressInput').value = '0';
        }
    }
    
    // Ctrl+S or Cmd+S - Save/Add todo
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (document.getElementById('todoInput').value.trim()) {
            addTodo();
        }
    }
    
    // Ctrl+1, 2, 3, 4 - Switch filters and sort
    if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
            e.preventDefault();
            filterTodos('all');
        } else if (e.key === '2') {
            e.preventDefault();
            filterTodos('in-progress');
        } else if (e.key === '3') {
            e.preventDefault();
            filterTodos('completed');
        } else if (e.key === '4') {
            e.preventDefault();
            // Cycle through sort options
            const sortSelect = document.getElementById('sortSelect');
            const sortOptions = ['created', 'title', 'due', 'priority', 'progress'];
            const currentIndex = sortOptions.indexOf(currentSort);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            sortSelect.value = sortOptions[nextIndex];
            updateSort();
        }
    }
    
    // Bulk action shortcuts
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            // Select all visible todos
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            selectAllCheckbox.checked = true;
            toggleSelectAll();
        } else if (e.key === 'd' && selectedTodos.size > 0) {
            e.preventDefault();
            bulkDelete();
        }
    }
});

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Allow adding todos by pressing Enter in title field
    const todoInput = document.getElementById('todoInput');
    if (todoInput) {
        todoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    }
});

// Dark Mode Theme Functions
function loadTheme() {
    // Load saved theme preference or default to light
    const savedTheme = localStorage.getItem('todoAppTheme') || 'light';
    currentTheme = savedTheme;
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const themeToggle = document.getElementById('themeToggle');
    
    if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
        themeToggle.setAttribute('aria-pressed', 'true');
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
        themeToggle.setAttribute('aria-pressed', 'false');
        themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
    
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    saveTheme(newTheme);
    
    // Add a subtle animation feedback
    const toggleButton = document.getElementById('themeToggle');
    toggleButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
        toggleButton.style.transform = '';
    }, 150);
}

function saveTheme(theme) {
    localStorage.setItem('todoAppTheme', theme);
}

// Accessibility and Screen Reader Support Functions
function announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove announcement after it's been read
    setTimeout(() => {
        if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
        }
    }, 1000);
}

function updateFormValidation(inputId, isValid, message = '') {
    const input = document.getElementById(inputId);
    if (input) {
        input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
        
        if (!isValid && message) {
            input.setAttribute('aria-describedby', `${inputId}-error`);
            
            // Create or update error message
            let errorElement = document.getElementById(`${inputId}-error`);
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = `${inputId}-error`;
                errorElement.className = 'sr-only';
                errorElement.setAttribute('role', 'alert');
                input.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
        } else {
            // Remove error message if validation passes
            const errorElement = document.getElementById(`${inputId}-error`);
            if (errorElement) {
                errorElement.remove();
            }
            input.removeAttribute('aria-describedby');
        }
    }
}

function enhanceKeyboardNavigation() {
    // Enhanced keyboard navigation for todo items
    document.addEventListener('keydown', function(e) {
        const focusedElement = document.activeElement;
        
        // Tab navigation through todo items
        if (focusedElement && focusedElement.classList.contains('todo-item')) {
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    // Toggle completion status
                    const todoId = parseInt(focusedElement.dataset.todoId);
                    const todo = todos.find(t => t.id === todoId);
                    if (todo) {
                        const wasCompleted = todo.completed;
                        todo.completed = !todo.completed;
                        todo.progress = todo.completed ? 100 : (todo.progress === 100 ? 75 : todo.progress);
                        
                        // If task just got completed and is recurring, create next instance
                        if (!wasCompleted && todo.completed && todo.isRecurring) {
                            const nextTask = createNextRecurringTask(todo);
                            todos.push(nextTask);
                        }
                        
                        saveTodos();
                        displayTodos();
                        updateStats();
                        announceToScreenReader(
                            `Task ${todo.completed ? 'completed' : 'marked as incomplete'}: ${todo.title}`,
                            'assertive'
                        );
                    }
                    break;
                    
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    const deleteId = parseInt(focusedElement.dataset.todoId);
                    if (confirm('Delete this task?')) {
                        const deletedTodo = todos.find(t => t.id === deleteId);
                        deleteTodo(deleteId);
                        announceToScreenReader(`Task deleted: ${deletedTodo ? deletedTodo.title : 'Unknown task'}`, 'assertive');
                    }
                    break;
                    
                case 'e':
                case 'E':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const editId = parseInt(focusedElement.dataset.todoId);
                        editTodo(editId);
                        announceToScreenReader('Editing task. Focus moved to form.', 'assertive');
                    }
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    focusPreviousTodo(focusedElement);
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    focusNextTodo(focusedElement);
                    break;
            }
        }
        
        // Global keyboard shortcuts with announcements
        if (e.key === 'F6') {
            e.preventDefault();
            // Cycle through main sections
            cycleThroughSections();
        }
    });
}

function focusPreviousTodo(currentTodo) {
    const todoItems = Array.from(document.querySelectorAll('.todo-item[tabindex="0"]'));
    const currentIndex = todoItems.indexOf(currentTodo);
    if (currentIndex > 0) {
        todoItems[currentIndex - 1].focus();
    }
}

function focusNextTodo(currentTodo) {
    const todoItems = Array.from(document.querySelectorAll('.todo-item[tabindex="0"]'));
    const currentIndex = todoItems.indexOf(currentTodo);
    if (currentIndex < todoItems.length - 1) {
        todoItems[currentIndex + 1].focus();
    }
}

function cycleThroughSections() {
    const sections = [
        '#todoInput',
        '.filter-btn.active',
        '.todo-item[tabindex="0"]:first-of-type',
        '#themeToggle'
    ];
    
    const currentSection = sections.findIndex(selector => {
        const element = document.querySelector(selector);
        return element && (document.activeElement === element || element.contains(document.activeElement));
    });
    
    const nextSection = (currentSection + 1) % sections.length;
    const nextElement = document.querySelector(sections[nextSection]);
    if (nextElement) {
        nextElement.focus();
        announceToScreenReader(`Focused on ${nextElement.tagName.toLowerCase()}`, 'polite');
    }
}

function enhanceTodoItemAccessibility() {
    // This will be called after displayTodos() to enhance accessibility
    const todoItems = document.querySelectorAll('.todo-item');
    todoItems.forEach((item, index) => {
        const todoId = parseInt(item.dataset.todoId);
        const todo = todos.find(t => t.id === todoId);
        
        if (todo) {
            // Make todo items focusable and add ARIA attributes
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'listitem');
            item.setAttribute('aria-label', 
                `Task: ${todo.title}. ${todo.completed ? 'Completed' : 'Incomplete'}. 
                 Priority: ${todo.priority || 'medium'}. Progress: ${todo.progress}%. 
                 Press Enter to toggle completion, E to edit, Delete to remove.`
            );
            
            // Add keyboard event listeners
            item.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const checkbox = this.querySelector('.bulk-checkbox');
                    if (checkbox) {
                        checkbox.click();
                    }
                }
            });
        }
    });
}

// Enhanced load function that includes theme loading and accessibility
function initializeApp() {
    loadTheme(); // Load theme first
    loadTodos(); // Then load todos
    enhanceKeyboardNavigation(); // Set up keyboard navigation
    
    // Add skip link
    const skipLink = document.createElement('a');
    skipLink.href = '#todoInput';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Announce app ready state
    setTimeout(() => {
        announceToScreenReader('Todo app loaded and ready. Press F6 to navigate between sections.', 'polite');
    }, 1000);
}

// Load app when the page first loads
window.addEventListener('load', initializeApp);