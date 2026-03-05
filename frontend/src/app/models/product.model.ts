export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

export interface Product {
  id: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock_quantity: number;
  images: string[];
  attributes: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
