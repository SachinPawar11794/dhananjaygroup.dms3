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
            query = query.eq('Plant', filters.plant);
        }

        if (filters.machine) {
            query = query.eq('"Machine No."', filters.machine);
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
            .select('Plant')
            .order('Plant', { ascending: true });

        if (error) throw error;
        const uniquePlants = [...new Set(data.map(item => item.Plant).filter(Boolean))];
        return uniquePlants;
    }

    static async getDistinctMachines(plant = null) {
        let query = supabase
            .from('iot_database')
            .select('"Machine No."')
            .order('"Machine No."', { ascending: true });

        if (plant) {
            query = query.eq('Plant', plant);
        }

        const { data, error } = await query;
        if (error) throw error;
        const uniqueMachines = [...new Set(data.map(item => item['Machine No.']).filter(Boolean))];
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

