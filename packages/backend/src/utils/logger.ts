import { createLogger, format, transports } from "winston";
import httpContext from "express-http-context";
import { sanitize } from "./secure.logger";

type MessageLogger = object | string | unknown;

const winstonLogger = createLogger({
    level: process.env.DEBUG == "true" ? "debug" : "info",
    transports: [new transports.Console({
        format: format.simple()
    })],
    exitOnError: false
});

function templated(title: string | undefined, message: unknown): string {
    return `${getCorrelationID()}::${title ?? ""} ${sanitize(message)}`;
}

function getCorrelationID(): string {
    const correlationId = httpContext.get("X-Correlation-ID");
    return correlationId ? `${correlationId}` : "";
}

function debug(title: string, message: MessageLogger): void {
    winstonLogger.debug(templated(title, message));
}

function info(title: string, message: MessageLogger): void {
    winstonLogger.info(templated(title, message));
}

function warn(title: string, message: MessageLogger): void {
    winstonLogger.warn(templated(title, message));
}

function error(title: string, message: MessageLogger): void {
    winstonLogger.error(templated(title, message));
}

function profile(id: string | number, message?: string, level?: string) {
    winstonLogger.profile(id, {
        message: `${getCorrelationID()}::${id} ${message ?? ""}`,
        level: level ?? "debug"
    })
}


export const logger = { debug, info, error, warn, profile };