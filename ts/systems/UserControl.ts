import {ISystemRegistry} from "../src/System";

import entities from '../data/entities.json';
import components from '../data/components.json';
type E = typeof entities;
type C = typeof components;

export default function UserControl(systemRegistry: ISystemRegistry<E, C>) {
    systemRegistry.register('UserControl', '{component: UserControl, entity: Creature}', ['userInput'] , (event, entities) => {
        console.log(entities.map(({id}) => id));
    });
}
