class Helper {
    static deleteAllCookies = () => {
        // Только для куки в которых не стоит httponly
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
            document.cookie = `${name}=; path=/; domain=.delta.sbrf.ru; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `${name}=; path=/; domain=.sbrf.ru; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
    };

    static isUUID = (str) => str.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
}

export default Helper;
