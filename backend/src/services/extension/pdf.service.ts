import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { FileMetadata, UrlUploadRequest } from '../../types/extension.types';
import config from '../../config';
import { Logger } from '../logger';

const logger = new Logger('PDFService');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Get upload path from config or use default
const UPLOAD_PATH = path.resolve(process.env.UPLOAD_PATH || './uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

export class PDFService {
  /**
   * Process a PDF file that was uploaded
   * @param file The uploaded file metadata
   * @returns Object with redirect URL
   */
  async processUploadedFile(file: FileMetadata): Promise<{ redirect: string }> {
    try {
      // Check if file is a PDF
      if (file.mimetype !== 'application/pdf') {
        throw new Error('Uploaded file is not a PDF');
      }

      // In a real implementation, this might:
      // 1. Send the file to the target site's API
      // 2. Store it on S3 or similar storage
      // 3. Process it further before storage
      
      // For this example, we'll assume the file is stored locally
      // and we'll generate a redirect URL with a unique ID
      
      const fileId = uuidv4();
      const redirectUrl = `${config.targetSite.baseUrl}/view/${fileId}`;
      
      logger.info(`Processed uploaded file ${file.originalname}, redirecting to ${redirectUrl}`);
      
      return { redirect: redirectUrl };
    } catch (error) {
      logger.error('Error processing uploaded file', error);
      throw error;
    }
  }

  /**
   * Fetch and process a PDF from a URL
   * @param urlData URL and optional auth details
   * @returns Object with redirect URL
   */
  async processPdfUrl(urlData: UrlUploadRequest): Promise<{ redirect: string }> {
    try {
      // Configure request with any provided headers and cookies
      const requestConfig = {
        headers: {
          ...urlData.headers,
          Cookie: urlData.cookies,
        },
        responseType: 'arraybuffer' as 'arraybuffer',
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        timeout: 30000, // 30 second timeout
      };

      // Fetch the PDF from the URL
      logger.info(`Fetching PDF from URL: ${urlData.url}`);
      const response = await axios.get(urlData.url, requestConfig);
      
      // Check if response is a PDF
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('URL did not return a PDF');
      }

      // Save PDF to disk temporarily
      const filename = `${uuidv4()}.pdf`;
      const filepath = path.join(UPLOAD_PATH, filename);
      
      await writeFileAsync(filepath, response.data);
      logger.info(`PDF saved temporarily to ${filepath}`);
      
      // Option 1: Forward to target site API
      // Here you would implement the API call to the target site
      
      // Option 2: Generate a redirect URL
      const fileId = uuidv4();
      const redirectUrl = `${config.targetSite.baseUrl}/view/${fileId}`;
      
      // Clean up temp file after processing
      await unlinkAsync(filepath);
      
      return { redirect: redirectUrl };
    } catch (error) {
      logger.error('Error processing PDF URL', error);
      throw error;
    }
  }
}

export default new PDFService();