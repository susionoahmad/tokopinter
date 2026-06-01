import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Indomie Goreng Spesial',
    category: 'Makanan',
    price: 3500,
    cost: 2700,
    stock: 45,
    minStock: 10,
    barcode: '8998866200225',
    imageUrl: '🍜'
  },
  {
    id: 'prod-2',
    name: 'Teh Botol Sosro Kotak 250ml',
    category: 'Minuman',
    price: 4000,
    cost: 2900,
    stock: 30,
    minStock: 8,
    barcode: '8991002101234',
    imageUrl: '🧃'
  },
  {
    id: 'prod-3',
    name: 'Beras Pandan Wangi 5kg',
    category: 'Sembako',
    price: 78000,
    cost: 67000,
    stock: 8,
    minStock: 3,
    barcode: '8991234560011',
    imageUrl: '🌾'
  },
  {
    id: 'prod-4',
    name: 'Minyak Goreng Bimoli 1L',
    category: 'Sembako',
    price: 18500,
    cost: 15800,
    stock: 12,
    minStock: 5,
    barcode: '8991234560022',
    imageUrl: '🧴'
  },
  {
    id: 'prod-5',
    name: 'Gula Pasir Gulaku 1kg',
    category: 'Sembako',
    price: 16500,
    cost: 14200,
    stock: 22,
    minStock: 6,
    barcode: '8991234560033',
    imageUrl: '🍬'
  },
  {
    id: 'prod-6',
    name: 'Sabun Mandi Lifebuoy Merah',
    category: 'Sabun & Mandi',
    price: 4500,
    cost: 3200,
    stock: 2, // Low stock on startup to alert user
    minStock: 5,
    barcode: '8991234560044',
    imageUrl: '🧼'
  },
  {
    id: 'prod-7',
    name: 'Kopi Kapal Api Mix 1 Renceng',
    category: 'Minuman',
    price: 15000,
    cost: 12500,
    stock: 18,
    minStock: 4,
    barcode: '8991234560055',
    imageUrl: '☕'
  },
  {
    id: 'prod-8',
    name: 'Roti Tawar Sari Roti 1 Pack',
    category: 'Makanan',
    price: 15500,
    cost: 12800,
    stock: 6,
    minStock: 4,
    barcode: '8991234560066',
    imageUrl: '🍞'
  }
];

export const CATEGORIES = [
  'Semua',
  'Makanan',
  'Minuman',
  'Sembako',
  'Sabun & Mandi'
];
