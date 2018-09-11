import {IBucketStore} from "./daiquiri/DataStore";
import {IComponentContext, mapDefaults} from "./Component";
import {IEntity, IEntityDefinition, IEntityNames} from "../types/Entity";
import {IComponentNames, IComponents} from "../types/Component";
import {deepClone, deepMerge, DELETE, getDeepKeys, getDeepProperty} from "../util/Object";
import uuid from 'uuid/v4';

export interface IEntityContext<E, C> {
    getEntityById(entityId: string): IEntity<C>
    createEntity(entityName: IEntityNames<E, C>): IEntity<C>
    destroyEntity(entityId: string): void;
}

export interface IEntityRegistry<E, C> {
    register(entityName: IEntityNames<E, C>, definition: IEntityDefinition<E, C>): void
}

interface IEntityRegistryCallback<E, C> {
    (registry: IEntityRegistry<E, C>) : void;
}
type EntityDefinitions<E, C> = {[entityName in IEntityNames<E, C>]: IEntityDefinition<E, C>};

function resolveEntity<E, C>(entityName: IEntityNames<E, C>, entityDefinitions: EntityDefinitions<E, C>, resolvedEntities: EntityDefinitions<E, C>, componentContext: IComponentContext<C>, names: Set<string> = new Set()) : IEntityDefinition<E, C> {
    if (names.has(entityName)) {
        throw new Error('Circular reference in entity: ' + entityName);
    }

    if (resolvedEntities[entityName]) {
        return resolvedEntities[entityName];
    }

    if (!entityDefinitions[entityName]) {
        throw new Error('Undefined entity: ' + entityName);
    }

    const definition = entityDefinitions[entityName];

    const resolvedEntityDefinition : IEntityDefinition<E, C> = <any> {
        inherits: [],
        components: [],
        defaults: {}
    };

    if (definition.inherits) {
        const {names: superEntityNames, entities: resolvedSuperEntities} : {names: IEntityNames<E, C>[], entities: IEntityDefinition<E, C>[]} = definition.inherits.reduce((superEntityData, superEntityName) => {
            const newNames = new Set(names);
            newNames.add(entityName);

            const resolvedSuperEntity = resolveEntity(superEntityName, entityDefinitions, resolvedEntities, componentContext, newNames);

            const inheritances = resolvedSuperEntity.inherits || [];

            superEntityData.names.push(...inheritances, superEntityName);

            superEntityData.entities.push(...inheritances.map(inherited => {
                return resolvedEntities[inherited];
            }), resolvedEntities[superEntityName]);

            return superEntityData;
        }, {names: [], entities: []} as {names: IEntityNames<E, C>[], entities: IEntityDefinition<E, C>[]});

        const resolvedSuperEntityNames = [...new Set(superEntityNames)];

        const components = [...new Set(resolvedSuperEntities.reduce((componentList, superEntity) => {
            componentList.push(...superEntity.components);
            return componentList;
        }, [] as IComponentNames<C>[]))];

        const componentDefaults = resolvedSuperEntities.reduce((componentData, superEntity) => {
            return deepMerge(componentData, superEntity.defaults);
        }, {} as {[K in IComponentNames<C>]: IComponents<C>[K]});

        resolvedEntityDefinition.inherits = resolvedSuperEntityNames;
        resolvedEntityDefinition.components = components;
        resolvedEntityDefinition.defaults = componentDefaults;
    }

    resolvedEntityDefinition.components = [...new Set([...(resolvedEntityDefinition.components || []), ...(definition.components || [])])];

    const componentDefaults = (resolvedEntityDefinition.components || []).reduce((componentDefaults, componentName) => {
        componentDefaults[componentName] = componentContext.getComponentDefaults(componentName) || {};
        return componentDefaults;
    }, {} as {[K in IComponentNames<C>]: IComponents<C>[K]});

    resolvedEntityDefinition.defaults = deepMerge(componentDefaults, resolvedEntityDefinition.defaults || {}, mapDefaults(definition.defaults || {}));

    resolvedEntities[entityName] = resolvedEntityDefinition;

    return resolvedEntityDefinition;
}

