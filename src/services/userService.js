import { supabase } from '../config/supabase.js';

/**
 * User/Profile Service
 */
export class UserService {
    static async getAll(page = 1, pageSize = 25) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(profile) {
        const { data, error } = await supabase
            .from('profiles')
            .insert([profile])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, profile) {
        // Use select() without .single() to detect zero-row updates (which often indicate RLS/permission issues)
        const { data, error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            const err = new Error('No rows were updated. This usually means the row does not exist or Row Level Security (RLS) prevented the update.');
            err.code = 'NO_ROWS_UPDATED';
            throw err;
        }
        return data[0];
    }

    static async delete(id) {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async approve(id) {
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async syncUsers() {
        // Prefer server-side RPC to perform sync (SECURITY DEFINER function).
        // This avoids using the admin API from the browser which is not allowed for anon clients.
        try {
            const { data, error } = await supabase.rpc('sync_all_auth_users_to_profiles');
            if (error) throw error;
            // Expect the RPC to return the number of synced rows (integer)
            const synced = (data && typeof data === 'number') ? data : (data && data.synced) ? data.synced : 0;
            return { synced };
        } catch (err) {
            // Rethrow to caller
            throw err;
        }
    }
}

