// Backup of TASK MANAGER (EMPLOYEE CHECKLIST) from legacy script.js
// Original location: script.js lines ~1158-1596
// (This file is a snapshot kept before deleting the legacy Task Manager code)

/* BEGIN LEGACY TASK MANAGER BLOCK */
// ============================
// TASK MANAGER (EMPLOYEE CHECKLIST)
// ============================

// Load Task Manager table with pagination and search
async function loadTaskManagerTable(page = 1) {
    const tableBody = document.getElementById("taskManagerTableBody");
    const loadingMessage = document.getElementById("taskManagerLoadingMessage");
    const table = document.getElementById("taskManagerTable");
    const pagination = document.getElementById("taskManagerPagination");
    const emptyMessage = document.getElementById("taskManagerEmptyMessage");
    const errorMessage = document.getElementById("taskManagerErrorMessage");
    const totalEl = document.getElementById("taskTotalCount");
    const openEl = document.getElementById("taskOpenCount");
    const overdueEl = document.getElementById("taskOverdueCount");

    if (!window.supabase) return;

    if (loadingMessage) loadingMessage.style.display = "block";
    if (table) table.style.display = "none";
    if (pagination) pagination.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "none";
    if (errorMessage) errorMessage.style.display = "none";

    try {
        const pageSize = paginationState.taskManager.pageSize;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const searchTerm = (paginationState.taskManager.searchTerm || "").trim().toLowerCase();
        const plantFilter = (paginationState.taskManager.plantFilter || "").trim();
        const frequencyFilter = (paginationState.taskManager.frequencyFilter || "").trim();
        const statusFilter = (paginationState.taskManager.statusFilter || "").trim();

        let query = window.supabase
            .from("TaskManager")
            .select("*", { count: "exact" })
            .order("planned_date", { ascending: true });

        const { data, error, count } = await query.range(from, to);

        if (error) {
            throw error;
        }

        // Populate Plant filter options from data (all plants)
        const plantSelect = document.getElementById("taskPlantFilter");
        if (plantSelect && data) {
            const plants = [...new Set(data.map((row) => row.plant).filter(Boolean))].sort();
            const currentPlant = paginationState.taskManager.plantFilter || "";
            plantSelect.innerHTML = '<option value="">All Plants</option>';
            plants.forEach((p) => {
                const opt = document.createElement("option");
                opt.value = p;
                opt.textContent = p;
                plantSelect.appendChild(opt);
            });
            plantSelect.value = currentPlant;
        }

        // Client-side filters & search (small dataset assumption)
        let filtered = data || [];
        if (plantFilter) {
            filtered = filtered.filter((row) => row.plant === plantFilter);
        }
        if (frequencyFilter) {
            filtered = filtered.filter((row) => row.frequency === frequencyFilter);
        }
        if (statusFilter) {
            filtered = filtered.filter((row) => row.status === statusFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter((row) => {
                const fields = [
                    row.task_id,
                    row.plant,
                    row.name,
                    row.frequency,
                    row.task,
                    row.status,
                    row.remark,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return fields.includes(searchTerm);
            });
        }

        paginationState.taskManager.totalItems = count || filtered.length || 0;
        paginationState.taskManager.totalPages =
            Math.ceil((paginationState.taskManager.totalItems || 0) / pageSize) || 1;
        paginationState.taskManager.currentPage = page;

        if (loadingMessage) loadingMessage.style.display = "none";

        // Summary counts (on filtered set)
        const totalTasks = filtered.length;
        const openTasks = filtered.filter((row) => row.status === "Planned").length;
        const overdueTasks = filtered.filter((row) => {
            if (!row.planned_date) return false;
            const d = new Date(row.planned_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            return d < today && row.status !== "Completed" && row.status !== "Cancelled";
        }).length;
        if (totalEl) totalEl.textContent = totalTasks;
        if (openEl) openEl.textContent = openTasks;
        if (overdueEl) overdueEl.textContent = overdueTasks;

        if (!filtered || filtered.length === 0) {
            if (tableBody) tableBody.innerHTML = "";
            if (table) table.style.display = "none";
            if (emptyMessage) emptyMessage.style.display = "block";
            return;
        }

        if (tableBody) {
            tableBody.innerHTML = "";

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            filtered.forEach((item) => {
                const row = document.createElement("tr");

                // Determine overdue flag
                let isOverdue = false;
                if (item.planned_date && item.status !== "Completed" && item.status !== "Cancelled") {
                    const d = new Date(item.planned_date);
                    d.setHours(0, 0, 0, 0);
                    if (d < today) isOverdue = true;
                }
                if (isOverdue) {
                    row.classList.add("task-row-overdue");
                }

                const status = item.status || "-";
                let statusClass = "status-planned";
                if (status === "Completed") statusClass = "status-completed";
                else if (status === "Cancelled") statusClass = "status-cancelled";
                else if (isOverdue) statusClass = "status-overdue";

                const frequency = item.frequency || "-";

                row.innerHTML = `
                    <td>${item.task_id || "-"}</td>
                    <td>${item.plant || "-"}</td>
                    <td>${item.name || "-"}</td>
                    <td><span class="frequency-badge">${frequency}</span></td>
                    <td>${item.task || "-"}</td>
                    <td>${item.planned_date ? formatDateOnly(item.planned_date) : "-"}</td>
                    <td>${item.actual_date ? formatDateOnly(item.actual_date) : "-"}</td>
                    <td>
                        <select class="task-status-select" data-id="${item.id}">
                            <option value="Planned" ${status === "Planned" ? "selected" : ""}>Planned</option>
                            <option value="Completed" ${status === "Completed" ? "selected" : ""}>Completed</option>
                            <option value="Cancelled" ${status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                            <option value="Overdue" ${status === "Overdue" ? "selected" : ""}>Overdue</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="task-remark-input" data-id="${item.id}" value="${(item.remark || "").replace(/"/g, "&quot;")}" />
                    </td>
                    <td>
                        <button class="btn-small" data-action="save" data-id="${item.id}">Save</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Attach action handlers (save status & remark)
            tableBody.querySelectorAll("button[data-action='save']").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    const statusSelect = tableBody.querySelector(`select.task-status-select[data-id="${id}"]`);
                    const remarkInput = tableBody.querySelector(`input.task-remark-input[data-id="${id}"]`);
                    if (!statusSelect || !remarkInput) return;

                    const newStatus = statusSelect.value;
                    const newRemark = remarkInput.value.trim();

                    try {
                        const { error } = await window.supabase
                            .from("TaskManager")
                            .update({
                                status: newStatus,
                                remark: newRemark,
                            })
                            .eq("id", id);

                        if (error) throw error;
                        showToast("Task updated successfully", "success");
                        loadTaskManagerTable(paginationState.taskManager.currentPage || 1);
                    } catch (err) {
                        console.error("Error updating task:", err);
                        showToast("Error updating task: " + err.message, "error");
                    }
                });
            });
        }

        if (table) table.style.display = "table";
        if (pagination) {
            pagination.style.display = "flex";
            updateTaskManagerPagination();
        }
    } catch (error) {
        console.error("Error loading Task Manager data:", error);
        if (loadingMessage) loadingMessage.style.display = "none";
        if (errorMessage) {
            errorMessage.textContent = "Error loading tasks: " + error.message;
            errorMessage.style.display = "block";
        }
    }
}

// Simple date formatter (YYYY-MM-DD to DD/MM/YYYY)
function formatDateOnly(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    
    // Format date in IST timezone
    const istDateStr = d.toLocaleString("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    
    // If already in DD/MM/YYYY format, return as is
    if (istDateStr.includes('/')) {
        return istDateStr;
    }
    
    // Fallback: manual formatting using IST date components
    const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = String(istDate.getDate()).padStart(2, "0");
    const month = String(istDate.getMonth() + 1).padStart(2, "0");
    const year = istDate.getFullYear();
    return `${day}/${month}/${year}`;
}

// Update Task Manager pagination UI
function updateTaskManagerPagination() {
    const state = paginationState.taskManager;
    const prevBtn = document.getElementById("taskManagerPrevBtn");
    const nextBtn = document.getElementById("taskManagerNextBtn");
    const pageNumbers = document.getElementById("taskManagerPageNumbers");
    const paginationInfo = document.getElementById("taskManagerPaginationInfo");

    if (prevBtn) prevBtn.disabled = state.currentPage === 1;
    if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;

    if (paginationInfo) {
        const from = state.totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
        const to = Math.min(state.currentPage * state.pageSize, state.totalItems);
        paginationInfo.textContent = `Showing ${from}-${to} of ${state.totalItems} entries`;
    }

    if (pageNumbers) {
        pageNumbers.innerHTML = "";
        const maxPages = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(state.totalPages, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.className = `pagination-page ${i === state.currentPage ? "active" : ""}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener("click", () => loadTaskManagerTable(i));
            pageNumbers.appendChild(pageBtn);
        }
    }
}

// Generate a simple Task ID based on timestamp
function generateTaskId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `TASK-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

// Handle Task form submission (create daily/other tasks with minimal automation)
async function handleTaskFormSubmit(event) {
    event.preventDefault();

    const plant = document.getElementById("tm_plant").value.trim();
    const name = document.getElementById("tm_name").value.trim();
    const frequency = document.getElementById("tm_frequency").value;
    const taskText = document.getElementById("tm_task").value.trim();
    const plannedDateInput = document.getElementById("tm_planned_date").value;
    const remark = document.getElementById("tm_remark").value.trim();

    if (!plant || !name || !frequency || !taskText || !plannedDateInput) {
        showToast("Please fill in all required fields", "error");
        return;
    }

    const modalOverlay = document.getElementById("taskManagerModalOverlay");
    const submitBtn = document.getElementById("taskManagerSubmitBtn");
    const originalText = submitBtn ? submitBtn.textContent : "";

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
    }

    try {
        const baseTaskId = generateTaskId();
        const startDate = new Date(plannedDateInput);
        if (Number.isNaN(startDate.getTime())) {
            throw new Error("Invalid planned date");
        }

        // Build rows to insert
        const rows = [];

        if (frequency === "Daily") {
            // Plan next 7 days automatically as best-practice starter horizon
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                rows.push({
                    task_id: baseTaskId,
                    plant,
                    name,
                    frequency,
                    task: taskText,
                    planned_date: d.toISOString().slice(0, 10),
                    status: "Planned",
                    remark,
                });
            }
        } else {
            rows.push({
                task_id: baseTaskId,
                plant,
                name,
                frequency,
                task: taskText,
                planned_date: startDate.toISOString().slice(0, 10),
                status: "Planned",
                remark,
            });
        }

        const { error } = await window.supabase.from("TaskManager").insert(rows);
        if (error) {
            throw error;
        }

        showToast("Task(s) created successfully", "success");

        if (modalOverlay) {
            modalOverlay.classList.remove("active");
            document.body.style.overflow = "";
        }
        const form = document.getElementById("taskManagerForm");
        if (form) form.reset();

        loadTaskManagerTable(1);
    } catch (err) {
        console.error("Error saving task:", err);
        showToast("Error saving task: " + err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Mark task completed and (for daily tasks) auto-plan next occurrence
async function markTaskCompleted(id) {
    if (!id) return;

    try {
        // Fetch existing row
        const { data, error } = await window.supabase
            .from("TaskManager")
            .select("*")
            .eq("id", id)
            .single();
        if (error) throw error;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        // Update this entry to Completed
        const { error: updateError } = await window.supabase
            .from("TaskManager")
            .update({
                status: "Completed",
                actual_date: todayStr,
            })
            .eq("id", id);
        if (updateError) throw updateError;

        // If this is a Daily task, create next day's planned entry
        if (data.frequency === "Daily") {
            const nextDate = new Date(data.planned_date || todayStr);
            nextDate.setDate(nextDate.getDate() + 1);

            const nextRow = {
                task_id: data.task_id || generateTaskId(),
                plant: data.plant,
                name: data.name,
                frequency: data.frequency,
                task: data.task,
                planned_date: nextDate.toISOString().slice(0, 10),
                status: "Planned",
                remark: data.remark || "",
            };

            const { error: insertError } = await window.supabase
                .from("TaskManager")
                .insert(nextRow);
            if (insertError) throw insertError;
        }

        showToast("Task updated successfully", "success");
        loadTaskManagerTable(paginationState.taskManager.currentPage || 1);
    } catch (err) {
        console.error("Error completing task:", err);
        showToast("Error completing task: " + err.message, "error");
    }
}

/* END LEGACY TASK MANAGER BLOCK */


