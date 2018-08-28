import {IParser} from "./Daiquiri";
import {
    IBucketConfig,
    IParsedBucketGroup,
    IParsedBucketOperator, IParsedComponentDataValue,
    IParsedDefinition,
    IParsedStatement,
    IParsedValidOperator,
    precedence
} from "./Types";
import Queue from '../../util/Queue';
import Stack from '../../util/Stack';

interface IBucket {
    attemptAdd(id: string): this;
    attemptRemove(id: string): this;
    notifyAdd(id: string): this;
    notifyRemove(id: string): this;
    addSuperSet(set: IBucket): this;
    has(id: string): boolean;
    getEntities(): Set<string>,
    getHash() : string
    isGroup(): boolean
    getMode(): IParsedValidOperator
    resolve(cache: IBucketDefinitions, bucketStore: IBucketStore) : void;
    clearItem(entityId: string): void;
}

export interface IDataStore {
    addEntity(entityId: string, entityTypes: string[]) : void
    removeEntity(entityId: string, entityTypes: string[]) : void
    addEntityComponent(entityId: string, componentName: string) : void
    removeEntityComponent(entityId: string, componentName: string) : void
    setEntityComponentData(entityId: string, componentName: string, key: string, value: IParsedComponentDataValue, oldValue?: typeof value): void;
    bucketHas(bucketName: string, entityId: string) : boolean;
    getBucketItems(bucketName: string): Set<string>
}

type IBucketDefinitions = {[key: string]: IBucket};

function firstKey(obj: Object) : string | undefined {
    // noinspection LoopStatementThatDoesntLoopJS
    for (let prop in obj) {
        return prop;
    }
}

const comparators = {
    eq: (a: any, b: any) => a === b,
    neq: (a: any, b: any) => a !== b,
    lt: (a: any, b: any) => a < b,
    gt: (a: any, b: any) => a > b,
    lte: (a: any, b: any) => a <= b,
    gte: (a: any, b: any) => a >= b
};

interface IBucketStore {
    entity: {[entityName: string]: IBucket}
    component: {
        [componentName: string]: {
            any: IBucket,
            data: {
                [dataKey: string]: [keyof typeof comparators, IParsedComponentDataValue, IBucket][]
            }
        }
    }
}

abstract class AbstractEntityBucket implements IBucket {
    protected conditionCount = -1;
    private superSets: IBucket[] = [];
    private itemConditionCounts: {[item: string]: number} = {};
    private items: Set<string> = new Set();

    abstract isGroup() : boolean;
    abstract getMode() : IParsedValidOperator;
    abstract resolve(cache: IBucketDefinitions, store: IBucketStore) : void;

    protected constructor(protected hash: string) {}

    private getItemConditionCount(item: string) : number {
        if (this.itemConditionCounts.hasOwnProperty(item)) {
            return this.itemConditionCounts[item];
        }
        return 0;
    }

    private setItemConditionCount(item: string, count: number) : void {
        if (count) {
            this.itemConditionCounts[item] = count;
        } else {
            delete this.itemConditionCounts[item];
        }
    }

    private incrementItemConditionCount(item: string) {
        this.setItemConditionCount(item, this.getItemConditionCount(item) + 1);
    }

    private decrementItemConditionCount(item: string) {
        this.setItemConditionCount(item, this.getItemConditionCount(item) - 1);
    }

    private shouldContain(item: string) {
        if (this.getMode() === '&') {
            return this.getItemConditionCount(item) === this.conditionCount;
        } else {
            return this.getItemConditionCount(item) > 0;
        }
    }

    private conditionallyAdd(item: string) {
        if (this.shouldContain(item)) {
            this.items.add(item);
            this.notifyAdd(item);
        }
    }

    private conditionallyRemove(item: string) {
        if (!this.shouldContain(item)) {
            this.items.delete(item);
            this.notifyRemove(item);
        }
    }

    public clearItem(item: string) {
        this.setItemConditionCount(item, 0);
        if (this.has(item)) {
            this.items.delete(item);
            this.notifyRemove(item);
        }
    }

    public addSuperSet(set: IBucket): this {
        this.superSets.push(set);
        return this;
    }

