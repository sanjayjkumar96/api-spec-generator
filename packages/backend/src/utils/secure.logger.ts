import { LOGGER_BLACKLIST, LOGGER_OBFUSCATE_VALUE } from "./secure.logger.config";

export const sanitize = (...args: any[]): any => {
    let sanitizedData = args;
    if(args && args.length) {
        sanitizedData = [];
        for (const arg of args) {
            let newArg = arg;
            if(typeof newArg === 'object' && newArg != null && LOGGER_BLACKLIST) {
                newArg = JSON.parse(JSON.stringify(newArg), (key,value) => {
                    if (LOGGER_BLACKLIST.includes(key.toLowerCase())) {
                        return LOGGER_OBFUSCATE_VALUE;
                    }
                    return value;
                })
            }
            sanitizedData.push(newArg);
        }
    }
    return JSON.stringify(sanitizedData[0]);
};