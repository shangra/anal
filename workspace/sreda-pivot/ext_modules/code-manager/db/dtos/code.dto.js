class CodeDto {
    constructor(data) {
        if (data && typeof data === 'object') {
            if (typeof data.id !== 'undefined') {
                this.id = data.id;
            }
            if (typeof data.code !== 'undefined') {
                this.code = data.code;
            }
            if (typeof data.markdel !== 'undefined') {
                this.markdel = data.markdel;
            }
            if (typeof data.parent !== 'undefined') {
                this.parent = data.parent;
            }
            if (typeof data.name !== 'undefined') {
                this.name = data.name;
            }
            if (typeof data.description !== 'undefined') {
                this.description = data.description;
            }

            if (typeof data.codeSource !== 'undefined') {
                this.codeSource = data.codeSource;
            }
            if (typeof data.codeInterpreter !== 'undefined') {
                this.codeInterpreter = data.codeInterpreter;
            }

            if (typeof data.started !== 'undefined') {
                this.started = data.started;
            }
            if (typeof data.finished !== 'undefined') {
                this.finished = data.finished;
            }
        }
    }
}

module.exports = CodeDto;
