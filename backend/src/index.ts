import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { z } from 'zod';
import { apiRouter } from './endpoints/index.js';

const app = express();
const port = Number(process.env['PORT'] ?? 4000);

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

const webDirectory = path.resolve(process.cwd(), '../frontend/dist/browser');
app.use(express.static(webDirectory));
app.get('/*splat', (_request, response) => {
  response.sendFile(path.join(webDirectory, 'index.html'));
});

app.use((
  error: unknown,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction
) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ message: 'Invalid data', issues: error.issues });
    return;
  }
  console.error(error);
  response.status(500).json({ message: 'Something went wrong' });
});

app.listen(port, () => {
  console.log(`Finance API listening on http://localhost:${port}`);
});
