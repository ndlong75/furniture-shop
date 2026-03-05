import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env'; // validates all required env vars at startup
import apiRoutes from './routes';

const app = express();

app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler — catches errors passed via next(err) or thrown in middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`FurnitureShop API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
