const Extensions = require('../../../core/class/Extensions.class');
const { memorysave } = sreda;

const { randomUUID } = require('crypto');

const CFGPIVOTCHAN_LOG_DEBUG = sreda.env?.CFGPIVOTCHAN_LOG_DEBUG ?? sreda.env?.CFGMETAMODEL_LOG_DEBUG ?? true;

let singleton = null;

class PivotChanService extends Extensions {

    static get instance() {
        // работает быстрее, чем вызов конструктора, который после первого вызова каждый раз будет делать лишнюю работу по созданию ненужного экземпляра
        return singleton ?? new this; // new PivotChanService
    }

    instance_id = randomUUID();

    constructor() {
        // @ts-ignore
        super();
        CFGPIVOTCHAN_LOG_DEBUG && !singleton && console.log("CHAN about to init singleton", {
            ctor: this.constructor.name,
            instance_id: this.instance_id
        });
        return singleton ?? (singleton = this);
    }

    get base_client() { return memorysave.client; }
    chan_client = null; // subscriptions require a separate redis client: utilized version of client library does not support RESP3

    PREFIX = 'CHAN_'; // messaging subsystem keyspace prefix

    // Защита от параллельных вызовов init()
    _initPromise = null;

    async init() {
        //const promises = [memorysave.init()];
        // Если инициализация уже идёт — все ждут одного Promise
        if (this._initPromise) return this._initPromise;

        // Оба клиента готовы — делать нечего
        if (memorysave.client?.isOpen && this.chan_client?.isOpen) return;

        this._initPromise = (async () => {
            const promises = [];
            if (!memorysave.client?.isOpen) {
                promises.push(memorysave.client?.connect?.());
            }
            // chan_client создаём синхронно ДО первого await,
            // чтобы параллельные вызовы не создали два разных дубликата клиента
            if (!this.chan_client) {
                this.chan_client = memorysave.client?.duplicate?.();

                this.chan_client
                    ?.on('error', (e) => {
                        console.error('PivotChan chan_client error:', e);
                    })
                    ?.on('end', () => {
                        console.warn('PivotChan chan_client disconnected');
                    })
                    ?.on('ready', () => {
                        CFGPIVOTCHAN_LOG_DEBUG && console.log('PivotChan chan_client ready');
                    });
            }

            if (!this.chan_client?.isOpen) {
                promises.push(this.chan_client?.connect?.());
            }

            await Promise.all(promises);
        })()
            .finally(() => {
                this._initPromise = null;
            });

        return this._initPromise;
    }

    mkid_epoch(name) { return `${memorysave.PREFIX}:${this.PREFIX}${name}:epoch`; }
    mkid_items_pattern(name) { return `${memorysave.PREFIX}:${this.PREFIX}${name}:items+*`; }
    mkid_items_private(name) { return `${memorysave.PREFIX}:${this.PREFIX}${name}:items+${this.instance_id}`; }
    mkid_joins(name) { return `${memorysave.PREFIX}:${this.PREFIX}${name}:joins`; }
    mkid_exits(name) { return `${memorysave.PREFIX}:${this.PREFIX}${name}:exits`; }

    /**
     * Emit notification with new epoch and given payload on given named channel
     * @param {string} name
     * @param {string} payload
     * @returns {Promise<[bigint, any]>}
     */
    async push_item(name, payload) {
        await this.init();
        //NOTE pay attention that published message order may not match epoch order:
        //NOTE in case of two nearly simultanious `submit` calls the one with greater epoch may be published faster.
        //NOTE this is detected and reported with SIG_MISS (possibly followed by SIG_CULL), but no special autoreordering / autorepairing logic is implemented: in fact not any needed
        const epoch = await this.base_client.incr(this.mkid_epoch(name));
        const state = await this.base_client.publish(this.mkid_items_private(name), `${epoch} ${payload}`);
        //NOTE ^^^ `state` value is implementation-specific answer for "publish" command, this is merely informative and should not be used anywhere except for logging
        //NOTE ^^^ for Redis it means "an amount of current subscribers to channel ON THIS CLUSTER NODE", i.e. there may be uncounted subscribers -- do not rely on this value!
        CFGPIVOTCHAN_LOG_DEBUG && console.log("CHAN push", { name, payload, epoch, state });
        return [BigInt(epoch), state];
    }

    /**
     * Get current epoch for given channel
     * @param {string} name
     * @returns {Promise<bigint>}
     */
    async stat_epoch(name) {
        await this.init();
        // const epoch = await this.base_client.incrby(this.mkid_epoch(name), 0); // "unsafe" and in fact not needed
        const epoch = await this.base_client.get(this.mkid_epoch(name));
        return BigInt(epoch ?? 0n);
    }

