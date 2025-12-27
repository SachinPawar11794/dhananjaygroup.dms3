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

async function loadAndRender(page = 1) {
    const loading = document.getElementById('lossReasonLoadingMessage');
    const table = document.getElementById('lossReasonTable');
    const tbody = document.getElementById('lossReasonTableBody');
    const empty = document.getElementById('lossReasonEmptyMessage');
    const errorEl = document.getElementById('lossReasonErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    try {
        const { data, error } = await supabase
            .from('lossreason')
            .select('*')
            .order('id', { ascending: true });
        if (error) throw error;

        const all = data || [];
        const pageSize = parseInt(document.getElementById('lossReasonPageSize')?.value || '25', 10) || 25;
        const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
        const p = Math.min(Math.max(1, page), totalPages);
        const from = (p - 1) * pageSize;
        const paginated = all.slice(from, from + pageSize);

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
                const reason = readField(item, ['Loss Reason','loss_reason','reason','name']) ?? '-';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${reason}</td>
                    <td>
                        <button class="btn-edit" data-id="${id}">✏️</button>
                        <button class="btn-delete" data-id="${id}">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);

                tr.querySelector('.btn-edit')?.addEventListener('click', () => {
                    if (typeof window.openEditLossReasonModal === 'function') {
                        window.openEditLossReasonModal(item);
                    }
                });
                tr.querySelector('.btn-delete')?.addEventListener('click', async () => {
                    if (!confirm('Delete this loss reason?')) return;
                    try {
                        const { error: delErr } = await supabase.from('lossreason').delete().eq('id', id);
                        if (delErr) throw delErr;
                        (window.showToast || console.log)('Deleted', 'success');
                        await loadAndRender(p);
                    } catch (err) {
                        console.error('Delete loss reason error', err);
                        (window.showToast || console.error)('Delete failed', 'error');
                    }
                });
            });
        }

        // update pagination info
        const paginationInfo = document.getElementById('lossReasonPaginationInfo');
        if (paginationInfo) {
            const start = from + 1;
            const end = Math.min(from + pageSize, all.length);
            paginationInfo.textContent = `Showing ${start}-${end} of ${all.length}`;
        }

        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (table) table.style.display = 'table';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Failed to load loss reasons'; }
        console.error('Loss Reason load error', err);
    }
}

function attachListeners() {
    const pageSize = document.getElementById('lossReasonPageSize');
    const clearBtn = document.getElementById('clearLossReasonFiltersBtn');
    if (pageSize) {
        const h = () => loadAndRender(1);
        pageSize.addEventListener('change', h);
        _attached.push({ el: pageSize, ev: 'change', fn: h });
    }
    if (clearBtn) {
        const h = () => loadAndRender(1);
        clearBtn.addEventListener('click', h);
        _attached.push({ el: clearBtn, ev: 'click', fn: h });
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


