import { Router } from 'express';
import { buildTimeline } from '../services/timeline.service.js';

export const timelineRouter = Router();

timelineRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await buildTimeline());
  } catch (error) {
    next(error);
  }
});
