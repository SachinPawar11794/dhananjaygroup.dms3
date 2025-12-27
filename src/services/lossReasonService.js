import { supabase } from '../config/supabase.js';

/**
 * Loss Reason Service
 */
export class LossReasonService {
    static async getAll(page = 1, pageSize = 25) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('lossreason')
            .select('*', { count: 'exact' })
            .order('"Loss Reason"', { ascending: true })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    }

    static async getAllWithoutPagination() {
        const { data, error } = await supabase
            .from('lossreason')
            .select('*')
            .order('"Loss Reason"', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('lossreason')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(lossReason) {
        const { data, error } = await supabase
            .from('lossreason')
            .insert([lossReason])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, lossReason) {
        const { data, error } = await supabase
            .from('lossreason')
            .update(lossReason)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('lossreason')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('lossreason')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }
}

