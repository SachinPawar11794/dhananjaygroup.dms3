import { supabase } from '../config/supabase.js';

/**
 * Shift Schedule Service
 */
export class ShiftScheduleService {
    static async getAll(page = 1, pageSize = 25, filters = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('shiftschedule')
            .select('*', { count: 'exact' })
            .order('plant', { ascending: true })
            .range(from, to);

        if (filters.plant) {
            query = query.eq('plant', filters.plant);
        }

        if (filters.shift) {
            query = query.eq('shift', filters.shift);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('shiftschedule')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(schedule) {
        const { data, error } = await supabase
            .from('shiftschedule')
            .insert([schedule])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, schedule) {
        const { data, error } = await supabase
            .from('shiftschedule')
            .update(schedule)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('shiftschedule')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('shiftschedule')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }

    static async getDistinctPlants() {
        const { data, error } = await supabase
            .from('shiftschedule')
            .select('plant')
            .order('plant', { ascending: true });

        if (error) throw error;
        const uniquePlants = [...new Set(data.map(item => item.plant).filter(Boolean))];
        return uniquePlants;
    }
}

