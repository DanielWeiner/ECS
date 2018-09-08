export interface IEvent<T> {
    data: T,
    name: string
}

interface IEventHandler<T> {
    once: boolean
    handler: IEventHandlerFn<T>
}

interface IEventHandlerFn<T> {
    (event: IEvent<T>): void
}

interface IEventEmitter<T> {
    on(eventName: string, callback: IEventHandlerFn<T>): void;
    off(eventName: string, callback: IEventHandlerFn<T>): void;
    once(eventName: string, callback: IEventHandlerFn<T>): void;
    emit(eventName: string, data: T): void;
}

class Event<T> {
    constructor(public readonly name: string, public readonly data: T) {}
}

type EventHandlerListNode<T> = {
    value: IEventHandler<T>
    next: EventHandlerListNode<T>
    prev: EventHandlerListNode<T>,
    list: EventHandlerList<T>
} | null;


class EventHandlerList<T> implements Iterable<IEventHandler<T>> {
    private head: EventHandlerListNode<T> = null;
    private tail: EventHandlerListNode<T> = null;
    constructor() {}

    public push(item: IEventHandler<T>, once: boolean = false) : EventHandlerListNode<T> {
        if (!(this.head && this.tail)) {
            this.head = this.tail = {
                value: item,
                next: null,
                prev: null,
                list: this
            };
            return this.head;
        } else {
            const newNode : EventHandlerListNode<T> = {
                value: item,
                next: null,
                prev: this.tail,
                list: this
            };
            this.tail.next = newNode;
            this.tail = newNode;
            return newNode;
        }
    }

    public static remove(node: EventHandlerListNode<any> & {}) {
        if (node === node.list.tail) {
            node.list.tail = node.list.tail.prev;
        }
        if (node === node.list.head) {
            node.list.head = node.list.head.next;
        }

        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }

        node.next = null;
        node.prev = null;
    }

    public *[Symbol.iterator]() : IterableIterator<IEventHandler<T>> {
        let current = this.head;
        while (current) {
            yield current.value;
            current = current.next;
        }
    }
}

export default class EventEmitter<T> implements IEventEmitter<T> {
    private handlers: {[eventName: string]: EventHandlerList<T>} = {};
    private handlersNodes: {[eventName: string]: WeakMap<IEventHandlerFn<T>, EventHandlerListNode<T>[]>} = {};

    emit(eventName: string, data: T): void {
        if (this.handlers.hasOwnProperty(eventName)) {
            const handlers = [...this.handlers[eventName]]
            handlers.forEach(handler => {
                const cb = handler.handler;
                cb(new Event(eventName, data));
                if (handler.once){
                    this.off(eventName, cb);
                }
            });
        }
    }

    off(eventName: string, callback: IEventHandlerFn<T>): void {
        if (!this.handlers.hasOwnProperty(eventName)) {
            return;
        }
        const nodesMap = this.handlersNodes[eventName];
        if (nodesMap && nodesMap.has(callback)) {
            const nodes = <EventHandlerListNode<T>[]>nodesMap.get(callback);
            nodesMap.delete(callback);
            nodes.forEach(node => {
                EventHandlerList.remove(<EventHandlerListNode<T> & {}>node);
            });
        }
    }

    private attachHandler(eventName: string, callback: IEventHandlerFn<T>, once: boolean = false): void {
        this.handlers[eventName] = this.handlers[eventName] || new EventHandlerList<T>();
        const node = this.handlers[eventName].push({
            handler: callback,
            once
        });

        this.handlersNodes[eventName] = this.handlersNodes[eventName] || new WeakMap();
        if (!this.handlersNodes[eventName].has(callback)) {
            this.handlersNodes[eventName].set(callback, [node]);
        } else {
            (<EventHandlerListNode<T>[]>this.handlersNodes[eventName].get(callback)).push(node);
        }
    }

    on(eventName: string, callback: IEventHandlerFn<T>): void {
        this.attachHandler(eventName, callback);
    }

    once(eventName: string, callback: IEventHandlerFn<T>): void {
        this.attachHandler(eventName, callback, true);
    }
}