export default function createEntityContext<E, C>(bucketStore: IBucketStore, componentContext: IComponentContext<C>, callback: IEntityRegistryCallback<E, C>) : IEntityContext<E, C> {
    let entityDefinitions = <EntityDefinitions<E, C>>{};
    const resolvedEntities = <EntityDefinitions<E, C>>{};

    const registry: IEntityRegistry<E, C> = {
        register(entityName, definition) {
            entityDefinitions[entityName] = definition;
        }
    };

    callback(registry);

    for (let entityName in entityDefinitions) {
        resolveEntity(<IEntityNames<E, C>>entityName, entityDefinitions, resolvedEntities, componentContext);
    }

    entityDefinitions = <any>{};

    const entityMeta : WeakMap<IEntity<C>, {inherits: string[], name: IEntityNames<E, C>, components: Set<string>, id: string, componentData: {[K in IComponentNames<C>]?: IComponents<C>[K]}}> = new WeakMap();

    function getMeta(entity: IEntity<C>) {
        const meta = entityMeta.get(entity);
        if (!meta) {
            throw new Error('Entity has been destroyed.');
        }

        return meta;
    }

    class Entity implements IEntity<C> {
        constructor(id: string, name: IEntityNames<E, C>) {
            const inherits = resolvedEntities[name].inherits || [];
            const components = new Set(resolvedEntities[name].components || []);
            entityMeta.set(this, {inherits, components: new Set(), name, id, componentData: {}});

            bucketStore.addEntity(id, inherits);
            components.forEach(componentName => {
                this.addComponent(componentName);
            });
        }

        public get id() : string {
            return getMeta(this).id;
        }

        public addComponent<K extends IComponentNames<C>>(componentName: K) : void {
            const meta = getMeta(this);
            if (!meta.components.has(componentName)) {
                const entityComponentDefaults = (<any>resolvedEntities[meta.name].defaults || {})[componentName];
                const componentDefaults = entityComponentDefaults || componentContext.getComponentDefaults(componentName) || {}
                meta.components.add(componentName);
                bucketStore.addEntityComponent(meta.id, componentName);
                this.set(componentName, componentDefaults);
            }
        }

        public removeComponent<K extends IComponentNames<C>>(componentName: K): void {
            const meta = getMeta(this);
            if (meta.components.has(componentName)) {
                meta.components.delete(componentName);
                bucketStore.removeEntityComponent(meta.id, componentName);
            }
        }

        public set<K extends IComponentNames<C>>(componentName: K, data: {[key in keyof IComponents<C>[K]]?: IComponents<C>[K][key]}): void {
            const meta = getMeta(this);
            if (!meta.components.has(componentName)) {
                throw new Error('Entity ' + meta.id + ' does not have component: ' + componentName);
            }

            const cloned = deepClone(data);
            const deepKeys = getDeepKeys(cloned);

            deepKeys.forEach(deepKey => {
                const newValue = getDeepProperty(cloned, deepKey);
                const oldValue = getDeepProperty(meta.componentData[componentName] || {}, deepKey);
                bucketStore.setEntityComponentData(meta.id, componentName, deepKey, newValue, oldValue);
            });

            meta.componentData[componentName] = deepMerge(meta.componentData[componentName] || {}, data);
        }

        public get<K extends IComponentNames<C>>(componentName: K): IComponents<C>[K] | undefined {
            const meta = getMeta(this);
            return meta.componentData[componentName];
        }

        public has(componentName: IComponentNames<C>): boolean {
            const meta = getMeta(this);
            return meta.componentData.hasOwnProperty(componentName);
        }
    }

    const entitiesById : {[id: string]: IEntity<C>} = {};

    return {
        createEntity(entityName) {
            const entityId = uuid();
            const entity = new Entity(entityId, entityName);
            entitiesById[entityId] = entity;
            return entity;
        },
        destroyEntity(entityId) {
            if (entitiesById[entityId]) {
                const entity : IEntity<C> = entitiesById[entityId];
                delete entitiesById[entityId];
                const meta = entityMeta.get(entity);
                if (meta) {
                    entityMeta.delete(entity);
                    bucketStore.removeEntity(entityId, meta.inherits);
                    for (let component of meta.components) {
                        bucketStore.removeEntityComponent(entityId, component);
                    }
                }
            }
        },
        getEntityById(entityId) {
            if (entitiesById[entityId]) {
                return entitiesById[entityId];
            }
            throw new Error('No entity exists with id: ' + entityId);
        }
    };
}
