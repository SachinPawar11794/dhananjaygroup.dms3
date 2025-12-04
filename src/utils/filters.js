/**
 * Filter utility functions
 */

export function filterProcessMasterData(data, searchTerm) {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
        return (
            (item.plant && item.plant.toLowerCase().includes(term)) ||
            (item.sap_code && item.sap_code.toLowerCase().includes(term)) ||
            (item.part_name && item.part_name.toLowerCase().includes(term)) ||
            (item.operation && item.operation.toLowerCase().includes(term)) ||
            (item.machine && item.machine.toLowerCase().includes(term)) ||
            (item.cell_name && item.cell_name.toLowerCase().includes(term))
        );
    });
}

export function filterWorkCenterMasterData(data, searchTerm) {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
        return (
            (item.machine && item.machine.toLowerCase().includes(term)) ||
            (item.plant && item.plant.toLowerCase().includes(term)) ||
            (item.id && item.id.toString().includes(term))
        );
    });
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

