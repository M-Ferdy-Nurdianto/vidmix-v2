# Panduan Kustomisasi Installer (Setup.exe) Vidmix v2

Folder ini (`build`) digunakan oleh **electron-builder** untuk mengambil aset-aset khusus saat membuat installer Windows (`setup.exe`).

## 1. Gambar Installer (Tema Aplikasi & Promosi)
Untuk membuat installer terlihat profesional dan mempromosikan portofolio Anda, Anda perlu membuat 2 file gambar ini dan menyimpannya di folder ini (`build/`):

1. **`installerSidebar.bmp`**
   - **Ukuran**: 164 x 314 pixels.
   - **Format**: `.bmp` (Bitmap).
   - **Fungsi**: Gambar ini akan muncul di sidebar sebelah kiri pada saat instalasi.
   - **Tips Desain**: Buat desain dengan tema gelap (sesuai Vidmix), tambahkan logo Vidmix di atas, dan tulisan promosi Anda di bagian bawah (contoh: *Developed by Ferdy | ferdy.web.id | IG: @ferdy*).

2. **`installerHeader.bmp`**
   - **Ukuran**: 150 x 57 pixels.
   - **Format**: `.bmp` (Bitmap).
   - **Fungsi**: Gambar ini akan muncul di pojok kanan atas installer (biasanya untuk logo kecil aplikasi).

## 2. Script NSIS (`installer.nsh`)
File `installer.nsh` yang ada di folder ini adalah script khusus. Saat ini, script tersebut sudah diatur untuk mengubah **teks di bagian bawah (footer) jendela installer** menjadi:
> `Vidmix v2 | Portofolio: ferdy.web.id | IG: @ferdy`

## Cara Build
Setelah Anda memasukkan gambar `installerSidebar.bmp` dan `installerHeader.bmp` ke folder ini, jalankan perintah:
```bash
npm run electron:build
```
Installer yang dihasilkan (`dist-electron/Vidmix v2 Setup 2.0.0.exe`) akan otomatis menggunakan desain dan teks custom Anda!
