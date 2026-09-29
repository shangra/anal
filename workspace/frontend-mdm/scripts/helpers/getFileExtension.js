const getFileExtension = (filename) => filename?.split('.')?.at(-1);

module.exports = {
    getFileExtension,
};
