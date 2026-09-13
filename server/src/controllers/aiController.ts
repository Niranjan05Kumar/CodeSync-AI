import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';

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
   * POST /api/v1/ai/chat (Server-Sent Events streaming)
   */
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
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
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        },
        () => {
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
  }
};
