import { MachineSettingsService } from '../../services/machineSettingsService.js';
import { WorkCenterMasterService } from '../../services/workCenterMasterService.js';
import { supabase } from '../../config/supabase.js';
import { Modal } from '../../core/modal.js';
import { LossReasonService } from '../../services/lossReasonService.js';

let currentPage = 1;
let currentPageSize = 25;
let attached = [];
let processMasterData = [];
let partCombinedChoices = null;
let currentEditingSetting = null;
let lossReasonChoices = null;
let lossReasonData = [];

function formatTs(ts) {
    if (!ts) return '-';
    try {
        if (typeof formatTimestamp === 'function') return formatTimestamp(ts);
        return new Date(ts).toLocaleString();
    } catch (e) {
        return String(ts);
    }
}

// Helper to read multiple possible field names from objects returned by Supabase
function getField(obj, names) {
    for (const n of names) {
        if (!obj) continue;
        if (Object.prototype.hasOwnProperty.call(obj, n) && obj[n] !== null && obj[n] !== undefined) return obj[n];
        // also try lowercase/underscore variants
        const alt = n.replace(/\s+/g, '_').replace(/\./g, '').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(obj, alt) && obj[alt] !== null && obj[alt] !== undefined) return obj[alt];
    }
    return undefined;
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
                    .from('hourlyreport')
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
                    .from('iot_database')
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

        // Keep reference to current editing setting when modal opened externally
        currentEditingSetting = null;

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
    const plantSelect = document.getElementById('plant');
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

    // Plant -> Machine dependency for dropdowns
    if (plantSelect) {
        const h = async () => {
            const selectedPlant = plantSelect.value || null;
            try {
                await loadMachinesForPlant(selectedPlant);
            } catch (err) {
                console.error('Error loading machines for plant:', err);
            }
            const machineSelect = document.getElementById('machine');
            if (machineSelect && machineSelect.value) {
                const options = Array.from(machineSelect.options).map(opt => opt.value);
                if (!options.includes(machineSelect.value)) machineSelect.value = "";
            }
        };
        plantSelect.addEventListener('change', h);
        attached.push({el:plantSelect, ev:'change', fn:h});
    }
    // Machine -> update part choices and operations
    const machineSelect = document.getElementById('machine');
    if (machineSelect) {
        const mh = async () => {
            try {
                await initPartCombinedChoices();
            } catch (err) {
                console.error('Error initializing part choices on machine change:', err);
            }
            updateOperationDropdown();
            clearAutoPopulatedFields();
        };
        machineSelect.addEventListener('change', mh);
        attached.push({el:machineSelect, ev:'change', fn:mh});
    }
    // Operation -> auto-populate other fields
    const operationSelect = document.getElementById('operation');
    if (operationSelect) {
        const oh = () => {
            autoPopulateFromProcessMaster();
        };
        operationSelect.addEventListener('change', oh);
        attached.push({el:operationSelect, ev:'change', fn:oh});
    }

    // Settings form submit handler
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        const submitHandler = async (e) => {
            e.preventDefault();
            await submitSettingsForm();
        };
        settingsForm.addEventListener('submit', submitHandler);
        attached.push({ el: settingsForm, ev: 'submit', fn: submitHandler });
    }

    // Close / Cancel buttons in modal
    const cancelBtn = document.getElementById('cancelFormBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeHandler = () => {
        try {
            // Use Modal helper to close
            Modal.close('modalOverlay');
        } catch (err) {
            // fallback: manipulate classes directly
            if (modalOverlay) modalOverlay.classList.remove('active');
        }
        try { document.body.style.overflow = ''; } catch (e) {}
        const form = document.getElementById('settingsForm');
        if (form) form.reset();
        const editIdField = document.getElementById('settingsEditId');
        if (editIdField) editIdField.value = "";
        currentEditingSetting = null;
    };
    if (cancelBtn) { cancelBtn.addEventListener('click', closeHandler); attached.push({ el: cancelBtn, ev: 'click', fn: closeHandler }); }
    if (closeBtn) { closeBtn.addEventListener('click', closeHandler); attached.push({ el: closeBtn, ev: 'click', fn: closeHandler }); }
}

