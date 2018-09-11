import {_APPEND, _DELETE, _OVERWRITE, _REPLACE} from "../types/Types";

function isArrayOperation(value: any) {
    return value === _APPEND || value === _OVERWRITE || value === _REPLACE;
}

export function deepClone<T>(item: T) : T {
    if (Array.isArray(item)) {
        return <any>item.map(element => deepClone(element));
    }

    const operation = item && typeof item === 'object' && firstKey(item);
    if  (operation && isArrayOperation(operation)) {
        return deepClone((<any>item)[operation]);
    }

    if (typeof item === 'object') {
        const result : typeof item = <T>{};
        for (let key in item) {
            result[key] = deepClone(item[key]);
        }
        return result;
    }

    return item;
}

export function deepMerge(left: any, right: any, ...rest: any[]) : any {
    if (rest.length) {
        return deepMerge(deepMerge(left, right), ...<[any]>rest);
    }

    const rightFirstKey = (typeof right === 'object') && right !== null && firstKey(right);
    const rightOperation = rightFirstKey && isArrayOperation(rightFirstKey) && rightFirstKey;
    const rightValue = rightOperation? right[rightOperation] : right;


    if (left === null || (typeof left !== 'object') || rightValue === null || (typeof rightValue !== 'object')) {
        return deepClone(rightValue);
    }

    if (Array.isArray(left)) {
        if (Array.isArray(rightValue) && !rightOperation) {
            return deepClone(rightValue);
        }

        if (rightOperation === _REPLACE) {
            return deepClone(rightValue);
        }

        if (rightOperation === _OVERWRITE) {
            const baseArray = deepClone(left);
            const targetArray = deepClone(rightValue);
            targetArray.forEach((element: any, i: number) => {
                if (i < baseArray.length) {
                    baseArray[i] = deepMerge(baseArray[i], element);
                } else {
                    baseArray.push(element);
                }
            });
            return baseArray;
        }

        if (rightOperation === _APPEND) {
            const baseArray = deepClone(left);
            const targetArray = deepClone(rightValue);
            return baseArray.concat(targetArray);
        }

        return deepClone(rightValue);
    }

    const targetObject = deepClone(left);
    const mergingObject = deepClone(rightValue);

    if (Array.isArray(rightValue)) {
        return mergingObject;
    }

    for (let key in mergingObject) {
        const rightVal = rightValue[key];
        if (rightVal === _DELETE) {
            delete targetObject[key];
        } else {
            targetObject[key] = deepMerge(targetObject[key], rightValue[key]);
        }
    }

    return targetObject;
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

    const symbols = Object.getOwnPropertySymbols(obj);
    if (symbols.length) {
        return symbols[0];
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
    };
}

export function APPEND<T extends Array<any>>(arr: T) {
    return {
        [_APPEND]: arr
    };
}
