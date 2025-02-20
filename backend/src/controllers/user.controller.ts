// backend/src/controllers/user.controller.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserService } from '../services/user/user.service';
import { UpdateUserDTO } from '../types/user.types';
import { UserNotFoundError } from '../types/errors/user.errors';
import { AuthenticatedRequest } from '../types/auth.types';



export class UserController {
    constructor(private userService: UserService) {}

    getProfile: RequestHandler = async (req, res, next) => {
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

    updateProfile: RequestHandler = async (req, res, next) => {
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
    }

    deleteAccount: RequestHandler = async (req, res, next) => {
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
    }

    updateLastActivity: RequestHandler = async (req, res, next) => {
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
    }
}