export async function initFeature(container = null, options = {}) {
    currentPage = 1;
    currentPageSize = 25;
    attached = [];
    attachListeners();
    // Load Process Master data (for Part choices) and Plant/Machine dropdowns for the settings form
    try { await loadProcessMasterData(); } catch (e) { console.debug('Failed to load Process Master data on init:', e); }
    try { await loadLossReasonDropdown(); } catch (e) { console.debug('Failed to load loss reasons on init:', e); }
    try { await loadPlantAndMachineDropdowns(); } catch (e) { console.debug('Failed to load plant/machine dropdowns on init:', e); }
    await loadAndRender(1);
}

// Load Plant dropdown and populate Machine dropdown for the selected plant
async function loadPlantAndMachineDropdowns() {
    try {
        const plantSelect = document.getElementById('plant');
        if (!plantSelect) return;

        // Fetch all work center rows and extract unique plants
        const rows = await WorkCenterMasterService.getAllWithoutPagination();
        const plantValues = (rows || []).map(r => r['Plant'] ?? r.Plant).filter(Boolean);
        const uniquePlants = Array.from(new Set(plantValues)).sort();

        const currentValue = plantSelect.value;
        plantSelect.innerHTML = '<option value="">Select Plant</option>';
        uniquePlants.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            plantSelect.appendChild(opt);
        });
        if (currentValue) plantSelect.value = currentValue;

        // Populate machine dropdown for current plant (or all IoT-enabled machines)
        await loadMachinesForPlant(plantSelect.value || null);
    } catch (err) {
        console.error('Error loading plant dropdowns:', err);
    }
}

// Load IoT-enabled machines (optionally filtered by plant) into Machine dropdown
async function loadMachinesForPlant(selectedPlant = null) {
    try {
        const data = await WorkCenterMasterService.getIoTEnabledMachines(selectedPlant || null);
        const machineSelect = document.getElementById('machine');
        if (!machineSelect) return;
        const currentValue = machineSelect.value;
        if (data && data.length > 0) {
            machineSelect.innerHTML = '<option value="">Select Machine</option>';
            data.forEach(item => {
                const value = item['Machine'] || item.Machine || '';
                const opt = document.createElement('option');
                opt.value = value;
                opt.textContent = value;
                machineSelect.appendChild(opt);
            });
            // Restore previous value if still present
            if (currentValue && data.some(item => (item['Machine'] || item.Machine) === currentValue)) {
                machineSelect.value = currentValue;
            } else {
                machineSelect.value = '';
            }
        } else {
            // Show informative placeholder when no machines
            if (selectedPlant) {
                machineSelect.innerHTML = '<option value="">No IoT-enabled machines found for selected plant</option>';
            } else {
                machineSelect.innerHTML = '<option value="">No IoT-enabled machines found</option>';
            }
        }
    } catch (err) {
        console.error('Error loading machines for plant:', err);
    }
}

// Load Process Master data for Parts/Operations and initialize Choices.js
async function loadProcessMasterData() {
    try {
        const { data, error } = await supabase
            .from('process_master')
            .select('*');
        if (error) throw error;
        processMasterData = data || [];
        await initPartCombinedChoices();
    } catch (err) {
        console.error('Error loading Process Master data:', err);
    }
}

// Load LossReason data and initialize searchable dropdown
async function loadLossReasonDropdown() {
    try {
        const selectEl = document.getElementById('loss_reason');
        if (!selectEl) return;

        // Fetch loss reasons (service handles ordering)
        lossReasonData = await LossReasonService.getAllWithoutPagination();

        const choices = (lossReasonData || []).map(r => {
            const label = r['Loss Reason'] || r.loss_reason || r.name || '';
            return { value: label, label };
        }).sort((a,b)=> a.label.localeCompare(b.label));
        // Always populate as a plain select (non-searchable) per request
        selectEl.innerHTML = '<option value="">Select Loss Reason</option>';
        choices.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.value;
            opt.textContent = c.label;
            selectEl.appendChild(opt);
        });
        // Restore selection when editing
        try {
            if (currentEditingSetting && currentEditingSetting.loss_reason) {
                selectEl.value = currentEditingSetting.loss_reason;
            }
        } catch (e) { console.debug('Failed to restore loss reason selection', e); }
    } catch (err) {
        console.error('Error loading LossReason dropdown:', err);
    }
}

