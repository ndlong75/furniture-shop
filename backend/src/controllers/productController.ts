import { Request, Response } from 'express';
import { query } from '../config/db';
import slugify from 'slugify';
import { AuthRequest } from '../middleware/auth';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { category, search, minPrice, maxPrice, page = '1', limit = '12' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions: string[] = ['p.is_active = TRUE'];
  const params: unknown[] = [];
  let pi = 1;

  if (category) {
    conditions.push(`c.slug = $${pi++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(p.name ILIKE $${pi} OR p.description ILIKE $${pi})`);
    params.push(`%${search}%`);
    pi++;
  }
  if (minPrice) { conditions.push(`p.price >= $${pi++}`); params.push(parseFloat(minPrice)); }
  if (maxPrice) { conditions.push(`p.price <= $${pi++}`); params.push(parseFloat(maxPrice)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.id, p.name, p.slug, p.price, p.stock_quantity, p.images,
              c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      products: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('getProducts error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getProductBySlug(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [req.params.slug]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const { category_id, name, description, price, stock_quantity, images, attributes } = req.body;
  if (!name || !price) { res.status(400).json({ error: 'Name and price are required' }); return; }
  const slug = slugify(name, { lower: true, locale: 'vi' }) + '-' + Date.now();
  try {
    const result = await query(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, images, attributes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [category_id, name, slug, description, parseFloat(price), parseInt(stock_quantity) || 0,
       JSON.stringify(images || []), JSON.stringify(attributes || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createProduct error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { category_id, name, description, price, stock_quantity, images, attributes, is_active } = req.body;

  if (!name || !price) { res.status(400).json({ error: 'Name and price are required' }); return; }

  const parsedPrice = parseFloat(price);
  const parsedStock = parseInt(stock_quantity, 10);

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    res.status(400).json({ error: 'Price must be a non-negative number' }); return;
  }
  if (isNaN(parsedStock) || parsedStock < 0) {
    res.status(400).json({ error: 'Stock quantity must be a non-negative integer' }); return;
  }

  let parsedImages: unknown[];
  let parsedAttributes: Record<string, unknown>;
  try {
    parsedImages = Array.isArray(images) ? images : JSON.parse(images ?? '[]');
    parsedAttributes = typeof attributes === 'object' && !Array.isArray(attributes)
      ? attributes
      : JSON.parse(attributes ?? '{}');
  } catch {
    res.status(400).json({ error: 'images must be a JSON array and attributes must be a JSON object' }); return;
  }

  try {
    const result = await query(
      `UPDATE products SET category_id=$1, name=$2, description=$3, price=$4,
       stock_quantity=$5, images=$6, attributes=$7, is_active=$8
       WHERE id=$9 RETURNING id, name, slug, price, stock_quantity, images, attributes, is_active, category_id, created_at, updated_at`,
      [category_id ?? null, name, description ?? null, parsedPrice, parsedStock,
       JSON.stringify(parsedImages), JSON.stringify(parsedAttributes), is_active ?? true, id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateProduct error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
