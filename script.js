// Enhanced Todo App JavaScript

// Global Variables
let todos = [];
let currentFilter = 'all';
let currentSort = 'created';
let currentSearch = '';
let editingTodoId = null; // Track which todo is being edited
let selectedTodos = new Set(); // Track selected todos for bulk actions
let draggedTodoId = null; // Track which todo is being dragged
let currentTheme = 'light'; // Track current theme

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
        displayTodos();
        updateStats();
    }
    loadDailyVerse();
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('myEnhancedTodos', JSON.stringify(todos));
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

    const todoTitle = titleInput.value.trim();
    const dueDate = dueDateInput.value;
    const description = descriptionInput.value.trim();
    const categories = processCategories(categoriesInput.value);
    const priority = priorityInput.value;
    const progress = parseInt(progressInput.value);

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
            createdDate: new Date().toISOString().split('T')[0]
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
        listItem.className = `todo-item priority-${priority} ${todo.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''}`;
        
        // Add drag and drop attributes
        listItem.draggable = true;
        listItem.dataset.todoId = todo.id;
        
        // Format due date for display
        const dueDateText = todo.dueDate 
            ? new Date(todo.dueDate).toLocaleDateString() 
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
}

// Update progress and auto-complete at 100%
function updateProgress(id, newProgress) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.progress = parseInt(newProgress);
        todo.completed = todo.progress === 100; // Auto-complete at 100%
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
    document.getElementById('filter' + filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', '')).classList.add('active');
    
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
                if (todo.dueDate) lines.push(`   Due: ${new Date(todo.dueDate).toLocaleDateString()}`);
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
                todo.completed = true;
                todo.progress = 100;
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
    
    if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
    } else {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
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

// Enhanced load function that includes theme loading
function initializeApp() {
    loadTheme(); // Load theme first
    loadTodos(); // Then load todos
}

// Load app when the page first loads
window.addEventListener('load', initializeApp);