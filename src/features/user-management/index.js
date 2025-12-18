import { UserService } from '../../services/userService.js';
import { supabase } from '../../config/supabase.js';
import { showToast } from '../../utils/toast.js';

let _attached = [];
let currentPage = 1;

async function loadAndRender(page = 1) {
    console.debug('user-management: loadAndRender', page);
    const loading = document.getElementById('userLoadingMessage');
    const table = document.getElementById('userManagementTable');
    const tbody = document.getElementById('userManagementTableBody');
    const empty = document.getElementById('userEmptyMessage');
    const errorEl = document.getElementById('userErrorMessage');
    if (loading) loading.style.display = 'flex';
    if (table) table.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    try {
        const pageSize = parseInt(document.getElementById('taskManagerPageSize')?.value || '25', 10) || 25;
        let rows = [];
        let totalCount = 0;

        // Try RPC to get all users combining auth.users + profiles (secure server-side)
        try {
            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_all_users_for_admin');
            if (rpcErr) throw rpcErr;
            rows = rpcData || [];
            totalCount = rows.length;
        } catch (rpcError) {
            console.warn('RPC get_all_users_for_admin failed, falling back to profiles:', rpcError);
            showToast("Admin RPC unavailable - showing profiles only. Run SYNC_ALL_AUTH_USERS_TO_PROFILES.sql or click Sync Users to import all users.", "warning");
            const { data, count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page-1)*pageSize, page*pageSize - 1);
            if (error) throw error;
            rows = data || [];
            totalCount = count || rows.length;
        }

        if (!rows || rows.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (table) table.style.display = 'none';
            if (loading) loading.style.display = 'none';
            return;
        }

        if (tbody) {
            tbody.innerHTML = '';
            rows.forEach(user => {
                const tr = document.createElement('tr');
                const email = user.email || '-';
                const name = user.full_name || user.email?.split('@')[0] || '-';
                const role = user.role || '-';
                const plant = user.plant || '-';
                const created = user.created_at ? new Date(user.created_at).toLocaleString() : '-';
                const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-';
                const status = user.is_approved ? 'Approved' : 'Pending';

                tr.innerHTML = `
                    <td>${email}</td>
                    <td>${name}</td>
                    <td>${role}</td>
                    <td>${plant}</td>
                    <td>${created}</td>
                    <td>${lastSignIn}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn-edit" data-id="${user.id}">✏️</button>
                        <button class="btn-delete" data-id="${user.id}">🗑️</button>
                        ${user.is_approved ? '' : `<button class="btn-approve" data-id="${user.id}">✅</button>`}
                    </td>
                `;
                tbody.appendChild(tr);

                tr.querySelector('.btn-edit')?.addEventListener('click', () => {
                    if (typeof window.openEditUserModal === 'function') window.openEditUserModal(user);
                });
                tr.querySelector('.btn-delete')?.addEventListener('click', async () => {
                    if (!confirm('Delete user?')) return;
                    try {
                        await UserService.delete(user.id);
                        await loadAndRender(currentPage);
                    } catch (err) {
                        console.error('Delete user error', err);
                        (window.showToast || console.error)('Delete failed', 'error');
                    }
                });
                tr.querySelector('.btn-approve')?.addEventListener('click', async () => {
                    if (!confirm('Approve this user?')) return;
                    try {
                        await UserService.approve(user.id);
                        await loadAndRender(currentPage);
                    } catch (err) {
                        console.error('Approve user error', err);
                        (window.showToast || console.error)('Approve failed', 'error');
                    }
                });
            });
        }

        // pagination info
        const paginationInfo = document.getElementById('processPaginationInfo') || document.getElementById('settingsPaginationInfo');
        if (paginationInfo) {
            const pageSizeUsed = parseInt(document.getElementById('taskManagerPageSize')?.value || '25', 10) || 25;
            const start = (page - 1) * pageSizeUsed + 1;
            const end = start + rows.length - 1;
            paginationInfo.textContent = `Showing ${start}-${end} of ${totalCount || rows.length}`;
        }

        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (table) table.style.display = 'table';
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message || 'Failed to load users'; }
        console.error('User Management load error', err);
    }
}

function attachListeners() {
    const syncBtn = document.getElementById('syncUsersBtn');
    const addBtn = document.getElementById('openUserFormBtn');
    if (syncBtn) {
        const h = async () => {
            try {
                syncBtn.disabled = true;
                const res = await UserService.syncUsers();
                (window.showToast || console.log)(`Synced ${res.synced} users`, 'success');
                await loadAndRender(1);
            } catch (err) {
                console.error('Sync users error', err);
                (window.showToast || console.error)('Sync failed', 'error');
            } finally {
                syncBtn.disabled = false;
            }
        };
        syncBtn.addEventListener('click', h);
        _attached.push({ el: syncBtn, ev: 'click', fn: h });
    }
    if (addBtn) {
        const h = () => { if (typeof window.openAddUserModal === 'function') window.openAddUserModal(); };
        addBtn.addEventListener('click', h);
        _attached.push({ el: addBtn, ev: 'click', fn: h });
    }
}

export async function initFeature(container = null) {
    _attached = [];
    attachListeners();
    currentPage = 1;
    await loadAndRender(1);
}

export function destroyFeature() {
    _attached.forEach(({ el, ev, fn }) => { try { el.removeEventListener(ev, fn); } catch (e) {} });
    _attached = [];
}


