import {IEntity} from "../types/Entity";
import {IECSContext} from "../src/ECS";
import entities from '../data/entities.json';
import components from '../data/components.json';
type E = typeof entities;
type C = typeof components;

export default function CreateCreature(ECS: IECSContext<E, C>) : IEntity<C> {
    const creature = ECS.Entity.createEntity('Creature');


    return creature;
}