// Initialize or update Choices.js for Part No. / Part Name field
async function initPartCombinedChoices() {
    try {
        const selectEl = document.getElementById('part_combined');
        if (!selectEl) return;

        // Build choices filtered by selected Plant only (not Machine)
        const selectedPlant = (document.getElementById('plant')?.value) || null;

        console.debug('initPartCombinedChoices: processMasterData length=', (processMasterData || []).length, 'selectedPlant=', selectedPlant);

        const filtered = (processMasterData || []).filter(item => {
            const plantVal = getField(item, ['Plant','plant']);
            if (selectedPlant && plantVal !== selectedPlant) return false;
            return true;
        });

        console.debug('initPartCombinedChoices: filtered Process Master rows=', filtered.length);

        // Create unique combinations of part no + part name
        const partMap = new Map();
        filtered.forEach(item => {
            const partNo = getField(item, ['Part No.','Part_No','PartNo','part_no']) || '';
            const partName = getField(item, ['Part Name','PartName','part_name']) || '';
            const key = `${partNo}|||${partName}`;
            if (!partMap.has(key) && (partNo || partName)) {
                partMap.set(key, { partNo, partName });
            }
        });

        const choices = Array.from(partMap.values())
            .sort((a, b) => {
                const aText = `${a.partNo} - ${a.partName}`;
                const bText = `${b.partNo} - ${b.partName}`;
                return aText.localeCompare(bText);
            })
            .map(({ partNo, partName }) => {
                const display = partNo && partName ? `${partNo} - ${partName}` : (partNo || partName);
                return { value: display, label: display };
            });

        // Ensure Choices.js is available globally (loaded via index.html)
        if (typeof Choices === 'undefined') {
            console.warn('Choices.js not found - part dropdown will be plain select');
            selectEl.innerHTML = '<option value="">Select Part No. / Part Name</option>';
            choices.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.value;
                opt.textContent = c.label;
                selectEl.appendChild(opt);
            });
            return;
        }

        if (!partCombinedChoices) {
            partCombinedChoices = new Choices(selectEl, {
                searchEnabled: true,
                shouldSort: false,
                itemSelectText: "",
                removeItemButton: false,
                placeholder: true,
                placeholderValue: "Select Part No. / Part Name",
            });
        }

        partCombinedChoices.clearChoices();
        partCombinedChoices.setChoices(
            [{ value: "", label: "Select Part No. / Part Name", selected: true, disabled: true }, ...choices],
            "value",
            "label",
            true
        );

        if (!choices || choices.length === 0) {
            // ensure user sees placeholder when no parts available for selected plant/machine
            selectEl.innerHTML = '<option value="">No parts available</option>';
        }

        // Restore current selection if editing
        try {
            if (currentEditingSetting) {
                applyPartCombinedSelection(currentEditingSetting);
            }
        } catch (err) {
            console.debug('applyPartCombinedSelection failed:', err);
        }

        // Setup change handler
        selectEl.removeEventListener?.('change', onPartCombinedChange);
        selectEl.addEventListener('change', onPartCombinedChange);
    } catch (err) {
        console.error('initPartCombinedChoices error:', err);
    }
}

function onPartCombinedChange(e) {
    try {
        const value = e.target.value;
        const partNoHidden = document.getElementById('part_no');
        const partNameHidden = document.getElementById('part_name');
        if (!value) {
            if (partNoHidden) partNoHidden.value = "";
            if (partNameHidden) partNameHidden.value = "";
            updateOperationDropdown();
            clearAutoPopulatedFields();
            return;
        }
        const [partNoRaw, ...rest] = value.split(' - ');
        const partNo = (partNoRaw || '').trim();
        const partName = rest.join(' - ').trim();
        if (partNoHidden) partNoHidden.value = partNo;
        if (partNameHidden) partNameHidden.value = partName;
        updateOperationDropdown();
        clearAutoPopulatedFields();
    } catch (err) {
        console.error('onPartCombinedChange error:', err);
    }
}

// Update Operation dropdown based on selected plant/machine/part
function updateOperationDropdown() {
    try {
        const operationSelect = document.getElementById('operation');
        if (!operationSelect || !processMasterData || processMasterData.length === 0) return;
        // Operation should be filtered by Plant + Part only (not Machine)
        const selectedPlant = document.getElementById('plant')?.value || null;
        const partNo = document.getElementById('part_no')?.value || null;
        const partName = document.getElementById('part_name')?.value || null;

        let filtered = processMasterData;
        if (selectedPlant) filtered = filtered.filter(i => getField(i, ['Plant','plant']) === selectedPlant);
        if (partNo) filtered = filtered.filter(i => getField(i, ['Part No.','Part_No','PartNo','part_no']) === partNo);
        if (partName) filtered = filtered.filter(i => getField(i, ['Part Name','PartName','part_name']) === partName);

        const ops = Array.from(new Set(filtered.map(i => getField(i, ['Operation','operation'])).filter(Boolean))).sort();

        const currentVal = operationSelect.value;
        operationSelect.innerHTML = '<option value="">Select Operation</option>';
        ops.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op;
            opt.textContent = op;
            operationSelect.appendChild(opt);
        });
        if (currentVal) operationSelect.value = currentVal;
    } catch (err) {
        console.error('updateOperationDropdown error:', err);
    }
}