    /**
     * DEBUG ONLY
     */
    async stat_swarm(name) {
        throw new Error("Not ported");
    }

    SIG_MISS = Symbol("PivotChanService.SIG_MISS"); // detected that some message(s) were not received
    SIG_CULL = Symbol("PivotChanService.SIG_CULL"); // detected arrival of duplicate or old messages (beware that it also may be a symptom of upstream integrity loss!)
//  SIG_LOST = Symbol("PivotChanService.SIG_LOST"); // (not ported) detected upstream connection loss
//  SIG_GAIN = Symbol("PivotChanService.SIG_GAIN"); // (not ported) restored connection to upstream after it was lost
//  SIG_BURN = Symbol("PivotChanService.SIG_BURN"); // (not ported) detected upstream epoch storage structure integrity corruption; beware that ANY OLD externally stored `epoch` references will no longer valid; handle recovery here

    #subscriptions = new WeakMap(); // listener => Map of subscriptions

    /**
     * Subscribe to notifications on given named channel
     * @param {string} name
     * @param {function({ internal?: bool, epoch?: bigint, payload?: string, error?: Symbol, epoch_expect?: bigint }): any} listener
     */
    async join_items(name, listener) {
        let subscriptions = this.#subscriptions.get(listener);
        if (subscriptions?.get(name)) {
            throw new Error("Duplicate subscriptions of same listener to same channel are not allowed");
        }
        if (!subscriptions) this.#subscriptions.set(listener, subscriptions = new Map());

        const name_private = this.mkid_items_private(name);

        let subscription = {
            epoch_expect: 1n + await this.stat_epoch(name), // note that we start tracking epoch from currently present version
            listener: (/** @type {string} */ message, channel) => {
                CFGPIVOTCHAN_LOG_DEBUG && console.log("CHAN recv/rawm", { channel, message });
                const internal = (name_private === channel);
                const i = message.indexOf(" ");
                const epoch = BigInt(message.slice(0, i));
                const payload = message.slice(i + 1);
                if (epoch >= subscription.epoch_expect) {
                    if (epoch > subscription.epoch_expect) {
                        // detected a miss for 1 or more messages
                        const event = { internal, epoch, error: this.SIG_MISS, epoch_expect: subscription.epoch_expect };
                        CFGPIVOTCHAN_LOG_DEBUG && console.log("CHAN recv/MISS", event);
                        listener(event);
                    }
                    subscription.epoch_expect = 1n + epoch;
                    const event = { internal, epoch, payload };
                    CFGPIVOTCHAN_LOG_DEBUG && console.log("CHAN recv/okay", event);
                    return void listener(event); // emit correct update
                }
                // so, (epoch < subscription.epoch_expect):
                // this means we got some old message arrived (or, in worst case, things went terribly wrong because the upstream got epoch value lost)
                // maybe the epoch metadata tracking mechanics should also be ported to detect this situation:
                // saf2dim bus includes integrity validation among as alternative messaging using redis streams
                const event = { internal, epoch, payload, error: this.SIG_CULL, epoch_expect: subscription.epoch_expect };
                CFGPIVOTCHAN_LOG_DEBUG && console.log("CHAN recv/CULL", event);
                listener(event);
            },
        };

        subscriptions.set(name, subscription);

        await this.init();
        const promise = this.chan_client.pSubscribe(
            this.mkid_items_pattern(name),
            subscription.listener
        );
        CFGPIVOTCHAN_LOG_DEBUG && promise.then(() => console.log("CHAN join", { name_private, epoch_expect: subscription.epoch_expect }));
        return /* no await */ promise;
    }

    /**
     * Unsubscribe from notifications on given named channel
     * @param {string} name
     * @param {function} listener
     */
    async exit_items(name, listener) {
        let subscriptions = this.#subscriptions.get(listener);
        let subscription = subscriptions?.get(name);
        if (!subscription) {
            console.warn("CHAN Given listener was not subscribed to given channel", { name, listener }, new Error().stack);
            // actually should throw to represent programmer's mistake
            return;
        }
        await this.init(); // should not be needed: with `subscription` present we should already be guaranteed to have this.chan_client
        const state = await this.chan_client.pUnsubscribe(
            this.mkid_items_pattern(name),
            subscription.listener
        ); // throws on error, i.e. note that subscription will not be deleted (below)
        subscriptions.delete(name);
        if (!subscriptions.size) this.#subscriptions.delete(listener);
        // this.chan_client.publish(this.mkid_exits(name), ""); // (not ported) listener/instance id
        return state;
    }
}

module.exports = PivotChanService;
