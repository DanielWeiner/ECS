import components from '../data/components.json';
import {INormalize} from "./Types";

export type IComponents = INormalize<typeof components, string>;
export type IComponentNames = keyof IComponents;

export class IComponent<T> {

}
