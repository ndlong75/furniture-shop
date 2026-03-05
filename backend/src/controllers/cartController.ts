import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export async function getCart(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT ci.id, ci.quantity, ci.product_id,
              p.name, p.slug, p.price, p.stock_quantity,
              p.images->0 AS image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user!.id]
    );
    const items = result.rows;
    const total = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function addToCart(req: AuthRequest, res: Response): Promise<void> {
  const { productId, quantity = 1 } = req.body;
  if (!productId) { res.status(400).json({ error: 'productId is required' }); return; }
  try {
    const product = await query('SELECT stock_quantity FROM products WHERE id = $1 AND is_active = TRUE', [productId]);
    if (!product.rows[0]) { res.status(404).json({ error: 'Product not found' }); return; }
    if (product.rows[0].stock_quantity < quantity) {
      res.status(400).json({ error: 'Not enough stock' }); return;
    }
    const result = await query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()
       RETURNING *`,
      [req.user!.id, productId, parseInt(quantity)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateCartItem(req: AuthRequest, res: Response): Promise<void> {
  const { quantity } = req.body;
  try {
    if (!quantity || quantity < 1) {
      // quantity 0 means remove
      await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.itemId, req.user!.id]);
      res.json({ message: 'Item removed' }); return;
    }
    const result = await query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [parseInt(quantity), req.params.itemId, req.user!.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Cart item not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function removeCartItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.itemId, req.user!.id]);
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
