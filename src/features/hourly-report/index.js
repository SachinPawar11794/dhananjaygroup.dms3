import { supabase } from '../../config/supabase.js';

let _attached = [];

function readField(obj, candidates = []) {
    for (const key of candidates) {
        if (obj == null) continue;
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined) return obj[key];
    }
    // case-insensitive fallback
    for (const k of Object.keys(obj || {})) {
        const low = k.toLowerCase();
        for (const candidate of candidates) {
            if (candidate.toLowerCase() === low) return obj[k];
        }
    }
    return undefined;
}

// Archive Config Modal helpers
function ensureArchiveConfigModal() {
    if (document.getElementById('archiveConfigModal')) return;
    const modal = document.createElement('div');
    modal.id = 'archiveConfigModal';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.display = 'none';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.innerHTML = `
        <div style="background:#fff;padding:1rem;max-width:480px;width:100%;border-radius:6px;">
            <h3 style="margin-top:0;">Archive Configuration</h3>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                <label>Archive frequency (days)
                    <input id="archive_freq_days" type="number" min="1" style="width:100%;" />
                </label>
                <label><input id="archive_auto_enabled" type="checkbox" /> Enable auto-archive</label>
                <label>Archive time
                    <div style="display:flex;gap:0.5rem;">
                        <select id="archive_hour" style="flex:1"></select>
                        <select id="archive_minute" style="flex:1"></select>
                    </div>
                </label>
                <label>Timezone
                    <input id="archive_timezone" type="text" style="width:100%;" placeholder="e.g. Asia/Kolkata" />
                </label>
                <div id="archiveConfigStatus" style="margin:0.5rem 0; padding:0.5rem; border-radius:6px; display:none; font-size:0.9rem;"></div>
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.5rem;">
                    <button id="archiveConfigCancelBtn" class="btn">Cancel</button>
                    <button id="archiveConfigSaveBtn" class="btn btn-primary">Save</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // populate hour/minute options
    const hourSelect = modal.querySelector('#archive_hour');
    const minuteSelect = modal.querySelector('#archive_minute');
    for (let h = 0; h < 24; h++) {
        const opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = String(h).padStart(2, '0');
        hourSelect.appendChild(opt);
    }
    for (let m = 0; m < 60; m++) {
        const opt = document.createElement('option');
        opt.value = String(m);
        opt.textContent = String(m).padStart(2, '0');
        minuteSelect.appendChild(opt);
    }

    // handlers
    modal.querySelector('#archiveConfigCancelBtn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.querySelector('#archiveConfigSaveBtn').addEventListener('click', async () => {
        const saveBtn = modal.querySelector('#archiveConfigSaveBtn');
        const cancelBtn = modal.querySelector('#archiveConfigCancelBtn');
        const statusDiv = modal.querySelector('#archiveConfigStatus');
        try {
            saveBtn.disabled = true;
            cancelBtn.disabled = true;
            const p_frequency_days = parseInt(modal.querySelector('#archive_freq_days').value || '0', 10) || null;
            const p_auto_enabled = !!modal.querySelector('#archive_auto_enabled').checked;
            const p_archive_hour = parseInt(modal.querySelector('#archive_hour').value, 10) || null;
            const p_archive_minute = parseInt(modal.querySelector('#archive_minute').value, 10) || null;
            const p_timezone = modal.querySelector('#archive_timezone').value || null;
            const { data, error } = await supabase.rpc('update_archive_config', {
                p_frequency_days,
                p_auto_enabled,
                p_archive_hour,
                p_archive_minute,
                p_timezone
            });
            if (error) throw error;
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#d1fae5';
                statusDiv.style.color = '#065f46';
                statusDiv.textContent = 'Archive configuration updated successfully';
            }
            try { showToast('Archive configuration updated', 'success'); } catch (e) {}
            // keep modal open briefly so user can read message
            setTimeout(() => { modal.style.display = 'none'; }, 900);
        } catch (err) {
            console.error('update_archive_config error', err);
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#fee2e2';
                statusDiv.style.color = '#991b1b';
                statusDiv.textContent = 'Error: ' + (err.message || JSON.stringify(err));
            }
            try { showToast('Failed to update archive config: ' + (err.message || err), 'error'); } catch (e) {}
        } finally {
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    });
}

window.openArchiveConfigModal = async function openArchiveConfigModal() {
    ensureArchiveConfigModal();
    const modal = document.getElementById('archiveConfigModal');
    if (!modal) return;
    // clear previous
    // reset common field ids if present (support both modal variants)
    const field = (ids) => {
        for (const id of ids) {
            const el = modal.querySelector('#' + id) || document.getElementById(id);
            if (el) return el;
        }
        return null;
    };

    const freqEl = field(['archive_freq_days', 'archiveFrequencyDays', 'archiveFrequencyDays']);
    const autoEl = field(['archive_auto_enabled', 'autoArchiveEnabled', 'auto_archive_enabled']);
    const hourEl = field(['archive_hour', 'archiveTimeHour', 'archive_time_hour']);
    const minuteEl = field(['archive_minute', 'archiveTimeMinute', 'archive_time_minute']);
    const tzEl = field(['archive_timezone', 'archiveTimezone', 'timezone']);

    if (freqEl) freqEl.value = '';
    if (autoEl) autoEl.checked = false;
    if (hourEl) hourEl.value = '0';
    if (minuteEl) minuteEl.value = '0';
    if (tzEl) tzEl.value = '';

    // show modal
    modal.style.display = 'flex';

    // If main app already provides a loader for archive config, use it (public/script.js)
    if (typeof window.loadArchiveConfig === 'function') {
        try {
            await window.loadArchiveConfig();
        } catch (err) {
            console.error('loadArchiveConfig error', err);
            try { showToast('Failed to load archive config: ' + (err.message || err), 'error'); } catch (e) {}
        }
        return;
    }

    // fetch current config via supabase RPC as fallback
    try {
        const { data, error } = await supabase.rpc('get_archive_config');
        if (error) throw error;
        const cfg = (Array.isArray(data) && data[0]) ? data[0] : data;
        if (cfg) {
            if (cfg.archive_frequency_days != null && freqEl) freqEl.value = String(cfg.archive_frequency_days);
            if (cfg.auto_archive_enabled != null && autoEl) autoEl.checked = !!cfg.auto_archive_enabled;
            if (cfg.archive_time_hour != null && hourEl) hourEl.value = String(cfg.archive_time_hour);
            if (cfg.archive_time_minute != null && minuteEl) minuteEl.value = String(cfg.archive_time_minute);
            if (cfg.timezone != null && tzEl) tzEl.value = String(cfg.timezone);
        }
    } catch (err) {
        console.error('get_archive_config error', err);
        try { showToast('Failed to load archive config: ' + (err.message || err), 'error'); } catch (e) {}
    }
};

// Provide global save handler if page modal expects `saveArchiveConfig` (index.html form onsubmit)
if (typeof window.saveArchiveConfig !== 'function') {
    window.saveArchiveConfig = async function saveArchiveConfig(event) {
        if (event) {
            try { event.preventDefault(); } catch (e) {}
        }
        const statusDiv = document.getElementById('archiveConfigStatus');
        try {
            const frequencyDaysEl = document.getElementById('archiveFrequencyDays') || document.getElementById('archive_freq_days');
            const autoEnabledEl = document.getElementById('autoArchiveEnabled') || document.getElementById('archive_auto_enabled');
            const hourEl = document.getElementById('archiveTimeHour') || document.getElementById('archive_hour');
            const minuteEl = document.getElementById('archiveTimeMinute') || document.getElementById('archive_minute');
            const tzEl = document.getElementById('archiveTimezone') || document.getElementById('archive_timezone');

            const frequencyDays = frequencyDaysEl ? parseInt(frequencyDaysEl.value, 10) : null;
            const autoEnabled = !!(autoEnabledEl && autoEnabledEl.checked);
            const archiveHour = hourEl ? parseInt(hourEl.value, 10) : null;
            const archiveMinute = minuteEl ? parseInt(minuteEl.value, 10) : null;
            const timezone = tzEl ? tzEl.value : null;

            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#f3f4f6';
                statusDiv.style.color = '#111827';
                statusDiv.textContent = 'Saving...';
            }

            const { data, error } = await supabase.rpc('update_archive_config', {
                p_frequency_days: frequencyDays,
                p_auto_enabled: autoEnabled,
                p_archive_hour: archiveHour,
                p_archive_minute: archiveMinute,
                p_timezone: timezone
            });

            if (error) throw error;

            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#d1fae5';
                statusDiv.style.color = '#065f46';
                statusDiv.textContent = 'Archive configuration saved successfully';
            }
            try { showToast && showToast('Archive configuration saved', 'success'); } catch (e) {}
            // keep visible briefly then close modal if present
            setTimeout(() => {
                const modal = document.getElementById('archiveConfigModal');
                if (modal) modal.style.display = 'none';
            }, 900);
            return data;
        } catch (err) {
            console.error('saveArchiveConfig error', err);
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#fee2e2';
                statusDiv.style.color = '#991b1b';
                statusDiv.textContent = 'Error saving archive config: ' + (err.message || JSON.stringify(err));
            }
            try { showToast && showToast('Error saving archive config: ' + (err.message || err), 'error'); } catch (e) {}
            throw err;
        }
    };
}

// Provide global close handler if page modal expects `closeArchiveConfigModal`
if (typeof window.closeArchiveConfigModal !== 'function') {
    window.closeArchiveConfigModal = function closeArchiveConfigModal() {
        const modal = document.getElementById('archiveConfigModal');
        const statusDiv = document.getElementById('archiveConfigStatus');
        try {
            if (modal) {
                modal.style.display = 'none';
                if (modal.classList) modal.classList.remove('active');
            }
            if (statusDiv) {
                statusDiv.style.display = 'none';
                statusDiv.textContent = '';
            }
            // Restore body scroll
            document.body.style.overflow = '';
        } catch (err) {
            console.error('closeArchiveConfigModal error', err);
        }
    };
}

function formatDateToDDMMYYYY(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function formatDateTimeToDDMMYYYY_HHMMSS(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function loadAndRender(page = 1) {
    const loading = document.getElementById('hourlyReportLoadingMessage');
    const table = document.getElementById('hourlyReportTable');
    const tbody = document.getElementById('hourlyReportTableBody');
    const empty = document.getElementById('hourlyReportEmptyMessage');
    const errorEl = document.getElementById('hourlyReportErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    try {
        // Fetch reports (small dataset expected; use filters client-side)
        const { data, error } = await supabase
            .from('HourlyReport')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;

        let rows = data || [];

        // Apply filters from DOM
        const dateFilter = document.getElementById('hourlyReportDateFilter')?.value || '';
        const shiftFilter = document.getElementById('hourlyReportShiftFilter')?.value || '';
        const hideArchived = !!document.getElementById('hourlyReportHideArchived')?.checked;

        if (dateFilter) {
            rows = rows.filter(r => {
                const wd = readField(r, ['Work Day Date','work_day_date']);
                if (!wd) return false;
                const d = new Date(wd);
                if (Number.isNaN(d.getTime())) return false;
                const iso = d.toISOString().slice(0,10);
                return iso === dateFilter;
            });
        }
        if (shiftFilter) {
            rows = rows.filter(r => (readField(r, ['Shift','shift']) || '').toString() === shiftFilter);
        }
        if (hideArchived) {
            rows = rows.filter(r => {
                const a = readField(r, ['archived','Archive Status','archive_status']);
                return !(a === true || a === 't' || a === 'true' || a === 'yes');
            });
        }

        const pageSize = parseInt(document.getElementById('hourlyReportPageSize')?.value || '25', 10) || 25;
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        const p = Math.min(Math.max(1, page), totalPages);
        const from = (p - 1) * pageSize;
        const paginated = rows.slice(from, from + pageSize);

        if (!paginated || paginated.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (tbody) {
            tbody.innerHTML = '';
            paginated.forEach(item => {
                const plant = readField(item, ['Plant','plant']) ?? '-';
                const machine = readField(item, ['Machine No.','Machine Name','Machine','machine','machine_name']) ?? '-';
                const srNo = readField(item, ['Sr No','Sr. No.','Sr. No','sr_no','srno']) ?? '-';
                const shift = readField(item, ['Shift','shift']) ?? '-';
                const workDayDate = formatDateToDDMMYYYY(readField(item, ['Work Day Date','work_day_date']));
                const rawTime = readField(item, ['Time','time']);
                let time = '-';
                if (rawTime) {
                    const formatted = formatDateTimeToDDMMYYYY_HHMMSS(rawTime);
                    time = formatted || rawTime;
                }
                const operator = readField(item, ['Operator','Operator Code','operator','operator_code']) ?? '-';
                const partNo = readField(item, ['Part No.','part_no','sap_code']) ?? '-';
                const partName = readField(item, ['Part Name','part_name']) ?? '-';
                const operation = readField(item, ['Operation','operation']) ?? '-';
                const cycleSec = readField(item, ['Cycle Time (Second) per piece','Cycle Time (Second)','Cycle Time per Piece','Cycle Time (Sec)','Cycle Time','cycle_time']) ?? '-';
                const hourlyTarget = readField(item, ['Hourly Target','hourly_target']) ?? '-';
                const totalQty = readField(item, ['Total Produced Qty.','total_produced_qty','total_qty']) ?? '-';
                const okQty = readField(item, ['OK Qty.','ok_qty','ok']) ?? '-';
                const rejQty = readField(item, ['Rej. Qty.','rej_qty','rejected_qty']) ?? '-';
                const rewQty = readField(item, ['Rew. Qty.','rew_qty']) ?? '-';
                const defectType = readField(item, ['Defect Type','defect_type']) ?? '-';
                const availMin = readField(item, ['Available Time (Minutes)','Available Time (Min)','Available Time','available_time']) ?? '-';
                const operatingMin = readField(item, ['Operating Time as per Cycle Time (Minutes)','Operating Time (Min)','operating_time']) ?? '-';
                const totalDown = readField(item, ['Total Down Time (Minutes)','Total Down Time (Min)','total_down_time']) ?? '-';
                const lossReasons = readField(item, ['Loss Reasons','loss_reason']) ?? '-';
                const cellName = readField(item, ['Cell Name','cell_name']) ?? '-';
                const cellLeader = readField(item, ['Cell Leader','cell_leader']) ?? '-';
                const archivedRaw = readField(item, ['archived','Archive Status','archive_status']);
                const archive = (archivedRaw === true || archivedRaw === 't' || archivedRaw === 'true') ? 'Yes' : (archivedRaw === false || archivedRaw === 'f' || archivedRaw === 'false' ? 'No' : '-');
                const iotDate = readField(item, ['IoT Date','iot_date','iot_timestamp']) ? formatDateTimeToDDMMYYYY_HHMMSS(readField(item, ['IoT Date','iot_date','iot_timestamp'])) : '-';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${plant}</td>
                    <td>${machine}</td>
                    <td>${srNo}</td>
                    <td>${shift}</td>
                    <td>${workDayDate}</td>
                    <td>${time}</td>
                    <td>${operator}</td>
                    <td>${partNo}</td>
                    <td>${partName}</td>
                    <td>${operation}</td>
                    <td>${cycleSec}</td>
                    <td>${hourlyTarget}</td>
                    <td>${totalQty}</td>
                    <td>${okQty}</td>
                    <td>${rejQty}</td>
                    <td>${rewQty}</td>
                    <td>${defectType}</td>
                    <td>${availMin}</td>
                    <td>${operatingMin}</td>
                    <td>${totalDown}</td>
                    <td>${lossReasons}</td>
                    <td>${cellName}</td>
                    <td>${cellLeader}</td>
                    <td>${archive}</td>
                    <td>${iotDate}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // update pagination info
        const paginationInfo = document.getElementById('hourlyReportPaginationInfo');
        if (paginationInfo) {
            const start = from + 1;
            const end = Math.min(from + pageSize, rows.length);
            paginationInfo.textContent = `Showing ${start}-${end} of ${rows.length}`;
        }

        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (table) table.style.display = 'table';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Failed to load hourly reports'; }
        console.error('Hourly Report load error', err);
    }
}

function attachListeners() {
    const dateFilter = document.getElementById('hourlyReportDateFilter');
    const shiftFilter = document.getElementById('hourlyReportShiftFilter');
    const hideArchived = document.getElementById('hourlyReportHideArchived');
    const clearBtn = document.getElementById('clearHourlyReportFiltersBtn');
    const pageSize = document.getElementById('hourlyReportPageSize');
    if (dateFilter) { const h = () => loadAndRender(1); dateFilter.addEventListener('change', h); _attached.push({ el: dateFilter, ev: 'change', fn: h }); }
    if (shiftFilter) { const h = () => loadAndRender(1); shiftFilter.addEventListener('change', h); _attached.push({ el: shiftFilter, ev: 'change', fn: h }); }
    if (hideArchived) { const h = () => loadAndRender(1); hideArchived.addEventListener('change', h); _attached.push({ el: hideArchived, ev: 'change', fn: h }); }
    if (clearBtn) { const h = () => { dateFilter.value=''; shiftFilter.value=''; hideArchived.checked=false; loadAndRender(1); }; clearBtn.addEventListener('click', h); _attached.push({ el: clearBtn, ev: 'click', fn: h }); }
    if (pageSize) { const h = () => loadAndRender(1); pageSize.addEventListener('change', h); _attached.push({ el: pageSize, ev: 'change', fn: h }); }
    // Action buttons: Generate / Archive / Settings
    const generateBtn = document.getElementById('generateHourlyReportBtn');
    if (generateBtn) {
        const genHandler = async () => {
            const original = generateBtn.innerHTML;
            try {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
                // Call Supabase RPC for scheduled generation (no-arg function)
                const { data, error } = await supabase.rpc('generate_hourly_report_scheduled');
                if (error) throw error;
                try { showToast(`Hourly report generated (${(data && data.reports_created) || 'done'})`, 'success'); } catch (e) {}
                await loadAndRender(1);
                return data;
            } catch (err) {
                console.error('generateHourlyReport error', err);
                try { showToast('Error generating report: ' + (err.message || err), 'error'); } catch (e) {}
                throw err;
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = original;
            }
        };
        generateBtn.addEventListener('click', genHandler);
        _attached.push({ el: generateBtn, ev: 'click', fn: genHandler });
    }

    const archiveOldBtn = document.getElementById('archiveOldReportsBtn');
    if (archiveOldBtn) {
        const archiveHandler = async () => {
            const original = archiveOldBtn.innerHTML;
            try {
                if (!confirm('Are you sure you want to archive old reports now?')) return;
                archiveOldBtn.disabled = true;
                archiveOldBtn.innerHTML = '<span class="btn-icon">⏳</span> Archiving...';
                // Call Supabase RPC to archive old data (function name provided by user)
                const { data, error } = await supabase.rpc('archive_all_old_data');
                if (error) throw error;
                try { showToast(`Archived ${data?.archived_count ?? 'records'}`, 'success'); } catch (e) {}
                await loadAndRender(1);
                return data;
            } catch (err) {
                console.error('archiveOldHourlyReports error', err);
                try { showToast('Error archiving reports: ' + (err.message || err), 'error'); } catch (e) {}
                throw err;
            } finally {
                archiveOldBtn.disabled = false;
                archiveOldBtn.innerHTML = original;
            }
        };
        archiveOldBtn.addEventListener('click', archiveHandler);
        _attached.push({ el: archiveOldBtn, ev: 'click', fn: archiveHandler });
    }

    const archiveConfigBtn = document.getElementById('archiveConfigBtn');
    if (archiveConfigBtn) {
        const cfgHandler = () => {
            if (typeof window.openArchiveConfigModal === 'function') {
                window.openArchiveConfigModal();
            } else {
                console.warn('openArchiveConfigModal not available on window');
                try { showToast('Archive settings dialog not configured', 'warning'); } catch (e) {}
            }
        };
        archiveConfigBtn.addEventListener('click', cfgHandler);
        _attached.push({ el: archiveConfigBtn, ev: 'click', fn: cfgHandler });
    }
}

export async function initFeature(container = null) {
    _attached = [];
    attachListeners();
    await loadAndRender(1);
}

export function destroyFeature() {
    _attached.forEach(({ el, ev, fn }) => { try { el.removeEventListener(ev, fn); } catch (e) {} });
    _attached = [];
}


