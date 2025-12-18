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
                const machine = readField(item, ['Machine Name','Machine','Machine No.','machine','machine_name']) ?? '-';
                const srNo = readField(item, ['Sr. No.','sr_no','srno']) ?? '-';
                const shift = readField(item, ['Shift','shift']) ?? '-';
                const workDayDate = formatDateToDDMMYYYY(readField(item, ['Work Day Date','work_day_date']));
                const time = readField(item, ['Time','time']) ? formatDateTimeToDDMMYYYY_HHMMSS(readField(item, ['Time','time'])) : '-';
                const operator = readField(item, ['Operator','Operator Code','operator','operator_code']) ?? '-';
                const partNo = readField(item, ['Part No.','part_no','sap_code']) ?? '-';
                const partName = readField(item, ['Part Name','part_name']) ?? '-';
                const operation = readField(item, ['Operation','operation']) ?? '-';
                const cycleSec = readField(item, ['Cycle Time (Sec)','Cycle Time','cycle_time']) ?? '-';
                const hourlyTarget = readField(item, ['Hourly Target','hourly_target']) ?? '-';
                const totalQty = readField(item, ['Total Produced Qty.','total_produced_qty','total_qty']) ?? '-';
                const okQty = readField(item, ['OK Qty.','ok_qty','ok']) ?? '-';
                const rejQty = readField(item, ['Rej. Qty.','rej_qty','rejected_qty']) ?? '-';
                const rewQty = readField(item, ['Rew. Qty.','rew_qty']) ?? '-';
                const defectType = readField(item, ['Defect Type','defect_type']) ?? '-';
                const availMin = readField(item, ['Available Time (Min)','Available Time','available_time']) ?? '-';
                const operatingMin = readField(item, ['Operating Time (Min)','operating_time']) ?? '-';
                const totalDown = readField(item, ['Total Down Time (Min)','total_down_time']) ?? '-';
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


