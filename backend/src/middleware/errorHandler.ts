import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../errors/customError';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof CustomError) {
        return res.status(400).json({
            success: false,
            error: err.toJSON()
        });
    }

    res.status(500).json({
        success: false,
        error: {
            type: 'SERVER_ERROR',
            message: 'Internal server error',
            details: {}
        }
    });
};