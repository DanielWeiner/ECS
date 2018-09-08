import {INormalize} from "./Types";
import {IComponentNames, IComponents} from "./Component";

type _IEntities<T> = INormalize<T, string>;

type RawEntityNames<E>  = keyof _IEntities<E>;
export type IEntities<E, C> = {
    [K in RawEntityNames<E>]: IEntityDefinition<E, C>
};

export type IEntityDefinition<E, C> = {
    components?: IComponentNames<C>[]
    inherits?: IEntityNames<E, C>[]
    defaults?: {
        [J in IComponentNames<C>]: IComponents<C>[J]
    }
};
export type IEntityNames<E, C> = Extract<keyof IEntities<E, C>, string>;
export interface IEntity<C> {
    readonly id: string
    addComponent<K extends IComponentNames<C>>(componentName: K) : void
    removeComponent<K extends IComponentNames<C>>(componentName: K): void
    set<K extends IComponentNames<C>>(componentName: K, data: {[key in keyof IComponents<C>[K]]?: IComponents<C>[K][key]}): void
    get<K extends IComponentNames<C>>(componentName: K): IComponents<C>[K] | undefined;
    has(componentName: IComponentNames<C>): boolean;
}
