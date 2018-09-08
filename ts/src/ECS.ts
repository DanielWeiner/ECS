import {IBucketStoreProvider} from "./daiquiri/DataStore";
import {default as createEntityContext, IEntityContext, IEntityRegistry} from "./Entity";
import {default as createComponentContext, IComponentContext, IComponentRegistry} from "./Component";
import {default as createSystemContextFactory, ISystemCallback, ISystemContext, ISystemRegistry} from "./System";
import {IEntities, IEntityDefinition, IEntityNames} from "../types/Entity";
import {IComponentNames, IComponents} from "../types/Component";
import Parser from "./daiquiri/Daiquiri";

export interface IECSContext<E, C> {
    Entity: IEntityContext<E, C>
    Component: IComponentContext<C>
    System: ISystemContext
}

interface IECSContextRegistry<E, C> {
    Entity: IEntityRegistry<E, C>,
    Component: IComponentRegistry<C>,
    System: ISystemRegistry<E, C>
}

interface IECSContextCallback<E, C> {
    (registry: IECSContextRegistry<E, C>): void;
}

function createEcsContext<E, C>(bucketStoreProvider: IBucketStoreProvider, callback: IECSContextCallback<E, C>) : IECSContext<E, C> {
    const registeredEntities = <{[K in IEntityNames<E, C>]: IEntities<E, C>[K]}>{};
    const registeredComponents = <{[K in IComponentNames<C>]: IComponents<C>[K]}>{};
    const registeredSystems: {[systemName: string]: {definition: string, eventNames: string[], callback: ISystemCallback<C>}} = {}

    const registry: IECSContextRegistry<E, C> = {
        Entity: {
            register(entityName, definition) {
                registeredEntities[entityName] = definition;
            }
        },
        Component: {
            register(componentName, defaults) {
                registeredComponents[componentName] = defaults;
            }
        },
        System: {
            register(systemName, definition, eventNames, callback) {
                registeredSystems[systemName] = {definition, eventNames, callback};
            }
        }
    };

    callback(registry);

    const systemContextFactory = createSystemContextFactory<E, C>(bucketStoreProvider, (registy => {
        for (let systemName in registeredSystems) {
            const {definition, eventNames, callback} = registeredSystems[systemName];
            registy.register(systemName, definition, eventNames, callback);
        }
    }));

    const componentContext = createComponentContext<C>(registry => {
        (<IComponentNames<C>[]>Object.keys(registeredComponents)).forEach(componentName => {
            registry.register(componentName, registeredComponents[componentName]);
        });
    });

    const entityContext = createEntityContext<E, C>(systemContextFactory.bucketStore, componentContext, registry => {
        (<IEntityNames<E, C>[]>Object.keys(registeredEntities)).forEach(entityName => {
            registry.register(entityName, registeredEntities[entityName]);
        });
    });

    const systemContext = systemContextFactory.createSystemContext(entityContext);

    return {
        Entity: entityContext,
        Component: componentContext,
        System: systemContext
    };
}


export default function ecs<E extends {[key: string]: any}, C extends {[key: string]: any}>(entities: E, components: C, systems: (systemRegistry: ISystemRegistry<E,C>) => void) : IECSContext<E, C> {
    return createEcsContext<E, C>(Parser, ({Entity, Component, System}) => {
        for (let componentName in components) {
            Component.register(<IComponentNames<C>>componentName, components[<IComponentNames<C>>componentName]);
        }

        for (let entityName in entities) {
            Entity.register(<IEntityNames<E, C>>entityName, <IEntityDefinition<E, C>>entities[<IEntityNames<E, C>>entityName]);
        }

        systems(System);
    });
}
