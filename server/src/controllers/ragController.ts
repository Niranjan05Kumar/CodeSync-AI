import { Request, Response, NextFunction } from 'express';
import { ragService } from '../services/ragService';

export const ragController = {
  /**
   * POST /api/v1/rag/sync
   * Re-indexes all project source files into PostgreSQL code_embeddings
   */
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.body;
      const result = await ragService.indexProject(projectId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/rag/query
   * Grounded project-aware vector search with source citations
   */
  async query(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, query, limit, minSimilarity } = req.body;
      const result = await ragService.queryGrounded(projectId, query, limit, minSimilarity);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
