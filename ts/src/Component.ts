import {IComponentNames, IComponents} from "../types/Component";
import {deepClone, firstKey} from "../util/Object";

export interface IComponentContext<C> {
    getComponentDefaults<K extends IComponentNames<C>>(name: K) : IComponents<C>[K];
}

export interface IComponentRegistry<C> {
    register<K extends IComponentNames<C>>(componentName: K, defaults: IComponents<C>[K]): void;
}

export interface IComponentContextCallback<C> {
    (registry: IComponentRegistry<C>): void;
}

export function mapDefaults(data: any): any {
    if (Array.isArray(data) || data === null || typeof data !== 'object') {
        return deepClone(data);
    }

    if (firstKey(data) === '__key__') {
        return {};
    }

    const result : any = {};

    for (let prop in data) {
        result[prop] = mapDefaults(data[prop]);
    }

    return result;
}

export default function createComponentContext<C>(callback: IComponentContextCallback<C>) : IComponentContext<C> {
    const registeredComponents: {[K in IComponentNames<C>]: IComponents<C>[K]} = <any>{};

    const registry: IComponentRegistry<C> = {
        register(componentName, defaults) {
            registeredComponents[componentName] = mapDefaults(defaults);
        }
    };

    callback(registry);

    return {
        getComponentDefaults(name) {
            return deepClone(registeredComponents[name] || {});
        }
    };
}
