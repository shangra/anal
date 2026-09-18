class LogicalLayerClass {
    mutate(layers, attributes, attributesForDel) {
        return layers.map(layer => {
            layer.attributes = layer.attributes.filter(attr => !attributesForDel.includes(attr));

            layer.attributes = [...layer.attributes, ...attributes];

            return layer;
        });
    }
}

module.exports = LogicalLayerClass;