class PageDto {
    constructor(page) {
        if (page && typeof page === 'object') {
            if (typeof page.parent !== 'undefined') {
                this.parent = page.parent;
            }
            if (typeof page.id !== 'undefined') {
                this.id = page.id;
            }
            if (typeof page.name !== 'undefined') {
                this.name = page.name;
            }
            if (typeof page.description !== 'undefined') {
                this.description = page.description;
            }
            if (typeof page.rank !== 'undefined') {
                this.rank = page.rank;
            }
            if (typeof page.uri !== 'undefined') {
                this.uri = page.uri;
            }
            if (typeof page.urifind !== 'undefined') {
                this.urifind = page.urifind;
            }
            if (typeof page.active !== 'undefined') {
                this.active = page.active;
            }
            if (typeof page.content_type !== 'undefined') {
                this.content_type = page.content_type;
            }
            if (typeof page.template !== 'undefined') {
                this.template = page.template;
            }
            if (typeof page.link !== 'undefined') {
                this.link = page.link;
            }
            if (typeof page.PageParams !== 'undefined') {
                this.PageParams = page.PageParams;
            }
            if (typeof page.Template !== 'undefined') {
                this.Template = page.Template;
            }
            if (typeof page.ParentInfo !== 'undefined') {
                this.ParentInfo = page.ParentInfo;
            }
            if (typeof page.PageLink !== 'undefined') {
                this.PageLink = page.PageLink;
            }
            if (typeof page.markdel !== 'undefined') {
                this.markdel = page.markdel;
            }
            if (typeof page.createdAt !== 'undefined') {
                this.createdAt = page.createdAt;
            }
            if (typeof page.updatedAt !== 'undefined') {
                this.updatedAt = page.updatedAt;
            }
            if (typeof page.dataValues !== 'undefined') {
                this.countChildren = parseInt(
                    page.dataValues.countChildren ?? -1
                );
            }
        }
    }
}

module.exports = PageDto;
