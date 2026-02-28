import type { NextApiRequest, NextApiResponse } from "next";
import type { Product } from "@/lib/types/product";

// Mock data — replace with Prisma DB calls in production
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1", slug: "wireless-headphones", name: "Wireless Headphones",
    price: 79.99, description: "Premium noise-cancelling wireless headphones with 30hr battery life.",
    images: [], badge: "new", categoryName: "Electronics", rating: 4.5, stock: 25,
  },
  {
    id: "2", slug: "smart-watch", name: "Smart Watch",
    price: 199.99, description: "Feature-rich smartwatch with health tracking, GPS, and AMOLED display.",
    images: [], badge: "sale", categoryName: "Electronics", rating: 4.8, stock: 12,
  },
  {
    id: "3", slug: "laptop-stand", name: "Ergonomic Laptop Stand",
    price: 49.99, description: "Adjustable aluminium laptop stand with six height settings.",
    images: [], categoryName: "Accessories", rating: 4.3, stock: 50,
  },
  {
    id: "4", slug: "mechanical-keyboard", name: "Mechanical Keyboard",
    price: 129.99, description: "Compact TKL mechanical keyboard with RGB backlighting.",
    images: [], badge: "low-stock", categoryName: "Accessories", rating: 4.7, stock: 5,
  },
  {
    id: "5", slug: "usb-c-hub", name: "USB-C Hub 7-in-1",
    price: 39.99, description: "Multi-port USB-C hub with HDMI 4K, USB 3.0, and SD card reader.",
    images: [], categoryName: "Accessories", rating: 4.2, stock: 40,
  },
  {
    id: "6", slug: "webcam-4k", name: "4K Webcam",
    price: 89.99, description: "Ultra HD 4K webcam with AI autofocus for streaming and conferencing.",
    images: [], badge: "new", categoryName: "Electronics", rating: 4.6, stock: 18,
  },
  {
    id: "7", slug: "desk-lamp", name: "LED Desk Lamp",
    price: 34.99, description: "Smart LED desk lamp with adjustable colour temperature and USB charging port.",
    images: [], categoryName: "Accessories", rating: 4.4, stock: 30,
  },
  {
    id: "8", slug: "wireless-charger", name: "Wireless Charger Pad",
    price: 29.99, description: "15W fast wireless charging pad compatible with Qi devices.",
    images: [], badge: "sale", categoryName: "Electronics", rating: 4.1, stock: 22,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
    });
  }

  const {
    page     = "1",
    limit    = "20",
    sort     = "newest",
    category,
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(4, parseInt(limit, 10)));

  let products = [...MOCK_PRODUCTS];

  if (category) {
    products = products.filter(
      (p) => p.categoryName?.toLowerCase() === category.toLowerCase()
    );
  }

  switch (sort) {
    case "price_asc":  products.sort((a, b) => a.price - b.price);            break;
    case "price_desc": products.sort((a, b) => b.price - a.price);            break;
    case "name_asc":   products.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: break; // "newest" — keep insertion order
  }

  const total    = products.length;
  const start    = (pageNum - 1) * limitNum;
  const paginated = products.slice(start, start + limitNum);

  return res.status(200).json({
    success: true,
    data:    paginated,
    meta: {
      page:  pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
}
