import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { RegisterInput, LoginInput, RefreshTokenInput } from '../validations/authValidation';

/**
 * Register a new user account
 * POST /api/v1/auth/register
 */
export async function register(req: Request<{}, {}, RegisterInput>, res: Response, next: NextFunction) {
  const { email, username, password } = req.body;

  try {
    // Check if email or username already exists
    const existing = await pool.query(`
      SELECT id, email, username FROM users WHERE email = $1 OR username = $2;
    `, [email.toLowerCase(), username]);

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email === email.toLowerCase()) {
        throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
      }
      throw ApiError.conflict('This username is already taken', 'USERNAME_TAKEN');
    }

    const passwordHash = await hashPassword(password);

    const insertRes = await pool.query(`
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, username, avatar_url, created_at;
    `, [email.toLowerCase(), username, passwordHash]);

    const user = insertRes.rows[0];
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      username: user.username
    });

    return res.status(201).json({
      success: true,
      data: {
        user,
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user with email and password
 * POST /api/v1/auth/login
 */
export async function login(req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  try {
    const userRes = await pool.query(`
      SELECT id, email, username, password_hash, avatar_url, created_at
      FROM users
      WHERE email = $1;
    `, [email.toLowerCase()]);

    if (userRes.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = userRes.rows[0];
    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      username: user.username
    });

    const { password_hash, ...sanitizedUser } = user;

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizedUser,
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh expired access token using valid refresh token
 * POST /api/v1/auth/refresh
 */
export async function refresh(req: Request<{}, {}, RefreshTokenInput>, res: Response, next: NextFunction) {
  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists in DB
    const userRes = await pool.query(`
      SELECT id, email, username FROM users WHERE id = $1;
    `, [payload.id]);

    if (userRes.rows.length === 0) {
      throw ApiError.unauthorized('User associated with token no longer exists', 'USER_NOT_FOUND');
    }

    const user = userRes.rows[0];
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      username: user.username
    });

    return res.status(200).json({
      success: true,
      data: {
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  try {
    const userRes = await pool.query(`
      SELECT id, email, username, avatar_url, created_at, updated_at
      FROM users
      WHERE id = $1;
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: {
        user: userRes.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}
