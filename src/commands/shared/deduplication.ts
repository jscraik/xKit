/**
 * Deduplication utilities
 * Remove duplicate items based on key extraction
 */

/**
 * Deduplicate items by a key function
 */
export function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
        const key = keyFn(item);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    return unique;
}

/**
 * Deduplicate items by a property name
 */
export function deduplicateByProperty<T>(items: T[], property: keyof T): T[] {
    return deduplicateByKey(items, (item) => String(item[property]));
}

/**
 * Find duplicate items by key function
 */
export function findDuplicates<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    const duplicates: T[] = [];

    for (const item of items) {
        const key = keyFn(item);
        if (seen.has(key)) {
            duplicates.push(item);
        } else {
            seen.add(key);
        }
    }

    return duplicates;
}

/**
 * Group items by key function
 */
export function groupByKey<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const item of items) {
        const key = keyFn(item);
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
    }

    return groups;
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats<T>(
    original: T[],
    deduplicated: T[]
): {
    originalCount: number;
    uniqueCount: number;
    duplicateCount: number;
    deduplicationRate: number;
} {
    const duplicateCount = original.length - deduplicated.length;
    return {
        originalCount: original.length,
        uniqueCount: deduplicated.length,
        duplicateCount,
        deduplicationRate: original.length > 0 ? duplicateCount / original.length : 0,
    };
}
