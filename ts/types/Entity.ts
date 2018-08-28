import _entities from '../data/entities.json';
import {INormalize} from "./Types";
import {IComponentNames, IComponents} from "./Component";

type RawEntities = typeof _entities;
type _IEntities = INormalize<RawEntities, string>;

type RawEntityNames  = keyof _IEntities;
export type IEntities = {
    [K in RawEntityNames]: {
        components?: IComponentNames[]
        inherits?: IEntityNames[]
        defaults?: {
            [J in IComponentNames]: IComponents[J]
        }
    }
}
export type IEntityNames = keyof IEntities;
const entities = <IEntities>_entities;
export interface IEntity {
    getInheritedEntities() : IEntityNames[]
}
