export class CustomError extends Error {
    public type: string;
    public details: Record<string, any>;

    constructor(type: string, message: string, details: Record<string, any> = {}) {
        super(message);
        this.type = type;
        this.details = details;
    }

    toJSON() {
        return {
            type: this.type,
            message: this.message,
            details: this.details
        };
    }
}