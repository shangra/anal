module.exports = class UattributDto {
    constructor(UAttribute) {
        if (UAttribute && typeof UAttribute === 'object') {
            if (typeof UAttribute.id !== 'undefined') {
                this.id = UAttribute.id;
            }
            if (typeof UAttribute.code !== 'undefined') {
                this.code = UAttribute.code;
            }
            if (typeof UAttribute.name !== 'undefined') {
                this.name = UAttribute.name;
            }
            if (typeof UAttribute.type !== 'undefined') {
                this.type = UAttribute.type;
            }

            this.value =
                Array.isArray(UAttribute.UserData) &&
                UAttribute.UserData.length > 0
                    ? UAttribute.UserData[0].value
                    : null;
        }
    }
};
