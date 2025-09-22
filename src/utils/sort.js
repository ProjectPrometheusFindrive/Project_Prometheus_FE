const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

const toNumber = (value) => {
    if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
    }
    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/,/g, "").trim();
        if (normalized === "") return null;
        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.getTime();
    }
    return null;
};

const toTimestamp = (value) => {
    if (value instanceof Date) {
        const timestamp = value.getTime();
        return Number.isNaN(timestamp) ? null : timestamp;
    }
    if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        const timestamp = Date.parse(trimmed);
        return Number.isNaN(timestamp) ? null : timestamp;
    }
    return null;
};

const toBoolean = (value) => {
    if (value === null || value === undefined) return null;
    return Boolean(value);
};

/**
 * Compare two values by sort type and direction.
 * @param {*} aValue
 * @param {*} bValue
 * @param {"string"|"number"|"date"|"boolean"} sortType
 * @param {"asc"|"desc"} direction
 * @returns {number}
 */
export const compareValues = (aValue, bValue, sortType = "string", direction = "asc") => {
    const dir = direction === "desc" ? -1 : 1;
    const aIsNull = aValue === null || aValue === undefined;
    const bIsNull = bValue === null || bValue === undefined;

    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return 1 * dir;
    if (bIsNull) return -1 * dir;

    switch (sortType) {
        case "number": {
            const aNum = toNumber(aValue);
            const bNum = toNumber(bValue);
            const aNumIsNull = aNum === null || Number.isNaN(aNum);
            const bNumIsNull = bNum === null || Number.isNaN(bNum);
            if (aNumIsNull && bNumIsNull) return 0;
            if (aNumIsNull) return 1 * dir;
            if (bNumIsNull) return -1 * dir;
            if (aNum === bNum) return 0;
            return aNum > bNum ? 1 * dir : -1 * dir;
        }
        case "date": {
            const aTime = toTimestamp(aValue);
            const bTime = toTimestamp(bValue);
            const aTimeIsNull = aTime === null || Number.isNaN(aTime);
            const bTimeIsNull = bTime === null || Number.isNaN(bTime);
            if (aTimeIsNull && bTimeIsNull) return 0;
            if (aTimeIsNull) return 1 * dir;
            if (bTimeIsNull) return -1 * dir;
            if (aTime === bTime) return 0;
            return aTime > bTime ? 1 * dir : -1 * dir;
        }
        case "boolean": {
            const aBool = toBoolean(aValue);
            const bBool = toBoolean(bValue);
            const aBoolIsNull = aBool === null;
            const bBoolIsNull = bBool === null;
            if (aBoolIsNull && bBoolIsNull) return 0;
            if (aBoolIsNull) return 1 * dir;
            if (bBoolIsNull) return -1 * dir;
            if (aBool === bBool) return 0;
            return aBool ? 1 * dir : -1 * dir;
        }
        default: {
            const comparison = collator.compare(String(aValue), String(bValue));
            return comparison * dir;
        }
    }
};

