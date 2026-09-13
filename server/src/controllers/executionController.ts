import { Request, Response, NextFunction } from 'express';
import { executionService } from '../services/executionService';

export const executionController = {
  execute: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, language, code, stdin } = req.body;
      const userId = req.user!.id;

      const result = await executionService.runCode({
        projectId,
        userId,
        language,
        code,
        stdin
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
