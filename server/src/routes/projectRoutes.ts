import { Router } from 'express';
import { 
  createProject, 
  getProjects, 
  getProjectById, 
  deleteProject,
  joinProject,
  addProjectMember,
  removeProjectMember
} from '../controllers/projectController';
import fileRoutes from './fileRoutes';
import { authenticateToken, requireProjectRole } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { createProjectSchema } from '../validations/projectValidation';

const router = Router();

// All project routes strictly require authentication (prevents unauthenticated room access)
router.use(authenticateToken);

// Project Collection & Global Room Endpoints
router.post('/', validateBody(createProjectSchema), createProject);
router.get('/', getProjects);
router.post('/join', joinProject); // Join by 8-character room code or project ID

// Project Member Management Endpoints
router.post('/:id/members', requireProjectRole(['owner']), addProjectMember);
router.delete('/:id/members/:userId', requireProjectRole(['owner']), removeProjectMember);

// Mount file routes as sub-resources under /:projectId
router.use('/:projectId', fileRoutes);

// Project Item Endpoints
router.get('/:id', requireProjectRole(['owner', 'editor', 'viewer']), getProjectById);
router.delete('/:id', deleteProject);

export default router;
