import { TaskManagerService } from '../../services/taskManagerService.js';

// Minimal Task Manager feature bootstrap
let currentPage = 1;
let currentPageSize = 25;
let attachedListeners = [];

async function loadAndRender(page = 1) {
    const tableBody = document.getElementById('taskManagerTableBody');
    const loadingMessage = document.getElementById('taskManagerLoadingMessage');
    const table = document.getElementById('taskManagerTable');
    const paginationContainer = document.getElementById('taskManagerPageNumbers');
    const pageSizeSelect = document.getElementById('taskManagerPageSize');
    const searchInput = document.getElementById('taskManagerSearch');
    const plantSelect = document.getElementById('taskPlantFilter');
    const frequencySelect = document.getElementById('taskFrequencyFilter');
    const statusSelect = document.getElementById('taskStatusFilter');

    if (loadingMessage) loadingMessage.style.display = 'block';
    if (table) table.style.display = 'none';

    const filters = {
        plant: plantSelect?.value || undefined,
        frequency: frequencySelect?.value || undefined,
        status: statusSelect?.value || undefined,
        searchTerm: (searchInput?.value || '').trim()
    };

    try {
        const pageSize = parseInt(pageSizeSelect?.value || `${currentPageSize}`, 10) || currentPageSize;
        const { data, count } = await TaskManagerService.getAll(page, pageSize, filters);

        // render rows
        if (tableBody) {
            tableBody.innerHTML = '';
            (data || []).forEach((row) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.task_id || ''}</td>
                    <td>${row.plant || ''}</td>
                    <td>${row.name || ''}</td>
                    <td>${row.frequency || ''}</td>
                    <td>${row.task || ''}</td>
                    <td>${row.planned_date || ''}</td>
                    <td>${row.actual_date || ''}</td>
                    <td>${row.status || ''}</td>
                    <td>${row.remark || ''}</td>
                    <td><button class="btn-open-edit" data-id="${row.id}">Edit</button></td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // pagination simple rendering
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
            for (let p = 1; p <= totalPages; p++) {
                const btn = document.createElement('button');
                btn.className = 'pagination-btn';
                btn.textContent = `${p}`;
                if (p === page) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    currentPage = p;
                    loadAndRender(p);
                });
                paginationContainer.appendChild(btn);
            }
        }

        if (loadingMessage) loadingMessage.style.display = 'none';
        if (table) table.style.display = (data && data.length) ? 'table' : 'none';
    } catch (err) {
        if (loadingMessage) loadingMessage.style.display = 'none';
        const errorMessage = document.getElementById('taskManagerErrorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = err.message || 'Failed to load tasks';
        }
        console.error('Task Manager load error', err);
    }
}

function attachListeners() {
    const searchInput = document.getElementById('taskManagerSearch');
    const plantSelect = document.getElementById('taskPlantFilter');
    const frequencySelect = document.getElementById('taskFrequencyFilter');
    const statusSelect = document.getElementById('taskStatusFilter');
    const pageSizeSelect = document.getElementById('taskManagerPageSize');

    if (searchInput) {
        const handler = () => { currentPage = 1; loadAndRender(1); };
        searchInput.addEventListener('input', handler);
        attachedListeners.push({ el: searchInput, ev: 'input', fn: handler });
    }
    [plantSelect, frequencySelect, statusSelect].forEach((el) => {
        if (el) {
            const handler = () => { currentPage = 1; loadAndRender(1); };
            el.addEventListener('change', handler);
            attachedListeners.push({ el, ev: 'change', fn: handler });
        }
    });
    if (pageSizeSelect) {
        const handler = () => { currentPage = 1; loadAndRender(1); };
        pageSizeSelect.addEventListener('change', handler);
        attachedListeners.push({ el: pageSizeSelect, ev: 'change', fn: handler });
    }
}

