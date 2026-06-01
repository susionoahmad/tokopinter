# TODO - Logo Struk & Cetak Thermal (PWABuilder)

- [ ] Audit lokasi tombol **Cetak (Print)** dan jalur data `tenant.receiptLogo`, `printerAddress`, `printerAutoCut`.
- [ ] Tambahkan modul `src/lib/print/printEngine.ts` untuk membangun ESC/POS byte stream dari struk (teks + raster logo).
- [ ] Tambahkan modul `src/lib/print/bluetoothTransport.ts` untuk mengirim byte ESC/POS ke printer Bluetooth sesuai batasan PWABuilder.
- [ ] Wiring di `src/components/CashierTab.tsx`: tombol **Cetak (Print)** memanggil `printEngine.buildReceiptBytes()` lalu `bluetoothTransport.sendBytes()`.
- [ ] Buat fallback: bila bluetooth/print transport tidak tersedia, tetap tampilkan preview struk dan tampilkan pesan error yang jelas.
- [ ] Uji manual (tanpa printer) dengan mode dry-run: log ukuran bytes & nama tenant untuk memastikan pipeline terbentuk.
- [ ] Setelah ada printer, uji logo tercetak (monochrome) dan auto-cut sesuai setting.
