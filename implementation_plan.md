# Rencana Migrasi SQL Pos Kasir

Rencana ini merinci langkah-langkah untuk mengubah sumber data dari Firebase Firestore ke Database SQL (PostgreSQL) melalui API Node.js.

## Status Saat Ini
- [x] Desain Database SQL (`database.sql`)
- [x] Setup Backend Node.js Express (`server/`)
- [x] Implementasi JWT Authentication di Backend
- [x] Helper API di Frontend (`src/lib/api.ts`)

## Tahapan Migrasi Bertahap

### 1. Tahap Login & Keamanan (AUTH)
- [ ] Ubah `handleSelectTenant` di `App.tsx` agar memanggil `/api/auth/login`.
- [ ] Simpan JWT Token di `localStorage`.
- [ ] Implementasi auto-login menggunakan token yang tersimpan saat aplikasi dibuka.

### 2. Tahap Kelola Produk (INVENTORY)
- [ ] Ubah fungsi `fetchProducts` agar mengambil data dari `/api/products/:tenantId`.
- [ ] Ubah fungsi `handleUpdateProduct` agar menyimpan data ke SQL via API.
- [ ] Tambahkan fitur "Migrasi ke SQL" untuk memindahkan data lama yang masih ada di Firebase ke database baru.

### 3. Tahap Inti Transaksi (SALES)
- [ ] Ubah `handleSaveTransaction` agar mengirim data ke `/api/transactions`.
- [ ] Pastikan pengurangan stok terjadi di sisi Server (Backend) untuk menjaga akurasi data.
- [ ] Verifikasi Log Stok masuk ke tabel `stock_logs` di SQL.

### 4. Tahap Laporan & Dashboard (REPORTS)
- [ ] Ubah tab Laporan agar mengambil data dari SQL.
- [ ] Implementasi query SQL yang lebih canggih untuk Profit & Loss mingguan/bulanan.

## Cara Menjalankan Secara Lokal
1. Pastikan PostgreSQL berjalan dan database `pos_db` sudah dibuat menggunakan `database.sql`.
2. Jalankan Backend: `cd server && npm run dev`.
3. Jalankan Frontend: `npm run dev`.

---
**Catatan Penting**: Selama masa migrasi, kita akan mematikan fitur auto-sync Firebase secara bertahap agar tidak terjadi konflik data.
