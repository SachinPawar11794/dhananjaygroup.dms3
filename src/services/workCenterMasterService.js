import { supabase } from '../config/supabase.js';

/**
 * Work Center Master Service
 */
export class WorkCenterMasterService {
    static async getAll(page = 1, pageSize = 25) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('WorkCenterMaster')
            .select('*', { count: 'exact' })
            .order('machine', { ascending: true })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    }

    static async getAllWithoutPagination() {
        const { data, error } = await supabase
            .from('WorkCenterMaster')
            .select('*')
            .order('machine', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('WorkCenterMaster')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async getIoTEnabledMachines(plant = null) {
        let query = supabase
            .from('WorkCenterMaster')
            .select('Machine, Plant')
            .eq('IoT Enabled', true)
            .order('Machine', { ascending: true });

        if (plant) {
            query = query.eq('Plant', plant);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    static async create(machine) {
        const { data, error } = await supabase
            .from('WorkCenterMaster')
            .insert([machine])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, machine) {
        const { data, error } = await supabase
            .from('WorkCenterMaster')
            .update(machine)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('WorkCenterMaster')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('WorkCenterMaster')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }
}

