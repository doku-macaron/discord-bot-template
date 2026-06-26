export {};

declare global {
    type ValueOf<T> = T[keyof T];

    type MaybePromise<T> = T | Promise<T>;
}
