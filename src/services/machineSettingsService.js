import { supabase } from '../config/supabase.js';

/**
 * Machine Settings Service
 */
export class MachineSettingsService {
    static async getAll(page = 1, pageSize = 25) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('settings')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    }

    static async getAllWithoutPagination() {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(settings) {
        const { data, error } = await supabase
            .from('settings')
            .insert([settings])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, settings) {
        const { data, error } = await supabase
            .from('settings')
            .update(settings)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('settings')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('settings')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }
}

