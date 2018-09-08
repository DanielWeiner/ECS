import {ISystemRegistry} from "../src/System";
import UserControl from "./UserControl";

import entities from '../data/entities.json';
import components from '../data/components.json';
type E = typeof entities;
type C = typeof components;

export default function registerSystems(systemRegistry: ISystemRegistry<E,C>) {
    UserControl(systemRegistry);
}
