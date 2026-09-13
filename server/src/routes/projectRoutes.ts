import { Router } from 'express';
import { 
  createProject, 
  getProjects, 
  getProjectById, 
  deleteProject 
} from '../controllers/projectController';
import fileRoutes from './fileRoutes';
import { authenticateToken, requireProjectRole } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { createProjectSchema } from '../validations/projectValidation';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// Mount file routes as sub-resources under /:projectId
router.use('/:projectId', fileRoutes);

// Project Collection Endpoints
router.post('/', validateBody(createProjectSchema), createProject);
router.get('/', getProjects);

// Project Item Endpoints
router.get('/:id', requireProjectRole(['owner', 'editor', 'viewer']), getProjectById);
router.delete('/:id', deleteProject);

export default router;
