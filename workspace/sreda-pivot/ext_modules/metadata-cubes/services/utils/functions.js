/**
 * 
 * @param {{ measure: string, layer: string, value: string, aggfn: string }} param0 
 * @returns {string}
 */
const generateKey = ({ measure, layer, value, aggfn }) => `${measure}:->:${layer}:->:${value}:->:${aggfn}`;

/**
 * @param {string} key 
 * @returns {{ measure: string, layer: string, value: string, aggfn: string }}
 */
const parseKey = (key) => {
    const tupple = key.split(':->:');
    if (tupple.length !== 4) return null;

    const [measure, layer, value, aggfn] = tupple;

    return { measure, layer, value, aggfn };
};

module.exports = {
    generateKey,
    parseKey
}