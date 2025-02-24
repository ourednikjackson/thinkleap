// backend/src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user/user.service';
import { InstitutionVerificationService } from '../services/user/institution-verification.service';
import { UpdateUserDTO } from '../types/user.types';
import { UserNotFoundError } from '../types/errors/user.errors';
import { AuthenticatedRequest } from '../types/auth.types';

export class UserController {
    constructor(
        private userService: UserService,
        private institutionVerificationService: InstitutionVerificationService
    ) {}

    getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            const user = await this.userService.findById(userId);
            
            if (!user) {
                throw new UserNotFoundError();
            }
    
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            const updateData: UpdateUserDTO = {
                fullName: req.body.fullName,
                email: req.body.email
            };

            const updatedUser = await this.userService.update(userId, updateData);

            res.json({
                success: true,
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            await this.userService.delete(userId);

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    updateLastActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            await this.userService.updateLastLogin(userId);

            res.json({
                success: true,
                message: 'Last activity updated'
            });
        } catch (error) {
            next(error);
        }
    };

    requestInstitutionVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            const { institutionEmail } = req.body;
        
            if (!institutionEmail) {
                res.status(400).json({
                    success: false,
                    message: 'Institution email is required'
                });
                return;
            }
        
            await this.institutionVerificationService.createVerification(userId, institutionEmail);
        
            res.json({
                success: true,
                message: 'Verification code sent to institution email'
            });
        } catch (error) {
            next(error);
        }
    };
    
    verifyInstitutionCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            const { code } = req.body;
        
            if (!code) {
                res.status(400).json({
                    success: false,
                    message: 'Verification code is required'
                });
                return;
            }
        
            const verified = await this.institutionVerificationService.verifyCode(userId, code);
        
            if (!verified) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid verification code'
                });
                return;
            }
        
            res.json({
                success: true,
                message: 'Institution email verified successfully'
            });
        } catch (error) {
            next(error);
        }
    };
    
    getInstitutionVerificationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as AuthenticatedRequest).user.userId;
            const status = await this.institutionVerificationService.getVerificationStatus(userId);
        
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            next(error);
        }
    };
}