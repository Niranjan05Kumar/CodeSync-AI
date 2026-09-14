import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';
import { pool } from '../db/pool';
import { ApiError } from '../utils/apiError';

export const aiController = {
  /**
   * POST /api/v1/ai/review
   */
  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.reviewCode(req.body);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/ai/debug
   */
  async debug(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.debugCode(req.body);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/ai/explain
   */
  async explain(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.explainCode(req.body);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/ai/chat (Server-Sent Events streaming with DB persistence)
   */
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, messages } = req.body;
      const user = req.user;

      let conversationId: string | null = null;
      let fullAssistantReply = '';

      // If authenticated and projectId provided, find or create conversation and record user message in PostgreSQL
      if (user && projectId) {
        try {
          const convRes = await pool.query(
            `SELECT id FROM ai_conversations 
             WHERE project_id = $1 AND user_id = $2 
             ORDER BY created_at DESC LIMIT 1`,
            [projectId, user.id]
          );

          if (convRes.rows.length > 0) {
            conversationId = convRes.rows[0].id;
          } else {
            const newConv = await pool.query(
              `INSERT INTO ai_conversations (project_id, user_id, title) 
               VALUES ($1, $2, 'AI Assistant Session') 
               RETURNING id`,
              [projectId, user.id]
            );
            conversationId = newConv.rows[0].id;
          }

          // Persist the latest user message
          const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
          if (lastUserMsg && lastUserMsg.role === 'user' && conversationId) {
            await pool.query(
              `INSERT INTO ai_messages (conversation_id, role, content) 
               VALUES ($1, 'user', $2)`,
              [conversationId, lastUserMsg.content]
            );
          }
        } catch (dbErr) {
          console.warn('[AI Chat] Failed to record initial user message in DB:', dbErr);
        }
      }

      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      await aiService.streamChat(
        req.body,
        (chunkText: string) => {
          fullAssistantReply += chunkText;
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        },
        async () => {
          // Persist assistant response to PostgreSQL ai_messages table
          if (conversationId && fullAssistantReply.trim()) {
            try {
              await pool.query(
                `INSERT INTO ai_messages (conversation_id, role, content) 
                 VALUES ($1, 'assistant', $2)`,
                [conversationId, fullAssistantReply.trim()]
              );
            } catch (saveErr) {
              console.warn('[AI Chat] Failed to record assistant response in DB:', saveErr);
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
        },
        (err: any) => {
          res.write(`data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
          res.end();
        }
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/ai/conversations/:projectId
   * Retrieve saved AI chat messages for the current project and user
   */
  async getChatHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
      }
      const { projectId } = req.params;

      const messagesRes = await pool.query(
        `SELECT m.id, m.role, m.content, m.created_at as "createdAt"
         FROM ai_messages m
         JOIN ai_conversations c ON m.conversation_id = c.id
         WHERE c.project_id = $1 AND c.user_id = $2
         ORDER BY m.created_at ASC`,
        [projectId, req.user.id]
      );

      return res.status(200).json({
        success: true,
        data: {
          messages: messagesRes.rows
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/ai/conversations/:projectId
   * Clear AI chat messages for the current project and user
   */
  async clearChatHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
      }
      const { projectId } = req.params;

      await pool.query(
        `DELETE FROM ai_conversations WHERE project_id = $1 AND user_id = $2`,
        [projectId, req.user.id]
      );

      return res.status(200).json({
        success: true,
        data: {
          message: 'AI chat history successfully cleared'
        }
      });
    } catch (err) {
      next(err);
    }
  }
};