// Auto-populate fields (cycle_time, inspection_applicability, cell_name, cell_leader, workstations, mandays) when possible
function autoPopulateFromProcessMaster() {
    try {
        if (!processMasterData || processMasterData.length === 0) return;
        // Auto-populate from Process Master using Plant + Part + Operation (do not depend on Machine)
        const selectedPlant = document.getElementById('plant')?.value || null;
        const partNo = document.getElementById('part_no')?.value || null;
        const partName = document.getElementById('part_name')?.value || null;
        const operation = document.getElementById('operation')?.value || null;

        let filtered = processMasterData;
        if (selectedPlant) filtered = filtered.filter(i => getField(i, ['Plant','plant']) === selectedPlant);
        if (partNo) filtered = filtered.filter(i => getField(i, ['Part No.','Part_No','PartNo','part_no']) === partNo);
        if (partName) filtered = filtered.filter(i => getField(i, ['Part Name','PartName','part_name']) === partName);
        if (operation) filtered = filtered.filter(i => getField(i, ['Operation','operation']) === operation);

        if (!filtered || filtered.length === 0) return;
        const src = filtered[0];
        const cycleTimeInput = document.getElementById('cycle_time');
        const inspectionInput = document.getElementById('inspection_applicability');
        const cellNameInput = document.getElementById('cell_name');
        const cellLeaderInput = document.getElementById('cell_leader');
        const workstationsInput = document.getElementById('workstations');
        const mandaysInput = document.getElementById('mandays');
        const partCountInput = document.getElementById('part_count_per_cycle');

        if (cycleTimeInput) cycleTimeInput.value = getField(src, ['Cycle Time per Piece','Cycle Time','cycle_time']) ?? "";
        if (inspectionInput) inspectionInput.value = getField(src, ['Inspection Applicability','inspection_applicability']) ?? "";
        if (cellNameInput) cellNameInput.value = getField(src, ['Cell Name','cell_name']) ?? "";
        if (cellLeaderInput) cellLeaderInput.value = getField(src, ['Cell Leader','cell_leader']) ?? "";
        if (workstationsInput) workstationsInput.value = getField(src, ['No. of Workstations','No_of_Workstations','workstations']) ?? "";
        if (mandaysInput) mandaysInput.value = getField(src, ['Mandays','mandays']) ?? "";
        // Part count per cycle - prefer "No. of Cavities in Tool" or "No_of_Cavities_in_Tool"
        if (partCountInput) {
            const partCountVal = getField(src, ['No. of Cavities in Tool','No_of_Cavities_in_Tool','No of Cavities in Tool','No. of Cavities','No_of_Cavities','no_of_cavities_in_tool']);
            if (partCountVal !== undefined && partCountVal !== null && partCountVal !== '') {
                partCountInput.value = partCountVal;
                partCountInput.setAttribute('readonly', 'readonly');
            }
        }
    } catch (err) {
        console.error('autoPopulateFromProcessMaster error:', err);
    }
}

