import {IEntity} from "../types/Entity";
import {IBucketStore, IBucketStoreProvider} from "./daiquiri/DataStore";
import EventEmitter, {IEvent} from "../util/EventEmitter";
import {IEntityContext} from "./Entity";

export interface ISystemCallback<C> {
    <T>(event: IEvent<T>, entities: IEntity<C>[]): void
}

export interface ISystemRegistry<E, C> {
    register(name: string, definition: string, eventNames: string[], callback: ISystemCallback<C>): void;
}

interface ISystemRegistryCallback<E, C> {
    (registy: ISystemRegistry<E, C>): void;
}

export interface ISystemContext {
    emit<T>(eventName: string, data: T): void;
}

interface ISystemContextFactory<E, C> {
    bucketStore: IBucketStore,
    createSystemContext(entityContext: IEntityContext<E, C>): ISystemContext;
}

export default function createSystemContextFactory<E, C>(bucketStoreProvider: IBucketStoreProvider, callback: ISystemRegistryCallback<E, C>) : ISystemContextFactory<E, C> {
    const systemMap: {[systemName: string]: {definition: string, eventNames: string[], callback: ISystemCallback<C>}} = {};
    const registry: ISystemRegistry<E, C> = {
        register(name, definition, eventNames, callback) {
            if (systemMap[name]) {
                throw new Error('System ' + name + ' already registered');
            }

            systemMap[name] = {
                definition,
                eventNames,
                callback
            };
        }
    };

    callback(registry);

    const bucketStoreOptions : {[key: string]: string} = {};

    for (let systemName in systemMap) {
        const {definition} = systemMap[systemName];
        bucketStoreOptions[systemName] = definition;
    }

    const bucketStore = bucketStoreProvider.createBucketStore(bucketStoreOptions);

    return {
        createSystemContext(entityContext) {
            const eventEmitter = new EventEmitter();

            for (let systemName in systemMap) {
                const {eventNames, callback} = systemMap[systemName];
                eventNames.forEach(eventName => {
                    eventEmitter.on(eventName, event => {
                        const items = [...bucketStore.getBucketItems(systemName)];
                        if (items.length) {
                            callback(event, items.map(entityId => entityContext.getEntityById(entityId)));
                        }

                    });
                });
            }

            return {
                emit<T>(eventName: string, data: T) {
                    return eventEmitter.emit(eventName, data);
                }
            };
        },
        bucketStore: bucketStore
    };
}
