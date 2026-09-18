const STORAGE_KEY = 'metadata_saved_servers';

export const getSavedServers = (): string[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveServer = (name: string): void => {
    try {
        const servers = getSavedServers();
        if (!servers.includes(name)) {
            servers.push(name);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
        }
    } catch {
        // localStorage недоступен — игнорируем
    }
};

export const removeServer = (name: string): void => {
    try {
        const servers = getSavedServers().filter((s) => s !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    } catch {
        // localStorage недоступен — игнорируем
    }
};
