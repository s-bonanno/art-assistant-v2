export const CM_PER_INCH = 2.54;

export function convertToUnit(valueCm, targetUnit) {
    return targetUnit === 'in' ? valueCm / CM_PER_INCH : valueCm;
}

export function convertFromUnit(value, sourceUnit) {
    return sourceUnit === 'in' ? value * CM_PER_INCH : value;
} 