function clearAutoPopulatedFields() {
    const fields = ['cycle_time','part_count_per_cycle','inspection_applicability','cell_name','cell_leader','workstations','mandays'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function applyPartCombinedSelection(setting) {
    try {
        if (!setting) return;
        const partNo = setting.part_no || setting['Part No.'] || '';
        const partName = setting.part_name || setting['Part Name'] || '';
        const display = partNo && partName ? `${partNo} - ${partName}` : (partNo || partName);
        if (partCombinedChoices && display) {
            partCombinedChoices.setChoiceByValue(display);
        } else {
            const sel = document.getElementById('part_combined');
            if (sel) sel.value = display;
        }
    } catch (err) {
        console.error('applyPartCombinedSelection error:', err);
    }
}

export function destroyFeature() {
    attached.forEach(({el,ev,fn})=>{ try{ el.removeEventListener(ev,fn);}catch(e){} });
    attached = [];
}

/**
 * Minimal fallback to open the settings edit modal in the modular app.
 * This mirrors the legacy `openEditSettingsModal` behavior enough for the edit button to work.
 * It is intentionally lightweight and only sets form field values and opens the modal overlay.
 */
async function openEditSettingsModal(setting = {}) {
    try {
        // remember editing setting for part dropdown restore
        currentEditingSetting = setting;
        const modalTitle = document.getElementById("settingsModalTitle");
        if (modalTitle) modalTitle.textContent = "Edit Machine Settings";

        // Basic form fields - set if present
        const editIdField = document.getElementById("settingsEditId");
        if (editIdField) editIdField.value = setting.id || "";

        const plantInput = document.getElementById("plant");
        const machineInput = document.getElementById("machine");
        const partNoHidden = document.getElementById("part_no");
        const partNameHidden = document.getElementById("part_name");
        const partCombinedInput = document.getElementById("part_combined");
        const operationInput = document.getElementById("operation");
        const cycleTimeInput = document.getElementById("cycle_time");

        // Ensure Plant and Machine dropdowns are loaded before setting values
        try {
            await loadPlantAndMachineDropdowns();
        } catch (e) {
            console.debug("Failed to pre-load plant/machine dropdowns:", e);
        }

        if (plantInput) plantInput.value = setting.plant || setting.Plant || "";
        if (machineInput) machineInput.value = setting['Machine No.'] || setting.machine || setting.Machine || "";
        if (partNoHidden) partNoHidden.value = setting.part_no || setting['Part No.'] || "";
        if (partNameHidden) partNameHidden.value = setting.part_name || setting['Part Name'] || "";
        if (partCombinedInput) partCombinedInput.value = `${partNoHidden?.value || ''} ${partNameHidden?.value || ''}`.trim();
        if (operationInput) operationInput.value = setting.operation || setting.Operation || "";
        if (cycleTimeInput) cycleTimeInput.value = setting.cycle_time ?? setting.cycleTime ?? "";

        // Re-initialize Part choices & operation list for the selected Plant+Machine+Part
        try { await initPartCombinedChoices(); } catch (e) { console.debug('initPartCombinedChoices failed during edit open:', e); }
        updateOperationDropdown();
        autoPopulateFromProcessMaster();
        // Ensure Loss Reason dropdown exists and restore selection
        try { await loadLossReasonDropdown(); } catch (e) { console.debug('loadLossReasonDropdown failed during edit open:', e); }
        // Populate remaining editable fields from existing setting if present
        const partCountInput = document.getElementById('part_count_per_cycle');
        const inspectionInput = document.getElementById('inspection_applicability');
        const cellNameInput = document.getElementById('cell_name');
        const cellLeaderInput = document.getElementById('cell_leader');
        const workstationsInput = document.getElementById('workstations');
        const mandaysInput = document.getElementById('mandays');
        const toolCodeInput = document.getElementById('tool_code');
        const operatorCodeInput = document.getElementById('operator_code');
        const lossReasonInput = document.getElementById('loss_reason');

        if (partCountInput) partCountInput.value = setting.part_count_per_cycle ?? setting['part_count_per_cycle'] ?? setting['No. of Cavities in Tool'] ?? "";
        if (inspectionInput) inspectionInput.value = setting.inspection_applicability ?? setting['Inspection Applicability'] ?? "";
        if (cellNameInput) cellNameInput.value = setting.cell_name ?? setting['Cell Name'] ?? "";
        if (cellLeaderInput) cellLeaderInput.value = setting.cell_leader ?? setting['Cell Leader'] ?? "";
        if (workstationsInput) workstationsInput.value = setting.workstations ?? setting['No. of Workstations'] ?? "";
        if (mandaysInput) mandaysInput.value = setting.mandays ?? setting['Mandays'] ?? "";
        if (toolCodeInput) toolCodeInput.value = setting.tool_code ?? setting['Tool Code'] ?? "";
        if (operatorCodeInput) operatorCodeInput.value = setting.operator_code ?? setting['Operator Code'] ?? "";
        if (lossReasonInput) lossReasonInput.value = setting.loss_reason ?? setting['Loss Reason'] ?? "";

        // Open modal using shared Modal helper
        Modal.open('modalOverlay');
        // Prevent background scroll while modal is open
        try { document.body.style.overflow = 'hidden'; } catch (e) { /* ignore */ }
    } catch (err) {
        console.error('openEditSettingsModal (modular) failed', err);
    }
}

// Expose on window for legacy callers and for the code that checks `window.openEditSettingsModal`
if (typeof window !== 'undefined' && typeof window.openEditSettingsModal !== 'function') {
    window.openEditSettingsModal = openEditSettingsModal;
}

// Submit settings form (create or update)
async function submitSettingsForm() {
    const submitBtn = document.querySelector('#modalOverlay .btn-submit') || document.querySelector('.btn-submit');
    const originalText = submitBtn ? submitBtn.textContent : null;
    const editId = document.getElementById("settingsEditId")?.value || "";
    const isEdit = !!editId;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = isEdit ? "Updating..." : "Saving...";
        }

        const machine = document.getElementById("machine")?.value || "";
        // Enforce Loss Reason required (form prevents native validation in modular flow)
        const lossReasonRaw = document.getElementById("loss_reason")?.value?.trim();
        if (!lossReasonRaw) {
            if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
                window.showToast('Please enter Loss Reason', 'error');
            } else {
                alert('Please enter Loss Reason');
            }
            const lrEl = document.getElementById("loss_reason");
            try { if (lrEl) lrEl.focus(); } catch (e) {}
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText || (isEdit ? 'Save Settings' : 'Save Settings'); }
            return;
        }
        // Build payload and coerce numeric fields to their proper types (or null)
        const cycleTimeRaw = document.getElementById("cycle_time")?.value;
        const partCountRaw = document.getElementById("part_count_per_cycle")?.value;
        const workstationsRaw = document.getElementById("workstations")?.value;
        const mandaysRaw = document.getElementById("mandays")?.value;

        const data = {
            plant: document.getElementById("plant")?.value || null,
            "Machine No.": machine || null,
            part_no: document.getElementById("part_no")?.value || null,
            part_name: document.getElementById("part_name")?.value || null,
            operation: document.getElementById("operation")?.value || null,
            cycle_time: cycleTimeRaw !== undefined && cycleTimeRaw !== "" ? Number(cycleTimeRaw) : null,
            part_count_per_cycle: partCountRaw !== undefined && partCountRaw !== "" ? Number(partCountRaw) : null,
            inspection_applicability: document.getElementById("inspection_applicability")?.value || null,
            cell_name: document.getElementById("cell_name")?.value || null,
            cell_leader: document.getElementById("cell_leader")?.value || null,
            workstations: workstationsRaw !== undefined && workstationsRaw !== "" ? Number(workstationsRaw) : null,
            mandays: mandaysRaw !== undefined && mandaysRaw !== "" ? Number(mandaysRaw) : null,
            tool_code: document.getElementById("tool_code")?.value || null,
            operator_code: document.getElementById("operator_code")?.value || null,
            loss_reason: document.getElementById("loss_reason")?.value || null
        };

        // If editing by id, perform update; otherwise UPSERT by plant + Machine No. to preserve legacy behavior
        let result;
        if (isEdit) {
            result = await supabase
                .from('settings')
                .update(data)
                .eq('id', parseInt(editId, 10))
                .select()
                .single();
        } else {
            // Use .select().single() to return a single object instead of an array
            result = await supabase
                .from('settings')
                .upsert(data, { onConflict: 'plant,"Machine No."' })
                .select()
                .single();
        }

        if (result.error) throw result.error;
        // Normalize numeric fields returned as strings to numbers for UI consistency
        const savedRow = result.data || result;
        const numericFields = ['cycle_time', 'part_count_per_cycle', 'workstations', 'mandays', 'target_count', 'actual_count'];
        numericFields.forEach(field => {
            if (savedRow && savedRow[field] !== undefined && savedRow[field] !== null && typeof savedRow[field] === 'string') {
                const n = Number(savedRow[field]);
                if (!Number.isNaN(n)) savedRow[field] = n;
            }
        });

        // Show success toast if available
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast(isEdit ? 'Settings updated successfully!' : 'Settings saved successfully!', 'success');
        } else {
            console.log(isEdit ? 'Settings updated' : 'Settings saved', savedRow);
        }

        // Close modal and reset
        try {
            Modal.close('modalOverlay');
            document.body.style.overflow = '';
            const form = document.getElementById('settingsForm');
            if (form) form.reset();
            document.getElementById("settingsEditId").value = "";
        } catch (err) { /* ignore */ }

        // Refresh table
        await loadAndRender(currentPage || 1);

        // Feedback
    } catch (err) {
        console.error('Error saving settings (modular):', err);
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast('Error saving settings: ' + (err.message || err), 'error');
        } else {
            alert('Error saving settings: ' + (err.message || err));
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText || (isEdit ? 'Save Settings' : 'Save Settings');
        }
    }
}