    public attemptAdd(id: string): this {
        this.incrementItemConditionCount(id);
        if (!this.has(id)) {
            this.conditionallyAdd(id);
        }
        return this;
    }

    public attemptRemove(id: string): this {
        this.decrementItemConditionCount(id);
        if (this.has(id)) {
            this.conditionallyRemove(id);
        }
        return this;
    }

    public getEntities(): Set<string> {
        return new Set(this.items);
    }

    public getHash(): string {
        return this.hash;
    }

    public has(id: string): boolean {
        return this.items.has(id);
    }

    public notifyAdd(id: string): this {
        for (let i = 0; i < this.superSets.length; i++) {
            this.superSets[i].attemptAdd(id);
        }
        return this;
    }

    public notifyRemove(id: string): this {
        for (let i = 0; i < this.superSets.length; i++) {
            this.superSets[i].attemptRemove(id);
        }
        return this;
    }
}

type IParsedBuckets = {
    [bucketName: string]: IParsedBucketGroup
};

class EntityBucketGroup extends AbstractEntityBucket {
    protected mode : IParsedValidOperator = '&';
    protected subBuckets : IBucket[] = [];

    public constructor(hash: string, mode: IParsedValidOperator, buckets: IBucket[]) {
        super(hash);
        this.mode = mode;
        this.subBuckets = buckets;

        for (let i = 0; i < this.subBuckets.length; i++) {
            this.subBuckets[i].addSuperSet(this);
        }

        this.conditionCount = this.subBuckets.length;
        this.hash = hash;
    }

    public static createHash(mode: IParsedValidOperator, buckets: IBucket[]) {
        return 'group:' + mode + ':(' + buckets.map(bucket => bucket.getHash()).sort().join(',') + ')';
    }

    public static create(buckets: IBucket[], mode: IParsedValidOperator, bucketCache: IBucketDefinitions) : IBucket {
        const hashes = new Set<string>();

        // collapses sub-buckets as necessary
        const collapsedBuckets = buckets.reduce((collapsedBuckets, bucket) => {
            if (bucket.isGroup() && mode === bucket.getMode()) {
                collapsedBuckets.push(...((<EntityBucketGroup>bucket).subBuckets).filter(bucket => {
                    if (hashes.has(bucket.getHash())) {
                        return false;
                    }
                    hashes.add(bucket.getHash());
                    return true;
                }));
            } else {
                if (!hashes.has(bucket.getHash())) {
                    hashes.add(bucket.getHash());
                    collapsedBuckets.push(bucket);
                }
            }

            return collapsedBuckets;
        }, [] as IBucket[]);

        if (!collapsedBuckets.length) {
            throw new Error('A bucket group must have a nonzero number of sub-buckets.');
        }

        // if the group resolves to one bucket, use that bucket instead of a group
        if (collapsedBuckets.length < 2) {
            return collapsedBuckets[0];
        }

        const hash = EntityBucketGroup.createHash(mode, collapsedBuckets);
        if (!bucketCache[hash]) {
            bucketCache[hash] = new EntityBucketGroup(hash, mode, collapsedBuckets);
        }

        return bucketCache[hash];
    }

    public isGroup(): true {
        return true;
    }

    public getMode() : IParsedValidOperator {
        return this.mode;
    }

    public resolve(cache: IBucketDefinitions, bucketStore: IBucketStore) : void {
        if (!cache[this.hash]) {
            cache[this.hash] = this;
            this.subBuckets.forEach(bucket => {
                bucket.resolve(cache, bucketStore);
            });
        }
    }
}

class EntityBucket extends AbstractEntityBucket {
    public constructor(hash: string, private definition: IParsedDefinition) {
        super(hash);
    }

    public static createHash(definition: IParsedDefinition) : string {
        if ('component' in definition) {
            return 'component:' + definition.component +'(' + definition.data.map((dataItem: any) => {
                const key = <string>firstKey(dataItem);
                const operator = <string>firstKey(dataItem[key]);
                const data = JSON.stringify((<any>dataItem[key][operator]));
                return key + ':' + operator + ':' + data;
            }).sort().join(',') + ')';
        } else if ('entity' in definition) {
            return 'entity:' + definition.entity;
        } else {
            throw new Error('Unknown type definition: ' + firstKey(definition));
        }
    }

