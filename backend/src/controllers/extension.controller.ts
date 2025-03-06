import { Request, Response, NextFunction } from 'express';
import { UrlUploadRequest, FileUploadResponse } from '../types/extension.types';
import pdfService from '../services/extension/pdf.service';
import { Logger } from '../services/logger';

const logger = new Logger('ExtensionController');

/**
 * Controller for handling Chrome extension API requests
 */
export class ExtensionController {
  /**
   * Handle PDF file uploads from the extension
   */
  async uploadFile(req: Request, res: Response<FileUploadResponse>, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'No file uploaded'
        });
        return;
      }

      logger.info(`File upload received: ${req.file.originalname}`);
      
      const result = await pdfService.processUploadedFile({
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      res.status(200).json({
        status: 'success',
        redirect: result.redirect
      });
    } catch (error) {
      logger.error('Error handling file upload', error);
      next(error);
    }
  }

  /**
   * Handle PDF URL submissions from the extension
   */
  async uploadUrl(req: Request, res: Response<FileUploadResponse>, next: NextFunction): Promise<void> {
    try {
      const urlData = req.body as UrlUploadRequest;
      
      if (!urlData.url) {
        res.status(400).json({
          status: 'error',
          message: 'No URL provided'
        });
        return;
      }

      logger.info(`URL upload received: ${urlData.url}`);

      const result = await pdfService.processPdfUrl(urlData);

      res.status(200).json({
        status: 'success',
        redirect: result.redirect
      });
    } catch (error) {
      logger.error('Error handling URL upload', error);
      next(error);
    }
  }
}

export default new ExtensionController();