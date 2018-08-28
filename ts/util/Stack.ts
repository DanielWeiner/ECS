type StackNode<T> = {
    data: T,
    next: StackNode<T>
} | null;

export default class Stack<T> {
    public push: (item: T) => void;
    public pop: () => T | undefined;
    public peek: () => T | undefined;
    public readonly size: number = -1;

    constructor() {
        let head: StackNode<T> = null;
        let size = 0;
        this.push = (data) => {
            head = {
                data,
                next: head
            };
            size++;
        };

        this.pop = () => {
            if (head) {
                const {data} = head;
                head = head.next;
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
