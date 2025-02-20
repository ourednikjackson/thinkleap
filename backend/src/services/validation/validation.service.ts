import { ValidationResult } from '../../types/validation.types';

export class ValidationService {
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password: string): ValidationResult {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);
        
        const errors: string[] = [];
        if (password.length < minLength) errors.push('Password must be at least 8 characters');
        if (!hasUpperCase) errors.push('Password must contain uppercase letter');
        if (!hasLowerCase) errors.push('Password must contain lowercase letter');
        if (!hasNumbers) errors.push('Password must contain number');
        if (!hasSpecialChar) errors.push('Password must contain special character');

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}