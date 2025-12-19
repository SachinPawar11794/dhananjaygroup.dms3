import { supabase } from '../config/supabase.js';

/**
 * Work Center Service
 * Provides helper methods for WorkCenterMaster table
 */
export class WorkCenterService {
    static async getDistinctPlants() {
        const { data, error } = await supabase
            .from('WorkCenterMaster')
            .select('Plant')
            .not('Plant', 'is', null)
            .order('Plant', { ascending: true });

        if (error) throw error;
        const uniquePlants = [...new Set((data || []).map(item => item.Plant).filter(Boolean))];
        return uniquePlants;
    }
}


