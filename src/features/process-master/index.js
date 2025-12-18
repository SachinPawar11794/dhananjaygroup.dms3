import { ProcessMasterService } from '../../services/processMasterService.js';

let currentPage = 1;
let currentPageSize = 25;
let attached = [];

function renderRows(data) {
    const tableBody = document.getElementById('processMasterTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    (data || []).forEach(item => {
        const row = document.createElement('tr');
        const srNo = item['Sr. No.'] ?? item.sr_no ?? '-';
        const itemId = item.id || srNo;
        row.innerHTML = `
            <td>${srNo}</td>
            <td>${item['Plant'] ?? item.plant ?? '-'}</td>
            <td>${item['Cell Name'] ?? item.cell_name ?? '-'}</td>
            <td>${item['SAP Code/ Part No.'] ?? item.sap_code ?? '-'}</td>
            <td>${item['Part Name'] ?? item.part_name ?? '-'}</td>
            <td>${item['Operation'] ?? item.operation ?? '-'}</td>
            <td>${item['Cycle Time per Piece'] ?? item.cycle_time ?? '-'}</td>
            <td>${item['No. of Cavities in Tool'] ?? item.cavities ?? '-'}</td>
            <td>${item['Machine No.'] ?? item.machine ?? '-'}</td>
            <td>${item['No. of Workstations'] ?? item.workstations ?? '-'}</td>
            <td>${item['Inspection Applicability'] ?? item.inspection ?? '-'}</td>
            <td>${item['Mandays'] ?? item.mandays ?? '-'}</td>
            <td>${item['Cell Leader'] ?? item.cell_leader ?? '-'}</td>
            <td>${item['Batch Qty.'] ?? item.batch_qty ?? '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" data-id="${itemId}" title="Edit">✏️</button>
                    <button class="btn-delete" data-id="${itemId}" title="Delete">🗑️</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        // attach handlers
        row.querySelector('.btn-edit')?.addEventListener('click', () => {
            // Prefer modular modal when available; fall back to legacy global
            if (typeof window.openEditProcessMasterModal === 'function') {
                window.openEditProcessMasterModal(item);
            } else {
                // attempt to fetch fresh data and open legacy modal
                ProcessMasterService.getById(itemId).then(d => {
                    if (typeof window.openEditProcessMasterModal === 'function') {
                        window.openEditProcessMasterModal(d);
                    }
                }).catch(console.error);
            }
        });
        row.querySelector('.btn-delete')?.addEventListener('click', async () => {
            if (!confirm('Delete this process master entry?')) return;
            try {
                await ProcessMasterService.delete(itemId);
                await loadAndRender(currentPage);
                (window.showToast || console.log)('Process deleted', 'success');
            } catch (err) {
                console.error(err);
                (window.showToast || console.error)('Failed to delete process', 'error');
            }
        });
    });
}

async function loadAndRender(page = 1) {
    console.debug('process-master: loadAndRender start, page=', page);
    const loading = document.getElementById('processLoadingMessage');
    const table = document.getElementById('processMasterTable');
    const empty = document.getElementById('processEmptyMessage');
    const errorEl = document.getElementById('processErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    try {
        console.debug('process-master: fetching all data from service');
        const allData = await ProcessMasterService.getAllWithoutPagination();
        console.debug('process-master: fetched rows=', (allData || []).length);
        const searchInput = document.getElementById('processMasterSearch');
        const term = (searchInput?.value || '').toLowerCase().trim();
        let filtered = allData || [];
        if (term) {
            filtered = filtered.filter(item => {
                const text = [
                    item['Plant'], item['SAP Code/ Part No.'], item['Part Name'],
                    item['Operation'], item['Machine No.'], item['Cell Name']
                ].filter(Boolean).join(' ').toLowerCase();
                return text.includes(term);
            });
        }
        const pageSize = parseInt(document.getElementById('processPageSize')?.value || `${currentPageSize}`, 10) || currentPageSize;
        const totalPages = Math.max(1, Math.ceil((filtered.length||0) / pageSize));
        const p = Math.min(Math.max(1, page), totalPages);
        const from = (p - 1) * pageSize;
        const paginated = filtered.slice(from, from + pageSize);
        // render
        renderRows(paginated);
        // update pagination UI (simple)
        const paginationContainer = document.getElementById('processPageNumbers');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            for (let i=1;i<=totalPages;i++){
                const btn = document.createElement('button');
                btn.className = 'pagination-page ' + (i===p ? 'active' : '');
                btn.textContent = i;
                btn.addEventListener('click', ()=>{ loadAndRender(i); });
                paginationContainer.appendChild(btn);
            }
        }
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = (paginated && paginated.length) ? 'table' : 'none';
        if (!paginated || paginated.length===0) {
            if (empty) empty.style.display = 'block';
        } else if (empty) empty.style.display = 'none';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display='block'; errorEl.textContent = err.message || 'Failed to load process master'; }
        console.error('Process Master load error', err);
    }
}

function attachListeners() {
    const searchInput = document.getElementById('processMasterSearch');
    const pageSizeSelect = document.getElementById('processPageSize');
    if (searchInput) {
        const h = () => { currentPage = 1; loadAndRender(1); };
        searchInput.addEventListener('input', h);
        attached.push({el:searchInput, ev:'input', fn:h});
    }
    if (pageSizeSelect) {
        const h = () => { currentPage = 1; loadAndRender(1); };
        pageSizeSelect.addEventListener('change', h);
        attached.push({el:pageSizeSelect, ev:'change', fn:h});
    }
}

export async function initFeature(containerElement = null, options = {}) {
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


