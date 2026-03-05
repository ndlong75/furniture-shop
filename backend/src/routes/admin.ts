import { Router } from 'express';
import { createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { getAllOrders, updateOrderStatus } from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);

export default router;
