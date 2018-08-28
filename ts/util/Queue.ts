type QueueNode<T> = {
    data: T,
    next: QueueNode<T>
} | null;

export default class Stack<T> {
    public push: (item: T) => void;
    public pop: () => T | undefined;
    public peek: () => T | undefined;
    public readonly size: number = -1;

    constructor() {
        let head: QueueNode<T> = null;
        let tail: QueueNode<T> = null;
        let size = 0;
        this.push = (data) => {
            if (!tail) {
                tail = head = {
                    data,
                    next: null
                };
            } else {
                const newNode : QueueNode<T> = {
                    next: null,
                    data
                };
                tail.next = newNode;
                tail = newNode;
            }

            size++;
        };

        this.pop = () => {
            if (head) {
                const {data} = head;
                head = head.next;
                if (!head) {
                    tail = null;
                }
                size--;
                return data;
            }
        };

        this.peek = () => {
            if (head) {
                return head.data;
            }
        };

        Object.defineProperty(this, 'size', {
            enumerable: false,
            configurable: false,
            get() {
                return size;
            }
        });
    }
}
