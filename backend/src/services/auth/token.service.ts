
import jwt from 'jsonwebtoken';

export class TokenService {
    private readonly jwtSecret = process.env.JWT_SECRET || 'your-default-secret';
    private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-default-refresh-secret';

    async revokeRefreshToken(token: string): Promise<void> {
        // In a production system, you'd want to add this token to a blacklist
        // or remove it from your valid tokens storage
        return Promise.resolve();
    }

    generateAccessToken(userId: string): string {
        return jwt.sign(
            { userId },
            this.jwtSecret,
            { expiresIn: '15m' }
        );
    }

    generateRefreshToken(userId: string): string {
        return jwt.sign(
            { userId },
            this.jwtRefreshSecret,
            { expiresIn: '7d' }
        );
    }

    verifyToken(token: string): any {
        return jwt.verify(token, this.jwtSecret);
    }

    verifyRefreshToken(token: string): string {
        const decoded = jwt.verify(token, this.jwtRefreshSecret) as { userId: string };
        return decoded.userId;
    }
}