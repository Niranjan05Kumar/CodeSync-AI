import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, UserTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { pool } from '../db/pool';

// Extend Express Request interface to include authenticated user and member role
declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
      projectMember?: {
        projectId: string;
        role: 'owner' | 'editor' | 'viewer';
      };
    }
  }
}

/**
 * Middleware: Verifies JWT Access Token in Authorization header
 */
export async function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authorization header missing or invalid', 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(ApiError.unauthorized('Bearer token required', 'TOKEN_MISSING'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforces project access control and role-based permissions
 */
export function requireProjectRole(allowedRoles: ('owner' | 'editor' | 'viewer')[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    }

    const projectId = req.params.projectId || req.params.id;
    if (!projectId) {
      return next(ApiError.badRequest('Project ID parameter missing', 'PARAM_MISSING'));
    }

    try {
      // Check project ownership or membership
      const memberRes = await pool.query(`
        SELECT role FROM project_members 
        WHERE project_id = $1 AND user_id = $2;
      `, [projectId, req.user.id]);

      if (memberRes.rows.length === 0) {
        // Also check if project is public for viewer requests
        const projectRes = await pool.query(`
          SELECT is_public FROM projects WHERE id = $1;
        `, [projectId]);

        if (projectRes.rows.length === 0) {
          return next(ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND'));
        }

        if (projectRes.rows[0].is_public && allowedRoles.includes('viewer')) {
          req.projectMember = { projectId, role: 'viewer' };
          return next();
        }

        return next(ApiError.forbidden('You do not have access to this project', 'ACCESS_DENIED'));
      }

      const userRole = memberRes.rows[0].role as 'owner' | 'editor' | 'viewer';
      if (!allowedRoles.includes(userRole)) {
        return next(ApiError.forbidden(`Requires ${allowedRoles.join(' or ')} permission`, 'INSUFFICIENT_ROLE'));
      }

      req.projectMember = { projectId, role: userRole };
      next();
    } catch (error) {
      next(error);
    }
  };
}
