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

function formatDateTimeToDDMMYYYY_HHMMSS(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function loadAndRender(page = 1) {
    console.debug('shift-schedule: loadAndRender page=', page);
    const loading = document.getElementById('shiftScheduleLoadingMessage');
    const table = document.getElementById('shiftScheduleTable');
    const tbody = document.getElementById('shiftScheduleTableBody');
    const empty = document.getElementById('shiftScheduleEmptyMessage');
    const errorEl = document.getElementById('shiftScheduleErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    try {
        // Fetch all schedules (small dataset expected)
        const { data, error } = await supabase
            .from('ShiftSchedule')
            .select('*')
            .order('id', { ascending: true });
        if (error) throw error;

        const all = data || [];

        // Apply filters
        const plantFilter = document.getElementById('shiftSchedulePlantFilter')?.value || '';
        const shiftFilter = document.getElementById('shiftScheduleShiftFilter')?.value || '';
        let filtered = all;
        if (plantFilter) filtered = filtered.filter(r => (readField(r, ['Plant','plant']) || '').toString() === plantFilter);
        if (shiftFilter) filtered = filtered.filter(r => (readField(r, ['Shift','shift']) || '').toString() === shiftFilter);

        const pageSize = parseInt(document.getElementById('shiftSchedulePageSize')?.value || '25', 10) || 25;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const p = Math.min(Math.max(1, page), totalPages);
        const from = (p - 1) * pageSize;
        const paginated = filtered.slice(from, from + pageSize);

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
                const id = item.id ?? '-';
                const plant = readField(item, ['Plant','plant']) ?? '-';
                const shift = readField(item, ['Shift','shift']) ?? '-';
                // Schema uses "Time" as text; show it as-is. Keep TimeRange as a fallback.
                const timeRaw = readField(item, ['Time','time']) ?? readField(item, ['TimeRange','time_range']);
                const time = timeRaw ?? '-';
                // Use exact column names from schema: "Available Time", "Planned Down Time"
                const avail = readField(item, ['Available Time','Available Time (min)','available_time','available_minutes']) ?? '-';
                const planned = readField(item, ['Planned Down Time','Planned Down Time (min)','planned_down_time','planned_minutes']) ?? '-';
                const remark = readField(item, ['Remark','remark']) ?? '-';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${id}</td>
                    <td>${plant}</td>
                    <td>${shift}</td>
                    <td>${time}</td>
                    <td>${avail}</td>
                    <td>${planned}</td>
                    <td>${remark}</td>
                    <td>
                        <button class="btn-edit" data-id="${id}">✏️</button>
                        <button class="btn-delete" data-id="${id}">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update pagination UI
        const paginationInfo = document.getElementById('shiftSchedulePaginationInfo');
        if (paginationInfo) {
            const start = from + 1;
            const end = Math.min(from + pageSize, filtered.length);
            paginationInfo.textContent = `Showing ${start}-${end} of ${filtered.length}`;
        }
        // show elements
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (table) table.style.display = 'table';

    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Failed to load shift schedule'; }
        console.error('Shift Schedule load error', err);
    }
}

function attachListeners() {
    const plantSelect = document.getElementById('shiftSchedulePlantFilter');
    const shiftSelect = document.getElementById('shiftScheduleShiftFilter');
    const clearBtn = document.getElementById('clearShiftScheduleFiltersBtn');
    const pageSize = document.getElementById('shiftSchedulePageSize');
    if (plantSelect) {
        const h = () => loadAndRender(1);
        plantSelect.addEventListener('change', h);
        _attached.push({ el: plantSelect, ev: 'change', fn: h });
    }
    if (shiftSelect) {
        const h = () => loadAndRender(1);
        shiftSelect.addEventListener('change', h);
        _attached.push({ el: shiftSelect, ev: 'change', fn: h });
    }
    if (clearBtn) {
        const h = () => { plantSelect.value = ''; shiftSelect.value = ''; loadAndRender(1); };
        clearBtn.addEventListener('click', h);
        _attached.push({ el: clearBtn, ev: 'click', fn: h });
    }
    if (pageSize) {
        const h = () => loadAndRender(1);
        pageSize.addEventListener('change', h);
        _attached.push({ el: pageSize, ev: 'change', fn: h });
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


