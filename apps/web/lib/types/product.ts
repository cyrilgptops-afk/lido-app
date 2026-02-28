export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  description?: string;
  images: string[];
  badge?: "sale" | "new" | "low-stock";
  categoryName?: string;
  rating?: number;
  stock?: number;
}
