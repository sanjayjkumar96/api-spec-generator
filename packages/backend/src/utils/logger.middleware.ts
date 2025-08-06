import { logger } from "express-winston";
import winston, { format } from "winston";
import httpContext from "express-http-context";
import { NextFunction, Request, Response } from "express";
import { ulid } from "ulid";
import config from "../config/config";

const isLocalEnvironment = () => {
    return config.nodeEnv === 'development' || config.nodeEnv === 'test';
};

const requestInfoLogger = logger({
    level: 'info',
    format: format.json(),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}} {{req.id}} {{res.statusCode}}", // optional: customize the default log message. E.g. "{{res.statusCode}} {{req.method}} {{req.url}} {{res.responseTime}}ms"
    expressFormat: true,
    colorize: false,
    headerBlacklist: [`x-api-key`],
    transports: [
        new winston.transports.Console()
    ],
    skip: isLocalEnvironment
});

const requestErrorLogger = logger({
    level: 'error',
    format: format.combine(
        format.colorize(),
        format.json()
    ),
    transports: [
        new winston.transports.Console()
    ],
    skip: isLocalEnvironment
});

const setRequestContext = httpContext.middleware;

const getCorrelationID = () => {
    return httpContext.get('X-Correlation-ID');
};

const setCorrelationID = (req: Request, res: Response, next: NextFunction) => {
    let correlationID = req.headers['x-correlation-id'];
    if (!correlationID) {
        correlationID = ulid();
    }
    httpContext.set('X-Correlation-ID', correlationID);
    next();
};

export const LoggerMiddleware = {
    requestInfoLogger,
    requestErrorLogger,
    setRequestContext,
    getCorrelationID,
    setCorrelationID
};