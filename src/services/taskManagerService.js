import { supabase } from '../config/supabase.js';

/**
 * Task Manager Service
 */
export class TaskManagerService {
    static async getAll(page = 1, pageSize = 25, filters = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('TaskManager')
            .select('*', { count: 'exact' })
            .order('planned_date', { ascending: false })
            .range(from, to);

        if (filters.plant) {
            query = query.eq('plant', filters.plant);
        }

        if (filters.frequency) {
            query = query.eq('frequency', filters.frequency);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            query = query.or(`task_id.ilike.%${term}%,plant.ilike.%${term}%,name.ilike.%${term}%,task.ilike.%${term}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('TaskManager')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async create(task) {
        const { data, error } = await supabase
            .from('TaskManager')
            .insert([task])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async update(id, task) {
        const { data, error } = await supabase
            .from('TaskManager')
            .update(task)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('TaskManager')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('TaskManager')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }

    static async getStats() {
        const { data, error } = await supabase
            .from('TaskManager')
            .select('status');

        if (error) throw error;

        const stats = {
            total: data.length,
            open: data.filter(t => t.status === 'Planned').length,
            overdue: data.filter(t => {
                if (t.status !== 'Planned') return false;
                const plannedDate = new Date(t.planned_date);
                return plannedDate < new Date() && !t.actual_date;
            }).length
        };

        return stats;
    }
}

