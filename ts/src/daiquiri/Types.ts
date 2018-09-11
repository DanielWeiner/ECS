export type IParsedStatement = IParsedBucketGroup | IParsedBucketOperator | IParsedDefinition;
export type IParsedDefinition = IParsedEntityDefinition | IParsedComponentDefinition | IParsedSetDefinition;
export type IParsedComponentDataValue = string | number | boolean | null | symbol;

export interface IParsedLt {
    lt: IParsedComponentDataValue
}

export interface IParsedGt {
    gt: IParsedComponentDataValue
}

export interface IParsedGte {
    gte: IParsedComponentDataValue
}

export interface IParsedLte {
    lte: IParsedComponentDataValue
}

export interface IParsedEq {
    eq: IParsedComponentDataValue
}

export interface IParsedNeq {
    neq: IParsedComponentDataValue
}

export type IParsedComponentDataOperator = IParsedLt | IParsedLte | IParsedGt | IParsedGte | IParsedEq | IParsedNeq;

export interface IParsedComponentData {
    [key: string]: IParsedComponentDataOperator
}

export interface IParsedComponentDefinition {
    component: string,
    data: IParsedComponentData[]
}

export interface IParsedEntityDefinition {
    entity: string
}

export interface IParsedSetDefinition {
    set: string
}

export interface IParsedBucketOperator {
    operator: IParsedValidOperator
}

export interface IParsedBucketGroup {
    statements: IParsedStatement[]
}

export const precedence : {[K in IParsedValidOperator]: number} = {
    '|': 0,
    '&': 1
};

export type IParsedValidOperator = '|' | '&';

export interface IBucketConfig {
    [key: string]: string
}
