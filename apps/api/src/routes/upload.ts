import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router: Router = Router();
const UPLOADS_DIR = path.join(__dirname, '../../uploads'); // apps/api/uploads

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename, mimeType, base64Data } = req.body;
    if (!filename || !base64Data) {
      res.status(400).json({ error: 'Filename and base64Data are required' });
      return;
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Clean up base64 prefix if present (e.g. data:image/png;base64,)
    const cleanBase64 = base64Data.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Create unique filename to prevent collisions
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFilename = `${Date.now()}_${baseName}${ext || '.bin'}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    // Save the file
    fs.writeFileSync(filePath, buffer);

    // Return the virtual URL path (prefixed with /api to leverage the Vite proxy)
    const fileUrl = `/api/uploads/${uniqueFilename}`;
    res.status(200).json({ fileUrl });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;
