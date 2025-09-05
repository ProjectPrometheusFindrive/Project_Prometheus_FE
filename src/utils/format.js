// Utility functions for data formatting

export function formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

export function formatLocation(location) {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return "-";
    }
    return `${location.lat}, ${location.lng}`;
}

export function formatDateShort(dateStr) {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '.').replace(/\.$/, '');
    } catch {
        return dateStr;
    }
}