export class ApplicationError extends Error {
    originalError: Error | undefined;

    constructor(message: string, originalError?: Error) {
        super(message);
        this.originalError = originalError;
    }
}
