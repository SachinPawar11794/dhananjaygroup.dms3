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
            .insert([profile]);

        if (error) throw error;
        // Return the inserted profile (adapter may not support .select() after insert)
        return data || profile;
    }

    static async update(id, profile) {
        const { error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', id);

        if (error) throw error;
        return { id, ...profile };
    }

    static async delete(id) {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async approve(id) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', id);

        if (error) throw error;
        return { id, is_approved: true };
    }

    static async syncUsers() {
        // Sync is not supported with Firebase Auth - users are synced automatically on signup
        throw new Error('Sync is not needed - users are automatically added to profiles when they sign up');
    }
}

