    
    // --- Task Manager Logic ---


   
    // Utility
    function getTasks() {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    }
    function saveTasks(tasks) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.innerHTML = `<div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✅':type === 'update' ? '✏️' :type === 'info' ? '🔄' : type === 'error' ? '❌' : type === 'delete' ? '🗑️' : 'ℹ️' }</span>
            <span class="toast-message">${message}</span>
        </div>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
    }

    // Add this event listener
document.getElementById('filterStatus').addEventListener('change', renderTasks);

    


    function renderTasks() {
    const tasks = getTasks();
    const search = document.getElementById('searchTasks').value.toLowerCase();
    const status = document.getElementById('filterStatus').value; // status filter
    const priority = document.getElementById('filterPriority') ? document.getElementById('filterPriority').value : '';
    const sort = document.getElementById('sortTasks') ? document.getElementById('sortTasks').value : 'created';

    // Status filter
    let filtered = tasks;
    if (status === 'pending') filtered = tasks.filter(t => !t.completed);
    else if (status === 'completed') filtered = tasks.filter(t => t.completed);

    // Priority filter (if present)
    if (priority) filtered = filtered.filter(t => t.priority === priority);

    // Search
    if (search) {
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search))
        );
    }

    // Sorting
    const sortFn = {
        created: (a, b) => new Date(a.created) - new Date(b.created),
        title: (a, b) => a.title.localeCompare(b.title),
        priority: (a, b) => ['high','medium','low'].indexOf(a.priority) - ['high','medium','low'].indexOf(b.priority),
        dueDate: (a, b) => new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31')
    }[sort] || ((a, b) => 0);
    filtered.sort(sortFn);

    // Split filtered into incomplete and completed for rendering
    const incomplete = filtered.filter(t => !t.completed);
    const completed = filtered.filter(t => t.completed);

    // Render Active
    const incompleteEl = document.getElementById('incompleteTasks');
    incompleteEl.innerHTML = incomplete.length ? '' : `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">No active tasks</div></div>`;
    incomplete.forEach(task => incompleteEl.appendChild(createTaskItem(task)));

    // Render Completed
    const completedEl = document.getElementById('completedTasks');
    completedEl.innerHTML = completed.length ? '' : `<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">No completed tasks yet</div></div>`;
    completed.forEach(task => completedEl.appendChild(createTaskItem(task, true)));

    // Update counts
    document.getElementById('incompleteCount').textContent = incomplete.length;
    document.getElementById('completedCount').textContent = completed.length;

    // Update stats
    updateStats(tasks);
}

    function createTaskItem(task, isCompleted = false) {
        const div = document.createElement('div');
        div.className = `task-item priority-${task.priority} ${isCompleted ? '' : ''}`;
        div.draggable = true; // Make the task draggable
        div.dataset.id = task.id;
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        div.innerHTML = `
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="task-priority ${task.priority}-badge">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            </div>
            <div class="task-description">${task.description || ''}</div>
            <div class="task-meta">
                <span class="task-due-date ${getDueClass(task)}">${task.dueDate ? 'Due: ' + formatDate(task.dueDate) : 'No due date'}</span>
                <span class="task-created">Created: ${formatDate(task.created)}</span>
            </div>
            <div class="task-actions">
                
                <button class="btn btn-primary" onclick="editTask('${task.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        `;
        return div;
    }

    let draggedTaskId = null;

function handleDragStart(e) {
    draggedTaskId = this.dataset.id;
    this.classList.add('dragging');
}
function handleDragEnd(e) {
    draggedTaskId = null;
    this.classList.remove('dragging');
}

// Enable drop on both sections
['incompleteTasks', 'completedTasks'].forEach(listId => {
    const list = document.getElementById(listId);
    if (!list) return; // Safety check
    list.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });
    list.addEventListener('dragleave', function(e) {
        this.classList.remove('drag-over');
    });
    list.addEventListener('drop', function(e) {
        this.classList.remove('drag-over');
        if (!draggedTaskId) return;
        let tasks = getTasks();
        const idx = tasks.findIndex(t => t.id === draggedTaskId);
        if (idx > -1) {
            const toCompleted = listId === 'completedTasks';
            tasks[idx].completed = toCompleted;
            saveTasks(tasks);
            renderTasks();
            showToast(`Task moved to ${toCompleted ? 'Completed' : 'Incomplete'}`, 'info');
        }
    });
});

    function getDueClass(task) {
        if (!task.dueDate) return '';
        const today = new Date();
        const due = new Date(task.dueDate);
        if (due < today && !task.completed) return 'overdue';
        if (due.toDateString() === today.toDateString()) return 'due-today';
        if ((due - today) / (1000*60*60*24) <= 2) return 'due-soon';
        return '';
    }
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function updateStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
        const today = new Date().toDateString();
        const dueToday = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate).toDateString() === today).length;
        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completionRate').textContent = total ? Math.round(completed/total*100) + '%' : '0%';
        document.getElementById('overdueTasks').textContent = overdue;
        document.getElementById('dueTodayTasks').textContent = dueToday;
    }

    // --- CRUD Operations ---
    document.getElementById('taskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        if (!title) return showToast('Task title required', 'error');
        const task = {
            id: 't' + Date.now(),
            title,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            category: document.getElementById('taskCategory').value,
            description: document.getElementById('taskDescription').value,
            created: new Date().toISOString(),
            completed: false
        };
        const tasks = getTasks();
        tasks.push(task);
        saveTasks(tasks);
        showToast('Task Created!', 'success');
        this.reset();
        renderTasks();
    });

   

    window.deleteTask = function(id) {
        let tasks = getTasks();
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(tasks);
        showToast('Task deleted!', 'delete');
        renderTasks();
    };

    // --- Edit Modal Logic ---
    let editingId = null;
    window.editTask = function(id) {
        const tasks = getTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        editingId = id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskDueDate').value = task.dueDate || '';
        document.getElementById('editTaskCategory').value = task.category || '';
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editModal').classList.add('show');
    };
    document.getElementById('cancelEditBtn').onclick = function() {
        document.getElementById('editModal').classList.remove('show');
        editingId = null;
    };
    document.getElementById('editTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!editingId) return;
        const tasks = getTasks();
        const idx = tasks.findIndex(t => t.id === editingId);
        if (idx > -1) {
            tasks[idx].title = document.getElementById('editTaskTitle').value.trim();
            tasks[idx].priority = document.getElementById('editTaskPriority').value;
            tasks[idx].dueDate = document.getElementById('editTaskDueDate').value;
            tasks[idx].category = document.getElementById('editTaskCategory').value;
            tasks[idx].description = document.getElementById('editTaskDescription').value;
            saveTasks(tasks);
            showToast('Task updated!', 'update');
            document.getElementById('editModal').classList.remove('show');
            editingId = null;
            renderTasks();
        }
    });

    // --- Controls ---
    document.getElementById('searchTasks').addEventListener('input', renderTasks);
    
    document.getElementById('sortTasks').addEventListener('change', renderTasks);

     // --- Enhanced Search Bar Clear Button ---
    const searchInput = document.getElementById('searchTasks');
    const clearBtn = document.getElementById('clearSearchBtn');
    searchInput.addEventListener('input', function() {
        renderTasks();
        clearBtn.style.display = this.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        renderTasks();
    });




document.getElementById('darkModeToggle').onclick = function() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        showToast('Dark mode disabled', 'info');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Dark mode enabled', 'info');
    }
};

// Apply theme on page load
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
} else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
}


    // --- Initial Render ---
    renderTasks();
