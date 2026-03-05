import { Response } from 'express';
import { query, pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const { shippingAddress } = req.body;
  if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.address) {
    res.status(400).json({ error: 'Shipping address (fullName, phone, address) is required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get cart items
    const cartResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.images->0 AS image
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user!.id]
    );
    const items = cartResult.rows;
    if (items.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Cart is empty' }); return;
    }

    // Lock product rows to prevent race conditions on concurrent checkouts
    const productIds = items.map((i: { product_id: string }) => i.product_id);
    const stockResult = await client.query(
      `SELECT id, name, stock_quantity FROM products WHERE id = ANY($1) FOR UPDATE`,
      [productIds]
    );
    const stockMap = new Map(stockResult.rows.map((r: { id: string; stock_quantity: number }) => [r.id, r.stock_quantity]));

    // Check stock against locked rows
    for (const item of items) {
      const available = stockMap.get(item.product_id) ?? 0;
      if (available < item.quantity) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: `Insufficient stock for: ${item.name}` }); return;
      }
    }

    const totalAmount = items.reduce((sum: number, i: { price: string; quantity: number }) =>
      sum + parseFloat(i.price) * i.quantity, 0);

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address) VALUES ($1, $2, $3) RETURNING *`,
      [req.user!.id, totalAmount, JSON.stringify(shippingAddress)]
    );
    const order = orderResult.rows[0];

    // Create order items + decrement stock
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.product_id, item.name, item.image, item.price, item.quantity,
         parseFloat(item.price) * item.quantity]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user!.id]);
    await client.query('COMMIT');

    res.status(201).json({ order, itemCount: items.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createOrder error', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT o.*, json_agg(oi.*) AS items
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const order = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (!order.rows[0]) { res.status(404).json({ error: 'Order not found' }); return; }
    const items = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Admin
export async function getAllOrders(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email,
              COUNT(oi.id) AS item_count
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id, u.name, u.email
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const { status } = req.body;
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` }); return;
  }
  try {
    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
