# Migrasi POS Kasir ke SQL Backend (Selesai Tahap Inti)

Migrasi dari Firebase Firestore ke PostgreSQL dengan Backend Node.js telah berhasil diselesaikan untuk fitur-fitur utama. Sistem sekarang berjalan dengan arsitektur yang lebih profesional dan skalabel.

## Perubahan Utama

### 1. Sistem Autentikasi JWT
- **Lama**: Verifikasi PIN dilakukan di sisi klien (browser).
- **Baru**: PIN dikirim ke Backend, diverifikasi ke database PostgreSQL, dan mengembalikan JWT (JSON Web Token) untuk sesi aman selama 24 jam.

### 2. Manajemen Produk & Stok SQL
- Penambahan, pembaruan, dan penghapusan produk sekarang langsung tersimpan di tabel `products`.
- Setiap perubahan stok mencatat riwayat ke tabel `stock_logs` secara otomatis di sisi server.

### 3. Transaksi Atomic
- Proses "Selesaikan Penjualan" kini mengirim data ke endpoint `/api/transactions/:tenantId`.
- Backend melakukan **Atomic Transaction**:
    1. Mencatat Nota Penjualan.
    2. Mengurangi stok barang secara presisi.
    3. Mencatat log keluar barang.
    4. (Jika gagal di satu langkah, semua dibatalkan untuk menjaga integritas data).

### 4. API Service Robust
- File `src/lib/api.ts` kini menjadi jembatan utama yang menangani seluruh komunikasi antar-tenant.

## Yang Telah Diuji
- [x] Login Admin & Kasir via SQL.
- [x] CRUD Produk (Tambah, Edit, Hapus) ke SQL.
- [x] Transaksi Penjualan & Pengurangan Stok Otomatis.
- [x] Reset Data Toko via API.

## Saran Perbaikan Keamanan (Future Updates)
> [!IMPORTANT]
> Untuk meningkatkan keamanan user/PIN yang Anda tanyakan:
> 1. **Password Hashing**: Gunakan `bcryptjs` di backend untuk menyimpan PIN sebagai hash, bukan teks biasa.
> 2. **Refresh Tokens**: Implementasikan sistem rotasi token jika ingin sesi yang lebih lama/aman.
> 3. **SSL/HTTPS**: Wajib digunakan saat deploy ke GCP agar JWT tidak bisa dicuri.

## Langkah Berikutnya
1. **Deployment**: Upload folder `server/` ke VM GCP dan setup database PostgreSQL di sana.
2. **Laporan Agregat**: Membuat query SQL untuk laporan laba/rugi harian secara otomatis di backend.
