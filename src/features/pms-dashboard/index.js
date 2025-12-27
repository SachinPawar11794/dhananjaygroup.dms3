import { supabase } from '../../config/supabase.js';

export async function initFeature(container = null) {
    try {
        // Settings count
        const { count: settingsCount } = await supabase
            .from('settings')
            .select('*', { count: 'exact', head: true });
        const settingsEl = document.getElementById("pmsSettingsCount");
        if (settingsEl) settingsEl.textContent = settingsCount || 0;

        // Process Master count
        const { count: processCount } = await supabase
            .from('process_master')
            .select('*', { count: 'exact', head: true });
        const processEl = document.getElementById("pmsProcessCount");
        if (processEl) processEl.textContent = processCount || 0;

        // Work Center Master count
        const { count: machineCount } = await supabase
            .from('workcentermaster')
            .select('*', { count: 'exact', head: true });
        const machineEl = document.getElementById("pmsMachineCount");
        if (machineEl) machineEl.textContent = machineCount || 0;

        // IoT recent
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { count: iotCount } = await supabase
            .from('iot_database')
            .select('*', { count: 'exact', head: true })
            .gte("Timestamp", yesterday.toISOString());
        const iotEl = document.getElementById("pmsIoTCount");
        if (iotEl) iotEl.textContent = iotCount || 0;

        // Shift schedule count
        const { count: shiftScheduleCount } = await supabase
            .from('shiftschedule')
            .select('*', { count: 'exact', head: true });
        const shiftEl = document.getElementById("pmsShiftScheduleCount");
        if (shiftEl) shiftEl.textContent = shiftScheduleCount || 0;

        // Loss Reason count
        const { count: lossReasonCount } = await supabase
            .from('lossreason')
            .select('*', { count: 'exact', head: true });
        const lossEl = document.getElementById("pmsLossReasonCount");
        if (lossEl) lossEl.textContent = lossReasonCount || 0;

        // Hourly report count
        const { count: hourlyReportCount } = await supabase
            .from('hourlyreport')
            .select('*', { count: 'exact', head: true });
        const hourlyEl = document.getElementById("pmsHourlyReportCount");
        if (hourlyEl) hourlyEl.textContent = hourlyReportCount || 0;

    } catch (err) {
        console.error('PMS dashboard load error', err);
    }
}

export function destroyFeature() {
    // nothing to teardown for dashboard
}


