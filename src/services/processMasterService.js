import { supabase } from '../config/supabase.js';

/**
 * Process Master Service
 */
export class ProcessMasterService {
    static async getAll(page = 1, pageSize = 25) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('ProcessMaster')
            .select('*', { count: 'exact' })
            .order('sr_no', { ascending: true })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    }

    static async getAllWithoutPagination() {
        const { data, error } = await supabase
            .from('ProcessMaster')
            .select('*')
            .order('sr_no', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('ProcessMaster')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(process) {
        const { data, error } = await supabase
            .from('ProcessMaster')
            .insert([process])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, process) {
        const { data, error } = await supabase
            .from('ProcessMaster')
            .update(process)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('ProcessMaster')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('ProcessMaster')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }

    static async getByPartNo(partNo) {
        const { data, error } = await supabase
            .from('ProcessMaster')
            .select('*')
            .eq('sap_code', partNo);

        if (error) throw error;
        return data;
    }
}

