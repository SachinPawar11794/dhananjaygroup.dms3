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
        const { data, error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
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
        // Get all auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) throw authError;

        // Get existing profiles
        const { data: existingProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email');

        if (profileError) throw profileError;

        const existingIds = new Set(existingProfiles.map(p => p.id));
        const newUsers = [];

        for (const user of authUsers.users) {
            if (!existingIds.has(user.id)) {
                newUsers.push({
                    id: user.id,
                    email: user.email,
                    full_name: user.email?.split('@')[0].replace(/[._]/g, ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ') || '',
                    role: 'operator',
                    plant: null,
                    is_approved: false
                });
            }
        }

        if (newUsers.length > 0) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert(newUsers);

            if (insertError) throw insertError;
        }

        return { synced: newUsers.length };
    }
}

