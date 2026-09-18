export default function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate() + 1;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();
    return `${day}.${month}.${year}-${hours}-${minutes}-${seconds}.${ms}`;
}
