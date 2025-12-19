import { WorkCenterService } from '../services/workCenterService.js';

const STORAGE_KEY = 'dms_global_plant';

export const PlantFilter = {
    async initialize() {
        try {
            // Populate select with available plants from WorkCenterMaster
            await this.loadPlants();

            // Restore saved selection
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                window.globalPlant = saved;
                const sel = document.getElementById('globalPlantSelect');
                if (sel) sel.value = saved;
            } else {
                window.globalPlant = 'ALL';
            }

            // Listen for user changes
            const sel = document.getElementById('globalPlantSelect');
            if (sel) {
                sel.addEventListener('change', (e) => {
                    const val = e.target.value;
                    window.globalPlant = val;
                    try { localStorage.setItem(STORAGE_KEY, val); } catch (err) {}
                    window.dispatchEvent(new CustomEvent('globalPlantChanged', { detail: { plant: val } }));
                });
            }
        } catch (err) {
            console.error('PlantFilter init error', err);
        }
    },

    async loadPlants() {
        try {
            const sel = document.getElementById('globalPlantSelect');
            if (!sel) return;
            // Seed with ALL option
            sel.innerHTML = '<option value=\"ALL\">All Plants</option>';

            // Load plants from WorkCenterMaster table
            if (typeof WorkCenterService?.getDistinctPlants === 'function') {
                const plants = await WorkCenterService.getDistinctPlants();
                if (Array.isArray(plants) && plants.length) {
                    plants.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p;
                        opt.textContent = p;
                        sel.appendChild(opt);
                    });
                }
            }
        } catch (err) {
            console.error('Failed to load plants', err);
        }
    }
};


