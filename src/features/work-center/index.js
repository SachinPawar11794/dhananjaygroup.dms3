import { WorkCenterMasterService } from '../../services/workCenterMasterService.js';

let currentPage = 1;
let currentPageSize = 25;
let listeners = [];

async function loadAndRender(page = 1) {
    console.debug('work-center: loadAndRender', page);
    // IDs in index.html use lowercase "workcenter" and "workcenterMaster" prefixes
    const loading = document.getElementById('workcenterLoadingMessage');
    const table = document.getElementById('workcenterMasterTable');
    const tableBody = document.getElementById('workcenterMasterTableBody');
    const empty = document.getElementById('workcenterEmptyMessage');
    const errorEl = document.getElementById('workcenterErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    try {
        const pageSize = parseInt(document.getElementById('workcenterPageSize')?.value || `${currentPageSize}`, 10) || currentPageSize;
        console.debug('work-center: requesting pageSize=', pageSize, 'page=', currentPage);
        const { data } = await WorkCenterMasterService.getAll(currentPage, pageSize);
        console.debug('work-center: received rows=', (data || []).length);
        if (!data || data.length === 0) {
            if (empty) empty.style.display = 'block';
            if (table) table.style.display = 'none';
            return;
        }
        if (tableBody) {
            tableBody.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                const machine = item['Machine'] ?? item.Machine ?? item.machine ?? '-';
                const plant = item['Plant'] ?? item.Plant ?? item.plant ?? '-';
                const iotEnabled = (item['IoT Enabled'] !== undefined) ? (item['IoT Enabled'] ? 'Yes' : 'No') : ((item.iot_enabled !== undefined) ? (item.iot_enabled ? 'Yes' : 'No') : '-');
                const createdAt = item.created_at ? (new Date(item.created_at).toLocaleString()) : '-';
                const updatedAt = item.updated_at ? (new Date(item.updated_at).toLocaleString()) : '-';

                tr.innerHTML = `
                    <td>${item.id || '-'}</td>
                    <td>${machine}</td>
                    <td>${plant}</td>
                    <td>${iotEnabled}</td>
                    <td>${createdAt}</td>
                    <td>${updatedAt}</td>
                    <td>
                        <button class="btn-edit" data-id="${item.id}">✏️</button>
                        <button class="btn-delete" data-id="${item.id}">🗑️</button>
                    </td>
                `;
                tableBody.appendChild(tr);
                tr.querySelector('.btn-edit')?.addEventListener('click', () => {
                    if (typeof window.openEditWorkCenterModal === 'function') {
                        window.openEditWorkCenterModal(item);
                    } else {
                        WorkCenterMasterService.getById(item.id).then(d => {
                            if (typeof window.openEditWorkCenterModal === 'function') window.openEditWorkCenterModal(d);
                        }).catch(console.error);
                    }
                });
                tr.querySelector('.btn-delete')?.addEventListener('click', async () => {
                    if (!confirm('Delete work center?')) return;
                    try {
                        await WorkCenterMasterService.delete(item.id);
                        (window.showToast || console.log)('Deleted', 'success');
                        await loadAndRender(currentPage);
                    } catch (err) {
                        console.error(err);
                        (window.showToast || console.error)('Delete failed', 'error');
                    }
                });
            });
        }
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'table';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display='block'; errorEl.textContent = err.message || 'Error loading work centers'; }
        console.error('Work Center load error', err);
    }
}

function attachListeners() {
    const pageSize = document.getElementById('workCenterPageSize');
    if (pageSize) {
        const h = () => { currentPage = 1; loadAndRender(1); };
        pageSize.addEventListener('change', h);
        listeners.push({el:pageSize, ev:'change', fn:h});
    }
}

export async function initFeature(container = null, options = {}) {
    currentPage = 1;
    currentPageSize = 25;
    listeners = [];
    attachListeners();
    await loadAndRender(1);
}

export function destroyFeature() {
    listeners.forEach(({el,ev,fn}) => { try { el.removeEventListener(ev,fn); } catch(e) {} });
    listeners = [];
}


