type IElementOf<T> = T extends Array<infer E>? E : never;
type IConvertedElement<T, U, V> = IConvert<IElementOf<T>, U, V>;
type ArrayType<T> = Array<IElementOf<T>>;

type IConvertArray<T extends ArrayType<T>, U, V> = {
    [K in Extract<keyof T, keyof Array<IElementOf<T>>>]: Array<IConvertedElement<T, U, V>>[K] | {[key in symbol]: Array<IConvertedElement<T, U, V>>[K]}
}
type IConvertObject<T extends Object, U, V> = {
    [K in keyof T]: IConvert<T[K], U, V>
};

type IConvertGeneric<T extends Object, U, V> = {
    [key: string]: IConvert<T, U, V> | symbol
}

type IConvertTuple<T, U, V> = {[K in keyof T]: IConvert<T[K], U, V>};
type IArgs<F> = F extends (...args: infer A) => any ? A : never;
type IReturn<F> = F extends(...args: any[]) => infer R ? R : never;

// @ts-ignore
type IConvertFunction<F, U, V> = (...args: IConvertTuple<IArgs<F>, U, V>) => IConvert<IReturn<F>, U, V>;

export type IConvert<T, U, V> =
    [T] extends [U]                             ?       V:
    T extends Function                          ?       IConvertFunction<T, U, V>:
    T extends {__key__: infer W}                ?       IConvertGeneric<W, U, V>:
    T extends ArrayType<T>                      ?       IConvertArray<T, U, V>:
    T extends Object                            ?       IConvertObject<T, U, V>:
    T;

export type INormalize<T, U> = IConvert<T, never, U>;
