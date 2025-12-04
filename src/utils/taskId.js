/**
 * Task ID generation utility
 */

export function generateTaskId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TASK-${timestamp}-${random}`;
}

