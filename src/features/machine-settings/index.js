import { MachineSettingsService } from '../../services/machineSettingsService.js';
import { WorkCenterMasterService } from '../../services/workCenterMasterService.js';
import { supabase } from '../../config/supabase.js';

let currentPage = 1;
let currentPageSize = 25;
let attached = [];

function formatTs(ts) {
    if (!ts) return '-';
    try {
        if (typeof formatTimestamp === 'function') return formatTimestamp(ts);
        return new Date(ts).toLocaleString();
    } catch (e) {
        return String(ts);
    }
}

async function loadAndRender(page = 1) {
    const loading = document.getElementById('loadingMessage');
    const table = document.getElementById('settingsTable');
    const tableBody = document.getElementById('settingsTableBody');
    const errorEl = document.getElementById('errorMessage');
    const empty = document.getElementById('emptyMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    try {
        // Fetch all settings (we'll group by machine and paginate client-side to match legacy)
        const allData = await MachineSettingsService.getAllWithoutPagination();

        // Get IoT-enabled machines
        let validMachines = new Set();
        try {
            const machines = await WorkCenterMasterService.getIoTEnabledMachines();
            if (machines && machines.length) {
                machines.forEach(m => {
                    const name = m['Machine'] || m.Machine;
                    if (name) validMachines.add(name);
                });
            }
        } catch (e) {
            console.warn('Failed to load IoT-enabled machines:', e);
        }

        // Get current work day and shift from settings table (if present)
        let currentWorkDay = null;
        let currentShift = null;
        try {
            const { data: cur, error } = await supabase
                .from('settings')
                .select('current_shift, current_work_day')
                .not('current_shift', 'is', null)
                .not('current_work_day', 'is', null)
                .limit(1);
            if (!error && cur && cur.length) {
                currentWorkDay = cur[0].current_work_day;
                currentShift = cur[0].current_shift;
            }
        } catch (e) {
            console.warn('Unable to read current work day/shift from settings', e);
        }

        // Aggregate HourlyReport and IoT Database counts for the currentWorkDay (if available)
        const countsMap = new Map();
        if (currentWorkDay) {
            try {
                const { data: hourlyRows } = await supabase
                    .from('HourlyReport')
                    .select('Plant,"Machine No.","Part No.","Operation","Hourly Target","Work Day Date","Shift"')
                    .eq('Work Day Date', currentWorkDay);
                if (hourlyRows && hourlyRows.length) {
                    hourlyRows.forEach(row => {
                        if (currentShift && row?.Shift && row.Shift !== currentShift) return;
                        const key = [row?.Plant, row?.['Machine No.'], row?.['Part No.'], row?.Operation].map(v => (v||'').toString().toLowerCase()).join('__');
                        const target = Number(row?.['Hourly Target']) || 0;
                        if (!countsMap.has(key)) countsMap.set(key, { target: 0, actual: 0 });
                        countsMap.get(key).target += target;
                    });
                }
            } catch (e) {
                console.warn('HourlyReport aggregation failed', e);
            }

            try {
                const { data: iotRows } = await supabase
                    .from('IoT Database')
                    .select('Plant,"Machine No.","Part No.","Operation","Value","Work Day Date","Shift"')
                    .eq('Work Day Date', currentWorkDay);
                if (iotRows && iotRows.length) {
                    iotRows.forEach(row => {
                        if (currentShift && row?.Shift && row.Shift !== currentShift) return;
                        const key = [row?.Plant, row?.['Machine No.'], row?.['Part No.'], row?.Operation].map(v => (v||'').toString().toLowerCase()).join('__');
                        const actual = Number(row?.Value) || 0;
                        if (!countsMap.has(key)) countsMap.set(key, { target: 0, actual: 0 });
                        countsMap.get(key).actual += actual;
                    });
                }
            } catch (e) {
                console.warn('IoT Database aggregation failed', e);
            }
        }

        // Filter settings to IoT-enabled machines (if list exists)
        const filteredData = (allData || []).filter(s => {
            const machine = s['Machine No.'] || s.machine;
            if (!machine) return false;
            if (validMachines.size > 0) return validMachines.has(machine);
            return true;
        });

        // Debug: log a sample setting and available fields to help diagnose missing columns
        if (filteredData && filteredData.length > 0) {
            try {
                console.debug('machine-settings: sample setting keys:', Object.keys(filteredData[0]));
                console.debug('machine-settings: sample setting object:', filteredData[0]);
            } catch (e) {
                /* ignore logging errors */
            }
        } else {
            console.debug('machine-settings: no filtered settings returned (filteredData length=', (filteredData || []).length, ')');
        }

        // Group by machine and pick latest per machine
        const machineMap = new Map();
        filteredData.forEach(s => {
            const machine = (s['Machine No.'] || s.machine || '').toString();
            if (!machine) return;
            const existing = machineMap.get(machine);
            if (!existing) {
                machineMap.set(machine, s);
            } else {
                const exTs = existing.timestamp ? new Date(existing.timestamp) : null;
                const sTs = s.timestamp ? new Date(s.timestamp) : null;
                if ((!exTs && sTs) || (exTs && sTs && sTs > exTs)) {
                    machineMap.set(machine, s);
                }
            }
        });

        const uniqueData = Array.from(machineMap.values());

        // Client-side paginate uniqueData
        const pageSize = parseInt(document.getElementById('settingsPageSize')?.value || `${currentPageSize}`, 10) || currentPageSize;
        const totalItems = uniqueData.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const p = Math.min(Math.max(1, page), totalPages);
        const from = (p - 1) * pageSize;
        const paginated = uniqueData.slice(from, from + pageSize);

        // Helper to read multiple possible field names from setting row
        const readField = (obj, names) => {
            for (const n of names) {
                if (obj && Object.prototype.hasOwnProperty.call(obj, n) && obj[n] !== null && obj[n] !== undefined) return obj[n];
            }
            return undefined;
        };

        // Render rows
        if (tableBody) {
            tableBody.innerHTML = '';
            paginated.forEach(setting => {
                const machineVal = readField(setting, ['Machine No.', 'Machine', 'machine', 'machine_no']);
                const plantVal = readField(setting, ['plant', 'Plant']);
                const partNoVal = readField(setting, ['part_no', 'Part No.', 'PartNo']);
                const operationVal = readField(setting, ['operation', 'Operation']);

                const key = [plantVal, machineVal, partNoVal, operationVal].map(v => (v||'').toString().toLowerCase()).join('__');
                const agg = countsMap.get(key) || { target: null, actual: null };
                const toolCodeVal = readField(setting, ['tool_code', 'Tool Code', 'toolCode']);
                const operatorCodeVal = readField(setting, ['operator_code', 'Operator Code', 'operatorCode']);
                const lossReasonVal = readField(setting, ['loss_reason', 'Loss Reason', 'lossReason']);
                const targetFallback = readField(setting, ['target_count', 'Target Count', 'targetCount', 'target']) ?? agg.target;
                const actualFallback = readField(setting, ['actual_count', 'Actual Count', 'actualCount', 'actual']) ?? agg.actual;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${readField(setting, ['id']) || '-'}</td>
                    <td>${formatTs(readField(setting, ['timestamp', 'created_at']))}</td>
                    <td>${plantVal || '-'}</td>
                    <td>${machineVal || '-'}</td>
                    <td>${partNoVal || '-'}</td>
                    <td>${readField(setting, ['part_name', 'Part Name']) || '-'}</td>
                    <td>${operationVal || '-'}</td>
                    <td>${readField(setting, ['cycle_time']) || '-'}</td>
                    <td>${readField(setting, ['part_count_per_cycle']) || '-'}</td>
                    <td>${readField(setting, ['inspection_applicability']) || '-'}</td>
                    <td>${readField(setting, ['cell_name']) || '-'}</td>
                    <td>${readField(setting, ['cell_leader']) || '-'}</td>
                    <td>${readField(setting, ['workstations']) || '-'}</td>
                    <td>${readField(setting, ['mandays']) || '-'}</td>
                    <td>${toolCodeVal || '-'}</td>
                    <td>${operatorCodeVal || '-'}</td>
                    <td>${lossReasonVal || '-'}</td>
                    <td>${targetFallback !== null && targetFallback !== undefined ? targetFallback : '-'}</td>
                    <td>${actualFallback !== null && actualFallback !== undefined ? actualFallback : '-'}</td>
                    <td><button class="btn-edit" data-id="${readField(setting, ['id'])}">✏️</button></td>
                `;
                tableBody.appendChild(tr);
                tr.querySelector('.btn-edit')?.addEventListener('click', () => {
                    if (typeof window.openEditSettingsModal === 'function') window.openEditSettingsModal(setting);
                });
            });
        }

        // Update pagination UI
        const paginationInfo = document.getElementById('settingsPaginationInfo');
        const prevBtn = document.getElementById('settingsPrevBtn');
        const nextBtn = document.getElementById('settingsNextBtn');
        const pageNumbers = document.getElementById('settingsPageNumbers');
        if (paginationInfo) paginationInfo.textContent = `Showing ${from+1}-${Math.min(from+pageSize, totalItems)} of ${totalItems}`;
        if (prevBtn) prevBtn.disabled = p <= 1;
        if (nextBtn) nextBtn.disabled = p >= totalPages;
        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            for (let i=1;i<=totalPages;i++){
                const btn = document.createElement('button');
                btn.className = 'pagination-page ' + (i===p ? 'active' : '');
                btn.textContent = i;
                btn.addEventListener('click', ()=> loadAndRender(i));
                pageNumbers.appendChild(btn);
            }
        }

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = (paginated && paginated.length) ? 'table' : 'none';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Error loading machine settings'; }
        console.error('Machine Settings load error', err);
    }
}

function attachListeners() {
    const prevBtn = document.getElementById('settingsPrevBtn');
    const nextBtn = document.getElementById('settingsNextBtn');
    const pageSize = document.getElementById('settingsPageSize');
    if (prevBtn) {
        const h = () => {
            const statePage = currentPage > 1 ? currentPage - 1 : 1;
            currentPage = statePage;
            loadAndRender(currentPage);
        };
        prevBtn.addEventListener('click', h);
        attached.push({el:prevBtn, ev:'click', fn:h});
    }
    if (nextBtn) {
        const h = () => {
            currentPage = currentPage + 1;
            loadAndRender(currentPage);
        };
        nextBtn.addEventListener('click', h);
        attached.push({el:nextBtn, ev:'click', fn:h});
    }
    if (pageSize) {
        const h = () => { currentPage = 1; loadAndRender(1); };
        pageSize.addEventListener('change', h);
        attached.push({el:pageSize, ev:'change', fn:h});
    }
}

export async function initFeature(container = null, options = {}) {
    currentPage = 1;
    currentPageSize = 25;
    attached = [];
    attachListeners();
    await loadAndRender(1);
}

export function destroyFeature() {
    attached.forEach(({el,ev,fn})=>{ try{ el.removeEventListener(ev,fn);}catch(e){} });
    attached = [];
}


