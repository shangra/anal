export class Timer {
    constructor(delay, nonStop = false) {
        this.timeID = undefined;
        this.delay = delay;
        this.nonStop = nonStop;
    }

    timerFunction = (func) => {
        func();
        if (!this.nonStop) {
            this.stop();
        }
    };

    start(func) {
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        if (!this.nonStop) {
            this.timerId = setTimeout(this.timerFunction, this.delay, func);
        } else {
            this.timerId = setInterval(this.timerFunction, this.delay, func);
        }
    }

    stop = () => {
        clearTimeout(this.timerId);
    };
}
