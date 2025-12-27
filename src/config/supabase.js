// Adapter that replaces Supabase data access with our backend API.
// Backend expects POST /query with a Supabase-style query object.
const getBackendBase = () => {
  if (typeof window === 'undefined') return '';
  if (window.__BACKEND_API_URL__) return window.__BACKEND_API_URL__;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // Production: use Cloud Run backend directly
  return 'https://dms-api-169633813068.asia-south1.run.app';
};

const BASE_URL = getBackendBase();

function createQueryAdapter(table) {
  const state = {
    table,
    action: 'select',
    select: '*',
    filters: [],
    order: null,
    range: null,
    limit: null,
    payload: null,
    single: false,
    count: null,
    orRaw: null,
    not: null,
    upsertOpts: null
  };

  const q = {
    from() { return q; },
    select(selectStr, opts) {
      if (selectStr) state.select = selectStr;
      if (opts && opts.count) state.count = opts.count;
      state.action = 'select';
      return q;
    },
    eq(column, value) { state.filters.push({ type: 'eq', column, value }); return q; },
    neq(column, value) { state.filters.push({ type: 'neq', column, value }); return q; },
    gt(column, value) { state.filters.push({ type: 'gt', column, value }); return q; },
    gte(column, value) { state.filters.push({ type: 'gte', column, value }); return q; },
    lt(column, value) { state.filters.push({ type: 'lt', column, value }); return q; },
    lte(column, value) { state.filters.push({ type: 'lte', column, value }); return q; },
    like(column, value) { state.filters.push({ type: 'like', column, value }); return q; },
    ilike(column, value) { state.filters.push({ type: 'ilike', column, value }); return q; },
    is(column, value) { state.filters.push({ type: 'is', column, value }); return q; },
    in(column, values) { state.filters.push({ type: 'in', column, value: values }); return q; },
    not(column, op, value) { state.not = { column, op, value }; return q; },
    or(raw) { state.orRaw = raw; return q; },
    order(column, opts = {}) { state.order = { column, ascending: !!opts.ascending }; return q; },
    limit(count) { state.limit = count; return q; },
    range(from, to) { state.range = { from, to }; return q; },
    insert(arr) { state.action = 'insert'; state.payload = Array.isArray(arr) ? arr : [arr]; return q; },
    update(obj) { state.action = 'update'; state.payload = obj; return q; },
    upsert(arr, opts) { state.action = 'upsert'; state.payload = Array.isArray(arr) ? arr : [arr]; state.upsertOpts = opts; return q; },
    delete() { state.action = 'delete'; return q; },
    single() { state.single = true; return q; },
    maybeSingle() { state.single = true; return q; },
    async then(resolve, reject) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        // Attach Firebase ID token when available so protected backend ops succeed
        if (typeof window !== 'undefined' && window.firebaseAuth && window.firebaseAuth.currentUser) {
          try {
            const token = await window.firebaseAuth.currentUser.getIdToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
          } catch (err) {
            // ignore token errors; backend will enforce auth if needed
            // console.warn('Could not get ID token', err);
          }
        }

        const resp = await fetch(`${BASE_URL}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify(state)
        });
        const json = await resp.json();
        if (state.single) {
          if (Array.isArray(json.data)) json.data = json.data[0] || null;
        }
        resolve(json);
      } catch (err) {
        reject({ data: null, error: { message: err.message || String(err) } });
      }
    }
  };
  return q;
}

const supabase = {
  from(table) {
    return createQueryAdapter(table);
  },
  // RPC is not supported in this adapter - return error to trigger fallback
  rpc(fnName, params) {
    return Promise.resolve({ data: null, error: { message: 'RPC not supported in this adapter' } });
  },
  // Auth is handled by Firebase, not this adapter
  auth: {
    admin: {
      createUser: () => Promise.resolve({ data: null, error: { message: 'Use Firebase Auth for user management' } })
    }
  }
};

export { supabase };

if (typeof window !== 'undefined') {
  window.supabase = supabase;
  document.supabase = supabase;
}


