export const generateNumericId = (id) => {
    if (!id) return '000000';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const positiveHash = Math.abs(hash);
    return (positiveHash % 1000000).toString().padStart(6, '0');
};