    public static create(definition: IParsedDefinition, parsedBuckets: IParsedBuckets, bucketCache: IBucketDefinitions, setNames: Set<string>) : IBucket  {
        if ('set' in definition) {
            if (!parsedBuckets.hasOwnProperty(definition.set)) {
                throw new Error('Undefined set: ' + definition.set);
            } else {
                return compileBucket(definition.set, parsedBuckets[definition.set], parsedBuckets, bucketCache, setNames);
            }
        } else {
            const hash = EntityBucket.createHash(definition);
            if (!bucketCache[hash]) {
                return bucketCache[hash] = new EntityBucket(hash, definition);
            }
            return bucketCache[hash];
        }
    }

    private addToStore(bucketStore: IBucketStore) : void {
        const definition = this.definition;
        if ('entity' in definition) {
            bucketStore.entity[definition.entity] = this;
            this.conditionCount = 1;
        } else if ('component' in definition) {
            if (definition.data.length) {
                bucketStore.component[definition.component] = bucketStore.component[definition.component] || {};
                const componentStore = bucketStore.component[definition.component];
                componentStore.data = componentStore.data || {};

                definition.data.forEach(dataItem => {
                    const key = <string>firstKey(dataItem);
                    componentStore.data[key] = componentStore.data[key] || [];

                    const componentDataComparators = componentStore.data[key];
                    const operation = <keyof typeof comparators>firstKey(dataItem[key]);

                    if (operation) {
                        const value = (<any>dataItem[key])[operation];
                        componentDataComparators.push([
                            operation,
                            value,
                            this
                        ]);
                    }
                });
                this.conditionCount = definition.data.length;
            } else {
                bucketStore.component[definition.component] = bucketStore.component[definition.component] || {};
                bucketStore.component[definition.component].any = this;
                this.conditionCount = 1;
            }
        }
    }

    public isGroup(): false {
        return false;
    }

    public getMode() : IParsedValidOperator {
        return '&';
    }

    public resolve(cache: IBucketDefinitions, bucketStore: IBucketStore) : void {
        if (!cache[this.hash]) {
            this.addToStore(bucketStore);
            cache[this.hash] = this;
        }
    }
}

function compileAll(parser: IParser, config: IBucketConfig) {
    const bucketStore : IBucketStore = {
        entity: {},
        component: {}
    };

    const parsedBuckets : IParsedBuckets = {};
    const buckets: IBucketDefinitions = {};
    const namedBuckets: IBucketDefinitions = {};
    const resolvedBuckets: IBucketDefinitions = {};

    for (let setName in config) {
        parsedBuckets[setName] = parser.parse(config[setName]);
    }

    for (let setName in config) {
        const parseData = parsedBuckets[setName];
        namedBuckets[setName] = compileBucket(setName, parseData, parsedBuckets, buckets);
    }

    for (let setName in config) {
        namedBuckets[setName].resolve(resolvedBuckets, bucketStore);
    }

    return {namedBuckets, bucketStore};
}

