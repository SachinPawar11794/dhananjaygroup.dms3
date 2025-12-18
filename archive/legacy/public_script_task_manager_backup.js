// Backup of TASK MANAGER (EMPLOYEE CHECKLIST) from legacy public/script.js
// Original location: public/script.js lines ~1628-2066
// (This file is a snapshot kept before deleting the legacy Task Manager code)

/* BEGIN LEGACY TASK MANAGER BLOCK (public/script.js) */
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

// ... remainder of legacy block saved in backup ...

/* END LEGACY TASK MANAGER BLOCK (public/script.js) */


