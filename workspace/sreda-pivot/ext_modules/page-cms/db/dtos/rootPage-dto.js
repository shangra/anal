class RootPageDto {
    constructor(rootPage) {
        if (rootPage && typeof rootPage === 'object') {
            if (typeof rootPage.content_type !== 'undefined') {
                this.content_type = rootPage.content_type;
            }
            if (typeof rootPage.template !== 'undefined') {
                this.template = rootPage.template;
            }
            if (typeof rootPage.active !== 'undefined') {
                this.active = rootPage.active;
            }
        }
    }
}

module.exports = RootPageDto;
