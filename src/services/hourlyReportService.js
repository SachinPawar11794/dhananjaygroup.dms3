import { supabase } from '../config/supabase.js';

/**
 * Hourly Report Service
 */
export class HourlyReportService {
    static async getAll(page = 1, pageSize = 25, filters = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('hourlyreport')
            .select('*', { count: 'exact' })
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .range(from, to);

        if (filters.date) {
            query = query.eq('date', filters.date);
        }

        if (filters.shift) {
            query = query.eq('shift', filters.shift);
        }

        if (filters.hideArchived) {
            query = query.eq('archive_status', 'Active');
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data, count };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('hourlyreport')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async generateReport(reportData) {
        const { data, error } = await supabase
            .from('hourlyreport')
            .insert(reportData)
            .select();

        if (error) throw error;
        return data;
    }

    static async archiveOldReports(archiveFrequencyDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - archiveFrequencyDays);

        const { data, error } = await supabase
            .from('hourlyreport')
            .update({ archive_status: 'Archived' })
            .lt('date', cutoffDate.toISOString().split('T')[0])
            .eq('archive_status', 'Active')
            .select();

        if (error) throw error;
        return data;
    }

    static async getCount() {
        const { count, error } = await supabase
            .from('hourlyreport')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    }
}

