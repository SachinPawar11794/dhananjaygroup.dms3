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

        // Load users directly from profiles table
        const { data, count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page-1)*pageSize, page*pageSize - 1);
        if (error) throw error;
        rows = data || [];
        totalCount = count || rows.length;

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
                        const idToDelete = user?.id || user?.user_id || user?.userId || user?.uid || '';
                        if (!idToDelete) {
                            console.error('Attempt to delete user with missing id', user);
                            (window.showToast || console.error)('Delete failed: missing user id', 'error');
                            return;
                        }
                        await UserService.delete(idToDelete);
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
    // Initialize modal handlers for add/edit/close/submit behavior
    initializeModalHandlers();
    currentPage = 1;
    await loadAndRender(1);
}

export function destroyFeature() {
    _attached.forEach(({ el, ev, fn }) => { try { el.removeEventListener(ev, fn); } catch (e) {} });
    _attached = [];
}


// Expose helpers for opening the user modal (used by legacy UI hooks)
window.openAddUserModal = function() {
    try {
        const modalOverlay = document.getElementById('userModalOverlay');
        const modalTitle = document.getElementById('userModalTitle');
        const editId = document.getElementById('userEditId');
        const emailField = document.getElementById('user_email');
        const passwordField = document.getElementById('user_password');
        const form = document.getElementById('userForm');

        if (modalTitle) modalTitle.textContent = 'Add New User';
        if (editId) editId.value = '';
        if (form && form.dataset) delete form.dataset.editId;
        if (emailField) { emailField.disabled = false; emailField.value = ''; }
        if (passwordField) { passwordField.required = true; passwordField.value = ''; passwordField.placeholder = 'Minimum 6 characters'; }
        if (form) form.reset();
        if (modalOverlay) { modalOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    } catch (e) {
        console.error('openAddUserModal error', e);
    }
};

window.openEditUserModal = function(user = {}) {
    try {
        console.debug('openEditUserModal called with user:', user);
        const modalOverlay = document.getElementById('userModalOverlay');
        const modalTitle = document.getElementById('userModalTitle');
        const editId = document.getElementById('userEditId');
        const emailField = document.getElementById('user_email');
        const passwordField = document.getElementById('user_password');
        const fullNameField = document.getElementById('user_full_name');
        const roleField = document.getElementById('user_role');
        const plantField = document.getElementById('user_plant');
        const form = document.getElementById('userForm');

        if (modalTitle) modalTitle.textContent = 'Edit User';
        const userId = user?.id || user?.user_id || user?.userId || user?.uid || '';
        if (editId) editId.value = userId;
        if (form && userId) form.dataset.editId = userId;
        console.debug('openEditUserModal set editId:', userId);
        if (emailField) { emailField.disabled = true; emailField.value = user.email || ''; }
        if (passwordField) { passwordField.required = false; passwordField.value = ''; passwordField.placeholder = ''; }
        if (fullNameField) fullNameField.value = user.full_name || user.email?.split('@')[0] || '';
        if (roleField) roleField.value = user.role || 'operator';
        if (plantField) plantField.value = user.plant || '';

        if (modalOverlay) { modalOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    } catch (e) {
        console.error('openEditUserModal error', e);
    }
};

// Initialize modal close / submit handlers for the modular feature
function initializeModalHandlers() {
    try {
        const modalOverlay = document.getElementById('userModalOverlay');
        const closeBtn = document.getElementById('closeUserModalBtn');
        const cancelBtn = document.getElementById('cancelUserFormBtn');
        const form = document.getElementById('userForm');

        const closeModal = () => {
            if (modalOverlay) modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            if (form) form.reset();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
                closeModal();
            }
        });

        if (form) {
            form.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                try {
                    const editIdEl = document.getElementById('userEditId');
                    const editIdFromInput = editIdEl ? editIdEl.value : '';
                    const editIdFromDataset = form && form.dataset ? form.dataset.editId : '';
                    const editId = editIdFromInput || editIdFromDataset || '';
                    const emailEl = document.getElementById('user_email');
                    const passwordEl = document.getElementById('user_password');
                    const fullNameEl = document.getElementById('user_full_name');
                    const roleEl = document.getElementById('user_role');
                    const plantEl = document.getElementById('user_plant');

                    const email = emailEl ? emailEl.value.trim() : '';
                    const password = passwordEl ? passwordEl.value : '';
                    const fullName = fullNameEl ? fullNameEl.value.trim() : '';
                    const role = roleEl ? roleEl.value : 'operator';
                    const plant = plantEl ? (plantEl.value.trim() || null) : null;

                    console.debug('user form submit', { editIdFromInput, editIdFromDataset, editId, email, fullName, role, plant });

                    if (editId) {
                        // Update profile
                        await UserService.update(editId, {
                            full_name: fullName || email.split('@')[0],
                            role,
                            plant
                        });
                        (window.showToast || console.log)('User updated', 'success');
                        closeModal();
                        await loadAndRender(currentPage);
                        return;
                    }

                    // Create new user profile (auth is handled by Firebase separately)
                    if (!email) {
                        (window.showToast || console.error)('Please provide a valid email', 'error');
                        return;
                    }

                    // Note: Firebase Auth user creation must be done by the user signing up,
                    // or through Firebase Admin SDK on the backend.
                    // Here we just create the profile record so when user signs up, their profile exists.
                    const newProfile = {
                        email,
                        full_name: fullName || email.split('@')[0],
                        role,
                        plant,
                        is_approved: true
                    };
                    
                    // Insert profile record
                    await UserService.create(newProfile);
                    (window.showToast || console.log)('User profile created. User can now sign up with this email.', 'success');
                    closeModal();
                    await loadAndRender(1);
                } catch (err) {
                    console.error('User form submit error', err);
                    // Handle common PostgREST / Supabase cases with clearer messages
                    if (err && (err.code === 'PGRST116' || err.code === 'NO_ROWS_UPDATED' || (err.message && err.message.includes('Cannot coerce the result')))) {
                        (window.showToast || console.error)('Update failed: no rows were updated. Check permissions and RLS policies.', 'error');
                    } else if (err && err.message) {
                        (window.showToast || console.error)(`Error saving user: ${err.message}`, 'error');
                    } else {
                        (window.showToast || console.error)('Error saving user', 'error');
                    }
                }
            });
        }
    } catch (e) {
        console.error('initializeModalHandlers error', e);
    }
}

