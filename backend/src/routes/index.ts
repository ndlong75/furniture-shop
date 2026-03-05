import { Router } from 'express';
import authRoutes from './auth';
import productRoutes from './products';
import cartRoutes from './cart';
import orderRoutes from './orders';
import adminRoutes from './admin';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

export default router;