function generateTaskId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `TASK-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function openEditModal(task) {
    const modalOverlay = document.getElementById('taskManagerModalOverlay');
    const form = document.getElementById('taskManagerForm');
    const titleEl = document.getElementById('taskManagerModalTitle');
    if (!modalOverlay || !form) return;
    titleEl && (titleEl.textContent = task ? 'Edit Task' : 'Add Task');
    form.reset();
    document.getElementById('tm_plant').value = task?.plant || '';
    document.getElementById('tm_name').value = task?.name || '';
    document.getElementById('tm_frequency').value = task?.frequency || '';
    document.getElementById('tm_task').value = task?.task || '';
    document.getElementById('tm_planned_date').value = task?.planned_date ? task.planned_date.slice(0,10) : '';
    document.getElementById('tm_remark').value = task?.remark || '';
    form.setAttribute('data-edit-id', task?.id || '');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    const modalOverlay = document.getElementById('taskManagerModalOverlay');
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function attachRowActions() {
    const tableBody = document.getElementById('taskManagerTableBody');
    if (!tableBody) return;
    const handler = async (e) => {
        const editBtn = e.target.closest('.btn-open-edit');
        if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            try {
                const task = await TaskManagerService.getById(id);
                openEditModal(task);
            } catch (err) {
                console.error(err);
            }
            return;
        }
        const delBtn = e.target.closest('.btn-delete-task');
        if (delBtn) {
            const id = delBtn.getAttribute('data-id');
            if (!id) return;
            if (confirm('Delete this task?')) {
                try {
                    await TaskManagerService.delete(id);
                    (window.showToast || console.log)('Task deleted', 'success');
                    loadAndRender(currentPage);
                } catch (err) {
                    console.error(err);
                    (window.showToast || console.error)('Failed to delete task', 'error');
                }
            }
            return;
        }
        const markBtn = e.target.closest('.btn-mark-complete');
        if (markBtn) {
            const id = markBtn.getAttribute('data-id');
            if (!id) return;
            try {
                await markTaskCompleted(id);
                (window.showToast || console.log)('Task marked completed', 'success');
                loadAndRender(currentPage);
            } catch (err) {
                console.error(err);
                (window.showToast || console.error)('Failed to update task', 'error');
            }
            return;
        }
    };
    tableBody.addEventListener('click', handler);
    attachedListeners.push({ el: tableBody, ev: 'click', fn: handler });
}

function attachFormHandlers() {
    const form = document.getElementById('taskManagerForm');
    const openBtn = document.getElementById('openTaskFormBtn');
    const cancelBtn = document.getElementById('cancelTaskManagerFormBtn');
    if (openBtn) {
        const handler = () => openEditModal(null);
        openBtn.addEventListener('click', handler);
        attachedListeners.push({ el: openBtn, ev: 'click', fn: handler });
    }
    if (cancelBtn) {
        const handler = (e) => { e.preventDefault(); closeEditModal(); };
        cancelBtn.addEventListener('click', handler);
        attachedListeners.push({ el: cancelBtn, ev: 'click', fn: handler });
    }
    if (form) {
        const submitHandler = async (e) => {
            e.preventDefault();
            const editId = form.getAttribute('data-edit-id') || '';
            const payloadBase = {
                plant: document.getElementById('tm_plant').value,
                name: document.getElementById('tm_name').value,
                frequency: document.getElementById('tm_frequency').value,
                task: document.getElementById('tm_task').value,
                planned_date: document.getElementById('tm_planned_date').value,
                remark: document.getElementById('tm_remark').value,
                status: 'Planned'
            };
            const submitBtn = document.getElementById('taskManagerSubmitBtn');
            const originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
            try {
                if (editId) {
                    await TaskManagerService.update(editId, payloadBase);
                    (window.showToast || console.log)('Task updated', 'success');
                } else {
                    // handle Daily expansion if frequency is Daily
                    const rows = [];
                    const baseTaskId = generateTaskId();
                    if (payloadBase.frequency === 'Daily') {
                        const startDate = new Date(payloadBase.planned_date);
                        for (let i = 0; i < 7; i++) {
                            const d = new Date(startDate);
                            d.setDate(d.getDate() + i);
                            rows.push({
                                ...payloadBase,
                                planned_date: d.toISOString().slice(0,10),
                                task_id: baseTaskId
                            });
                        }
                        // bulk insert via service: call create for each (TaskManagerService supports single insert)
                        for (const r of rows) {
                            await TaskManagerService.create(r);
                        }
                    } else {
                        await TaskManagerService.create({ ...payloadBase, task_id: generateTaskId() });
                    }
                    (window.showToast || console.log)('Task created', 'success');
                }
                closeEditModal();
                form.reset();
                await loadAndRender(currentPage);
            } catch (err) {
                console.error('Task save error', err);
                (window.showToast || console.error)('Failed to save task', 'error');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
            }
        };
        form.addEventListener('submit', submitHandler);
        attachedListeners.push({ el: form, ev: 'submit', fn: submitHandler });
    }
}

async function markTaskCompleted(id) {
    if (!id) return;
    try {
        const data = await TaskManagerService.getById(id);
        const today = new Date().toISOString().slice(0,10);
        await TaskManagerService.update(id, { status: 'Completed', actual_date: today });
        if (data.frequency === 'Daily') {
            const nextDate = new Date(data.planned_date || today);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextRow = {
                task_id: data.task_id || generateTaskId(),
                plant: data.plant,
                name: data.name,
                frequency: data.frequency,
                task: data.task,
                planned_date: nextDate.toISOString().slice(0,10),
                status: 'Planned',
                remark: data.remark || ''
            };
            await TaskManagerService.create(nextRow);
        }
    } catch (err) {
        throw err;
    }
}

export async function initFeature(containerElement = null, options = {}) {
    // containerElement corresponds to the existing DOM page element (taskManagerPage)
    currentPage = 1;
    currentPageSize = 25;
    attachedListeners = [];
    attachListeners();
    attachRowActions();
    attachFormHandlers();
    await loadAndRender(1);
}

export function destroyFeature() {
    // remove attached listeners
    attachedListeners.forEach(({ el, ev, fn }) => {
        try { el.removeEventListener(ev, fn); } catch (e) { /* ignore */ }
    });
    attachedListeners = [];
}