function compileBucket(name: string | null, parseData: IParsedBucketGroup, parsedBuckets: IParsedBuckets, buckets: IBucketDefinitions, setNames: Set<string> = new Set()) : IBucket {
    type BucketStackItem = {
        item: IBucket
    };

    if (name && setNames.has(name)) {
        throw new Error('Circular set reference in set: ' + name);
    }

    if (name) {
        setNames = new Set(setNames);
        setNames.add(name);
    }

    if (name && buckets[name]) {
        return buckets[name];
    }

    const bucketQueue = new Queue<IParsedStatement>();
    const operatorStack = new Stack<IParsedBucketOperator>();
    const bucketStack = new Stack<BucketStackItem>();

    // uses the shunting-yard algorithm to produce a Reverse Polish Notation queue of buckets and operators
    parseData.statements.forEach(statement => {
        if ('operator' in statement) {
            let topOfStack = operatorStack.peek();
            while (topOfStack && precedence[topOfStack.operator] > precedence[statement.operator]) {
                bucketQueue.push(<IParsedBucketOperator>operatorStack.pop());
                topOfStack = operatorStack.peek();
            }
            operatorStack.push(statement);
        } else {
            bucketQueue.push(statement);
        }
    });

    while (operatorStack.peek()) {
        bucketQueue.push(<IParsedBucketOperator>operatorStack.pop());
    }

    // merges the bucket queue into actual buckets
    while (bucketQueue.peek()) {
        const item = <IParsedStatement>bucketQueue.pop();
        if ('operator' in item) {
            const rhs = <BucketStackItem>bucketStack.pop();
            const lhs = <BucketStackItem>bucketStack.pop();
            lhs.item = EntityBucketGroup.create([
                lhs.item,
                rhs.item
            ], item.operator, buckets);
            bucketStack.push(lhs);
        } else if ('statements' in item) {
            bucketStack.push({
                item: compileBucket(null, item, parsedBuckets, buckets, setNames)
            });
        } else {
            bucketStack.push({
                item: EntityBucket.create(item, parsedBuckets, buckets, setNames)
            });
        }
    }

    const stackItem = <BucketStackItem>bucketStack.pop();
    const bucket = stackItem.item;
    buckets[bucket.getHash()] = bucket;
    return bucket;
}

export default function DataStore(parser: IParser) {
    return {
        compile(options: IBucketConfig): IDataStore {
            const {namedBuckets, bucketStore} = compileAll(parser, options);

            return {
                bucketHas(name: string, entityId: string) : boolean {
                    if (!namedBuckets.hasOwnProperty(name)) {
                        throw new Error('Undefined bucket: ' + name);
                    }
                    return namedBuckets[name].has(entityId);
                },
                getBucketItems(name: string): Set<string> {
                    if (!namedBuckets.hasOwnProperty(name)) {
                        throw new Error('Undefined bucket: ' + name);
                    }
                    return namedBuckets[name].getEntities();
                },
                addEntity(entityId, entityTypes) {
                    entityTypes.forEach(entityType => {
                        if (bucketStore.entity[entityType]) {
                            const bucket = bucketStore.entity[entityType];
                            bucket.attemptAdd(entityId);
                        }
                    });
                },
                removeEntity(entityId, entityTypes) {
                    entityTypes.forEach(entityType => {
                        if (bucketStore.entity[entityType]) {
                            const bucket = bucketStore.entity[entityType];
                            bucket.attemptRemove(entityId);
                        }
                    });
                },
                addEntityComponent(entityId, componentName) {
                    if (bucketStore.component[componentName] && bucketStore.component[componentName].any) {
                        const bucket = bucketStore.component[componentName].any;
                        bucket.attemptAdd(entityId);
                    }
                },
                removeEntityComponent(entityId, componentName) {
                    if (bucketStore.component[componentName]) {
                        const bucketFilters = bucketStore.component[componentName];

                        if (bucketFilters.any) {
                            bucketFilters.any.attemptRemove(entityId);
                        }

                        if (bucketFilters.data) {
                            for (let key in bucketFilters.data) {
                                if (bucketFilters.data.hasOwnProperty(key)) {
                                    bucketFilters.data[key].forEach(item => {
                                        const [,,bucket] = item;
                                        bucket.clearItem(entityId);
                                    });
                                }
                            }
                        }
                    }
                },
                setEntityComponentData(entityId, componentName, key, value, oldValue) {
                    if (bucketStore.component[componentName] && bucketStore.component[componentName].data && bucketStore.component[componentName].data[key]) {
                        const filters = bucketStore.component[componentName].data[key];

                        filters.forEach(filter => {
                            const [operation, compValue, bucket] = filter;
                            const comparator = comparators[operation];
                            const resolution = comparator(value, compValue);
                            const lastResolution = oldValue === undefined? false : comparator(oldValue, compValue);

                            if (lastResolution !== resolution) {
                                if (resolution) {
                                    bucket.attemptAdd(entityId);
                                } else {
                                    bucket.attemptRemove(entityId);
                                }
                            }
                        });
                    }
                }
            };
        }
    };
}
