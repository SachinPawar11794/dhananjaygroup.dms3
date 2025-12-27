import { supabase } from '../config/supabase.js';

/**
 * IoT Data Service
 */
export class IoTDataService {
    static async getAll(page = 1, pageSize = 25, filters = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('iot_database')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .range(from, to);

        if (filters.plant) {
            query = query.eq('plant', filters.plant);
        }

        if (filters.machine) {
            query = query.eq('machine_no', filters.machine);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('iot_database')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async getDistinctPlants() {
        const { data, error } = await supabase
            .from('iot_database')
            .select('plant')
            .order('plant', { ascending: true });

        if (error) throw error;
        const uniquePlants = [...new Set(data.map(item => item.plant).filter(Boolean))];
        return uniquePlants;
    }

    static async getDistinctMachines(plant = null) {
        let query = supabase
            .from('iot_database')
            .select('machine_no')
            .order('machine_no', { ascending: true });

        if (plant) {
            query = query.eq('plant', plant);
        }

        const { data, error } = await query;
        if (error) throw error;
        const uniqueMachines = [...new Set(data.map(item => item.machine_no).filter(Boolean))];
        return uniqueMachines;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('iot_database')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }
}

