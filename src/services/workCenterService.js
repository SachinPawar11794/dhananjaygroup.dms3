import { supabase } from '../config/supabase.js';

/**
 * Work Center Service
 * Provides helper methods for WorkCenterMaster table
 */
export class WorkCenterService {
    static async getDistinctPlants() {
        const { data, error } = await supabase
            .from('workcentermaster')
            .select('plant')
            .order('plant', { ascending: true });

        if (error) throw error;
        // Filter out null/empty values client-side
        const uniquePlants = [...new Set((data || []).map(item => item.plant).filter(Boolean))];
        return uniquePlants;
    }
}


