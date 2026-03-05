export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  image: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
