const _DELETE = Symbol();
const _OVERWRITE = Symbol();
const _REPLACE = Symbol();

export function deepClone<T>(item: T) : T {
    if (Array.isArray(item)) {
        return <any>item.map(element => deepClone(element));
    }

    if (typeof item === 'object') {
        const result : typeof item = <T>{};
        (<(keyof T)[]>Object.keys(item)).forEach((key: keyof T) => {
            result[key] = deepClone(item[key]);
        });
        return result;
    }

    return item;
}

export function deepMerge(left: any, right: any, ...rest: any[]) : any {
    if (rest.length) {
        return deepMerge(deepMerge(left, right), ...<[any]>rest);
    }

    if (Array.isArray(left)) {
        return deepClone(right);
    } else if (typeof left === 'object' && left !== null) {
        if (Array.isArray(right)) {
            return deepClone(right);
        } else if (typeof right === 'object' && right !== null) {
            const actualLeft = deepClone(left);
            Object.keys(right).forEach(key => {
                const clonedRight = deepClone(right[key]);
                if (clonedRight === DELETE) {
                    delete actualLeft[key];
                }
                actualLeft[key] = deepMerge(actualLeft[key], deepClone(right[key]));
            });
            return actualLeft;
        } else {
            return deepClone(right);
        }
    } else {
        return deepClone(right);
    }
}


export function getDeepKeys(data: any, prefixes: string[] = []): string[] {
    if (Array.isArray(data) || data === null || typeof data !== 'object') {
        return [prefixes.join('.')];
    }

    return Object.keys(data).reduce((keys, key) => {
        keys.push(...getDeepKeys(data[key], prefixes.concat(key)));
        return keys;
    }, [] as string[])
}

export function getDeepProperty(data: any, property: string): any {
    const keys = property.split('.').filter(a => a);
    let current = data;
    for (let i = 0; i < keys.length; i++) {
        if (typeof current !== 'object' || current === null) {
            return undefined;
        }

        const key = keys[i];
        current = current[key];
    }

    return current;
}
export function firstKey(obj: any) : keyof typeof obj | undefined {
    // noinspection LoopStatementThatDoesntLoopJS
    for (let prop in obj) {
        return prop;
    }
}

export function DELETE() {
    return _DELETE;
}

export function REPLACE<T extends Array<any>>(arr: T) {
    return {
        [_REPLACE]: arr
    };
}

export function OVERWRITE<T extends Array<any>>(arr: T) {
    return {
        [_OVERWRITE]: arr
    }
}
