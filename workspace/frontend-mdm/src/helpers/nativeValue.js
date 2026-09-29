export const setNativeValue = (node, value) => {
    const valueSetter = Object.getOwnPropertyDescriptor(node, 'value').set;
    const prototype = Object.getPrototypeOf(node);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(node, value);
    } else {
        valueSetter.call(node, value);
    }
};