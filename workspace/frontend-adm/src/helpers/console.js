// console.log(document.location.hostname);
if (document.location.hostname !== 'localhost') {
    const old = console.log.bind(console);
    console.log = (...args) => {
        old.apply(null, args);
    };
}
