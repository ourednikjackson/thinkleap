// backend/src/types/errors/user.errors.ts
export class UserNotFoundError extends Error {
    constructor(message: string = 'User not found') {
        super(message);
        this.name = 'UserNotFoundError';
    }
}

export class InvalidUserDataError extends Error {
    constructor(message: string = 'Invalid user data') {
        super(message);
        this.name = 'InvalidUserDataError';
    }
}