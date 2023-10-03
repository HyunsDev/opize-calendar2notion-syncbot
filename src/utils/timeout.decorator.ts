import { timeout } from './timeout';

export function Timeout(ms: number) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            return await timeout(await originalMethod.bind(this, ...args), ms);
        };
    };
}
