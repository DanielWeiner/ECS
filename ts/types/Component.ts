import {INormalize} from "./Types";

export type IComponents<T extends Object> = INormalize<T, string>;
export type IComponentNames<T extends Object> = Extract<keyof IComponents<T>, string>;
