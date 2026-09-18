module.exports = class UattributDto {
    constructor(UAttributes) {
        if (UAttributes && typeof UAttributes === 'object') {
            if (typeof UAttributes.id !== 'undefined') {
                this.id = UAttributes.id;
            }
            if (typeof UAttributes.code !== 'undefined') {
                this.code = UAttributes.code;
            }
            if (typeof UAttributes.name !== 'undefined') {
                this.name = UAttributes.name;
            }
            if (typeof UAttributes.type !== 'undefined') {
                this.type = UAttributes.type;
            }

            this.value =
                Array.isArray(UAttributes.UserData) &&
                UAttributes.UserData.length > 0
                    ? UAttributes.UserData[0].value
                    : null;
        }
    }
};
