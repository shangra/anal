export const drawComponent = (ctx, options) => {
    const { x, y, width, height, value } = options;

    const CMP = value.component;
    const comp = new CMP({ ...value.props, options: { x, y, width, height }, ctx });
    comp.render();

    return 10;
};
