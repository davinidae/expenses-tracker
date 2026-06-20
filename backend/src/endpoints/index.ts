import { Router } from 'express';
import { entriesRouter } from './entries.endpoint.js';
import { healthRouter } from './health.endpoint.js';
import { salaryRouter } from './salary.endpoint.js';
import { timelineRouter } from './timeline.endpoint.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/salary', salaryRouter);
apiRouter.use('/entries', entriesRouter);
apiRouter.use('/timeline', timelineRouter);
