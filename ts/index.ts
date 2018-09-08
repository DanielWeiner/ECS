import ecs from "./src/ECS";

import registerSystems from './systems';
import entities from './data/entities.json';
import components from './data/components.json';

export const ECS = ecs(entities, components, registerSystems);
