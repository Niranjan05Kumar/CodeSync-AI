import jwt from 'jsonwebtoken';
import { ApiError } from './apiError';

export interface UserTokenPayload {
  id: string;
  email: string;
  username: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_min_32_characters_long';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_min_32_characters_long';
const JWT_ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

/**
 * Generate Access and Refresh token pair
 */
export function generateTokens(payload: UserTokenPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });

  return { accessToken, refreshToken };
}

/**
 * Verify JWT Access Token
 */
export function verifyAccessToken(token: string): UserTokenPayload {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as UserTokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid access token', 'TOKEN_INVALID');
  }
}

/**
 * Verify JWT Refresh Token
 */
export function verifyRefreshToken(token: string): UserTokenPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as UserTokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
  }
}
