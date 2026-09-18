export class Debouncer {
    private timeoutId: number | null = null;

    debounce(callback: () => void, delay: number) {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(callback, delay);
    }

    cancel() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    isPending(): boolean {
        return this.timeoutId !== null;
    }
}
