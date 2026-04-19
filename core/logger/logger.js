const providers = {
    console: {
        info: (message) => console.log(message),
        warn: (message) => console.warn(message),
        error: (message) => console.error(message)
    }
};

const activeProviders = ['console'];

function format(level, message, error) {
    const timeStamp = new Date().toISOString();

    let out = `[${timeStamp}] [${level.toUpperCase()}] ${message}`;
    if (error) {
        out += ` [DETAILS] ${error.message}`;

        if (error.cause) {
            const causeInfo = error.cause.message || error.cause.stack || error.cause;
            out += ` [CAUSE] ${error.cause.message}`
        }

        out += ` [CALLSTACK] ${error.stack}`;
    }

    return out;
}

const logger = {
    info: message => {
        const formatted = format('info', message);
        activeProviders.forEach(provider => providers[provider].info(formatted));
    },
    warn: message => {
        const formatted = format('warn', message);
        activeProviders.forEach(provider => providers[provider].warn(formatted));
    },
    error: (message, error) => {
        const formatted = format('error', message, error);
        activeProviders.forEach(provider => providers[provider].error(formatted));
    },
}

module.exports = logger;