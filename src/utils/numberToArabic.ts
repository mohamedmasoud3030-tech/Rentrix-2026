/**
 * Converts numbers to Arabic words (Tafneeta)
 */
export function tafneeta(number: number): string {
    if (isNaN(number)) return '';
    
    // Simple implementation for now
    const formatter = new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
    });
    
    return formatter.format(number);
}
