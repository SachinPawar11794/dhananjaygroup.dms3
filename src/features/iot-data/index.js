import { supabase } from '../../config/supabase.js';

let _iotRefreshInterval = null;
/**
 * Format a date/time value as DD/MM/YYYY HH:MM:SS (24-hour)
 * Accepts anything parsable by Date (ISO string, timestamp). Returns empty string on invalid input.
 */
function formatDateTimeToDDMMYYYY_HHMMSS(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    const secs = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

function formatDateToDDMMYYYY(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function readField(obj, candidates = []) {
    for (const key of candidates) {
        if (obj == null) continue;
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined) return obj[key];
    }
    // try case-insensitive fallback
    const lowerMap = {};
    for (const k of Object.keys(obj || {})) lowerMap[k.toLowerCase()] = obj[k];
    for (const key of candidates) {
        const v = lowerMap[key.toLowerCase()];
        if (v !== undefined) return v;
    }
    return undefined;
}

async function loadAndRender(limit = 200) {
    const loading = document.getElementById('iotDataLoadingMessage');
    const table = document.getElementById('iotDataTable');
    const tbody = document.getElementById('iotDataTableBody');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    try {
        const { data, error } = await supabase
            .from('IoT Database')
            .select('*')
            .order('Timestamp', { ascending: false })
            .limit(limit);
        if (error) throw error;

        // Populate filter selects
        const plantSelect = document.getElementById('iotPlantFilter');
        const machineSelect = document.getElementById('iotMachineFilter');
        if (plantSelect) {
            const plants = Array.from(new Set((data || []).map(r => readField(r, ['Plant','plant'])))).filter(Boolean);
            plantSelect.innerHTML = '<option value="">All Plants</option>' + plants.map(p => `<option value="${p}">${p}</option>`).join('');
        }
        if (machineSelect) {
            const machines = Array.from(new Set((data || []).map(r => readField(r, ['Machine','machine','Machine No.'])))).filter(Boolean);
            machineSelect.innerHTML = '<option value="">All Machines</option>' + machines.map(m => `<option value="${m}">${m}</option>`).join('');
        }

        // Render rows
        tbody.innerHTML = '';
        (data || []).forEach(row => {
        const rawTimestamp = readField(row, ['Timestamp','timestamp','created_at']);
        const timestamp = formatDateTimeToDDMMYYYY_HHMMSS(rawTimestamp);
        const plant = readField(row, ['Plant','plant']) ?? '-';
        const partNo = readField(row, ['SAP Code/ Part No.','Part No.','part_no','sap_code']) ?? '-';
        const partName = readField(row, ['Part Name','part_name']) ?? '-';
        const operation = readField(row, ['Operation','operation']) ?? '-';
        const cycleTime = readField(row, ['Cycle Time','Cycle Time per Piece','cycle_time']) ?? '-';
        const partCount = readField(row, ['Part Count Per Cycle','Part Count','part_count']) ?? '-';
        const inspection = readField(row, ['Inspection Applicability','inspection']) ?? '-';
        const cellName = readField(row, ['Cell Name','cell_name']) ?? '-';
        const cellLeader = readField(row, ['Cell Leader','cell_leader']) ?? '-';
        const workStations = readField(row, ['No. of Workstations','Work Stations','workstations']) ?? '-';
        const mandays = readField(row, ['Mandays','mandays']) ?? '-';
        const toolCode = readField(row, ['Tool Code','tool_code']) ?? '-';
        const operatorCode = readField(row, ['Operator Code','operator_code']) ?? '-';
        const lossReasons = readField(row, ['Loss Reasons','Loss Reason','loss_reason']) ?? '-';
        const machineNo = readField(row, ['Machine No.','Machine','machine']) ?? '-';
        const value = readField(row, ['Value','value']) ?? '-';
            // archived is boolean in schema (column name: archived)
            const archivedRaw = readField(row, ['archived', 'archived', 'Archive Status', 'archive_status']);
            const archive = (archivedRaw === true || archivedRaw === 't' || archivedRaw === 'true') ? 'Yes' : (archivedRaw === false || archivedRaw === 'f' || archivedRaw === 'false' ? 'No' : '-');
            // additional useful fields (not shown in table headers) kept for debugging
            const shift = readField(row, ['Shift','shift']) || '-';
            const workDayDateRaw = readField(row, ['Work Day Date','Work Day Date','work_day_date']);
            const workDayDate = workDayDateRaw ? formatDateToDDMMYYYY(workDayDateRaw) : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${timestamp}</td>
                <td>${plant}</td>
                <td>${partNo}</td>
                <td>${partName}</td>
                <td>${operation}</td>
                <td>${cycleTime}</td>
                <td>${partCount}</td>
                <td>${inspection}</td>
                <td>${cellName}</td>
                <td>${cellLeader}</td>
                <td>${workStations}</td>
                <td>${mandays}</td>
                <td>${toolCode}</td>
                <td>${operatorCode}</td>
                <td>${lossReasons}</td>
                <td>${machineNo}</td>
                <td>${value}</td>
                <td>${archive}</td>
            `;
            tbody.appendChild(tr);
        });

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = (data && data.length) ? 'table' : 'none';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        console.error('IoT data load error', err);
        const errorEl = document.getElementById('iotDataErrorMessage');
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Failed to load IoT data'; }
    }
}

export async function initFeature(container = null) {
    await loadAndRender(200);
    // Attach simple filter handlers
    const plantSelect = document.getElementById('iotPlantFilter');
    const machineSelect = document.getElementById('iotMachineFilter');
    const clearBtn = document.getElementById('iotClearFiltersBtn');
    if (plantSelect) plantSelect.addEventListener('change', () => { loadAndRender(200); });
    if (machineSelect) machineSelect.addEventListener('change', () => { loadAndRender(200); });
    if (clearBtn) clearBtn.addEventListener('click', () => { plantSelect.value=''; machineSelect.value=''; loadAndRender(200); });

    // Auto-refresh IoT data every 10 seconds. Clear any previous interval first.
    try {
        if (_iotRefreshInterval) {
            clearInterval(_iotRefreshInterval);
            _iotRefreshInterval = null;
        }
        _iotRefreshInterval = setInterval(() => {
            // keep running even if page not visible; loadAndRender is idempotent
            loadAndRender(200).catch(err => console.error('IoT auto-refresh error', err));
        }, 10000);
    } catch (e) {
        console.error('Failed to start IoT auto-refresh', e);
    }
}

export function destroyFeature() {
    if (_iotRefreshInterval) {
        try { clearInterval(_iotRefreshInterval); } catch (e) {}
        _iotRefreshInterval = null;
    }
}


