import { Router } from 'express';
import { 
  getProjectTree, 
  getFileContent, 
  createFileOrFolder, 
  updateFileContent, 
  renameFileOrFolder, 
  deleteFileOrFolder 
} from '../controllers/fileController';
import { authenticateToken, requireProjectRole } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { createFileSchema, updateFileContentSchema, renameFileSchema } from '../validations/fileValidation';

const router = Router({ mergeParams: true });

// All file routes require authentication
router.use(authenticateToken);

// Tree: Read permission
router.get('/tree', requireProjectRole(['owner', 'editor', 'viewer']), getProjectTree);

// File CRUD
router.post('/files', requireProjectRole(['owner', 'editor']), validateBody(createFileSchema), createFileOrFolder);
router.get('/files/:fileId', requireProjectRole(['owner', 'editor', 'viewer']), getFileContent);
router.put('/files/:fileId', requireProjectRole(['owner', 'editor']), validateBody(updateFileContentSchema), updateFileContent);
router.patch('/files/:fileId/rename', requireProjectRole(['owner', 'editor']), validateBody(renameFileSchema), renameFileOrFolder);
router.delete('/files/:fileId', requireProjectRole(['owner', 'editor']), deleteFileOrFolder);

export default router;
