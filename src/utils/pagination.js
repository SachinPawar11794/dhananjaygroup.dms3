/**
 * Pagination utility functions
 */

export function createPaginationState(pageSize = 25) {
    return {
        currentPage: 1,
        pageSize: pageSize,
        totalItems: 0,
        totalPages: 0,
        searchTerm: ''
    };
}

export function calculatePaginationInfo(state) {
    const start = state.totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
    const end = Math.min(state.currentPage * state.pageSize, state.totalItems);
    return { start, end };
}

export function renderPaginationControls(
    containerId,
    state,
    onPageChange,
    onPageSizeChange
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { start, end } = calculatePaginationInfo(state);
    const info = container.querySelector('.pagination-info span');
    const prevBtn = container.querySelector('.pagination-btn[id$="PrevBtn"]');
    const nextBtn = container.querySelector('.pagination-btn[id$="NextBtn"]');
    const pageNumbers = container.querySelector('.pagination-pages');
    const pageSizeSelect = container.querySelector('.pagination-select');

    // Update info
    if (info) {
        info.textContent = `Showing ${start}-${end} of ${state.totalItems}`;
    }

    // Update buttons
    if (prevBtn) {
        prevBtn.disabled = state.currentPage === 1;
        prevBtn.onclick = () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                onPageChange(state.currentPage);
            }
        };
    }

    if (nextBtn) {
        nextBtn.disabled = state.currentPage >= state.totalPages;
        nextBtn.onclick = () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                onPageChange(state.currentPage);
            }
        };
    }

    // Update page size selector
    if (pageSizeSelect) {
        pageSizeSelect.value = state.pageSize;
        pageSizeSelect.onchange = (e) => {
            state.pageSize = parseInt(e.target.value);
            state.currentPage = 1;
            onPageSizeChange(state.pageSize);
        };
    }

    // Render page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        const maxPages = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(state.totalPages, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-page';
            firstBtn.textContent = '1';
            firstBtn.onclick = () => {
                state.currentPage = 1;
                onPageChange(1);
            };
            pageNumbers.appendChild(firstBtn);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pageNumbers.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-page ${i === state.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                state.currentPage = i;
                onPageChange(i);
            };
            pageNumbers.appendChild(pageBtn);
        }

        if (endPage < state.totalPages) {
            if (endPage < state.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pageNumbers.appendChild(ellipsis);
            }

            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-page';
            lastBtn.textContent = state.totalPages;
            lastBtn.onclick = () => {
                state.currentPage = state.totalPages;
                onPageChange(state.totalPages);
            };
            pageNumbers.appendChild(lastBtn);
        }
    }
}

