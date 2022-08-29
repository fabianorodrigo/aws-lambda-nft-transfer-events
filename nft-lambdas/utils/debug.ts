export function DEBUG(message: any, ...args: any[]) {
    if (process.env.DEBUG) console.log(message, args);
}
