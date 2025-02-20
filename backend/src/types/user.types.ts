// backend/src/types/user.types.ts
export interface User {
    id: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateUserDTO {
    fullName?: string;
    email?: string;
    status?: string;
}