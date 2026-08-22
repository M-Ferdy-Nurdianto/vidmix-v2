# 📖 Panduan Fitur & Pengembangan Vidmix v2

Dokumen ini dibuat untuk membantu Anda (dan developer lain) memahami bagaimana fitur-fitur di dalam Vidmix v2 bekerja. Tujuannya adalah untuk **mengurangi error di masa depan**, memperjelas alur kerja logika aplikasi, dan menjadi pengingat tentang cara penanganan berbagai fungsi (terutama yang melibatkan FFmpeg dan React Canvas).

---

## 🏗️ Arsitektur Utama
Vidmix v2 dibangun menggunakan kombinasi:
- **Electron (Main Process):** Mengatur akses ke sistem (baca/tulis file) dan menjalankan perintah terminal (seperti mengeksekusi proses **FFmpeg**).
- **React + Vite (Renderer Process / Frontend):** Mengatur antarmuka pengguna (UI), memberikan preview visual interaktif sebelum video benar-benar dirender oleh FFmpeg.

**⚠️ Aturan Emas Pencegahan Error:**
> *Apa yang Anda lihat di preview (React Canvas) belum tentu akan sama hasilnya di video akhir jika parameter (seperti posisi, teks multiline, atau warna yang dihapus) tidak dikirimkan dengan benar ke fungsi FFmpeg di Electron.*

---

## 🎨 1. Fitur Hapus Background (Remove BG)
Fitur ini memungkinkan pengguna untuk menghapus background foto/video hijau, biru, atau warna spesifik lainnya, lalu mengekspornya menjadi format transparan.

### Bagaimana Cara Kerjanya?
Di sisi antarmuka, ada 3 metode penghapusan:
1. **Color Picker:** Memilih warna secara manual.
2. **Magic Fill (Smart/Global):** Mengeklik area tertentu di gambar, dan algoritma akan mendeteksi warna di area tersebut.
3. **Auto Remove BG:** Otomatis mendeteksi warna rata-rata dari sudut gambar.

Di sisi video (saat ekspor):
Aplikasi memanggil FFmpeg menggunakan filter `colorkey` dengan format warna hex (contoh: `#00FF00`).

### 🐛 Error yang Sering Terjadi & Solusinya
- **Bug Sebelumnya:** Gambar di kanvas berhasil dihapus backgroundnya menggunakan *Magic Fill*, tapi hasil video tetap memiliki background (biasanya karena menghapus warna default hitam).
- **Solusi/Pencegahan:** 
  Pastikan setiap kali kanvas menggunakan *Magic Fill* atau *Auto Remove BG*, state `pickedColor` **HARUS** di-update dengan warna asli yang diklik/dideteksi. Jika `pickedColor` tidak diupdate, maka UI mengirim warna hitam (`rgb(0,0,0)`) ke FFmpeg, sehingga FFmpeg salah menghapus warna.

### Panduan Ekspor Transparan
Agar video benar-benar bisa menampung transparansi (Alpha Channel), ekstensi dan codec yang digunakan di FFmpeg telah diatur secara khusus:
- **`.mov`**: Menggunakan codec `prores_ks` dengan format pixel `yuva444p10le`.
- **`.webm`**: Menggunakan codec `libvpx-vp9` dengan format pixel `yuva420p`.

---

## 📝 2. Fitur Editor Video & Teks Multiline
Editor video memungkinkan penambahan Teks, Stiker, Gambar, Spectrum, dan Watermark ke dalam satu kanvas visual yang dapat ditarik-tarik (drag & drop).

### 🐛 Error yang Sering Terjadi pada Teks (Multiline)
- **Bug Sebelumnya:** Saat pengguna mengetik teks panjang dan menekan `Enter` (spasi ke bawah), preview di editor tetap merendernya sebagai satu baris lurus memanjang ke kanan hingga keluar dari kotak video.
- **Penyebab:** Pada styling div CSS di React, `whiteSpace` diatur ke `'nowrap'`. 
- **Solusi/Pencegahan:**
  Pada file `LayerCanvas.jsx`, styling untuk layer text harus menggunakan `whiteSpace: 'pre'` dan `textAlign: 'center'`. Dengan begitu, elemen UI di HTML/React akan menghormati setiap karakter baris baru (`\n`) yang dibuat pengguna di textarea input.

### Z-Index (Urutan Tumpukan Layer)
- Layer dengan Z-Index yang lebih besar akan berada di atas.
- *Watermark* sengaja diprogram agar selalu memiliki `Z-Index` paling tinggi (`9000+`) agar tidak tertimpa oleh stiker atau teks lain.

---

## ⚙️ 3. Proses Render Video (FFmpeg `main.js`)
Pusat eksekusi berada di `electron/main.js` pada *handler* seperti `ipcMain.handle('start-render')` dan `ipcMain.handle('render-editor')`.

### Hal yang Perlu Diperhatikan Saat Mengubah Logika Render:
1. **Aturan Menangani Gambar Statis (Foto):** Jika input berupa foto (.jpg, .png) dan dirender menjadi video (atau di-overlay), kita **WAJIB** menambahkan opsi input `['-loop', '1', '-framerate', '30']`.
   - *Kenapa?* Jika `-loop 1` tidak disertai `-framerate`, FFmpeg sering gagal men-generate timestamp (PTS) yang beraturan, sehingga foto hanya muncul sekilas, error, atau berubah menjadi layar hitam polos ketika di-overlay dengan video/spectrum. Begitu juga untuk gambar sisipan (stiker/center image), jika tidak di-loop, ia hanya akan tampil selama 1 frame lalu menghilang.
2. **Audio Codec:** Saat mengekspor ke `.webm` atau `.mov`, pastikan codec audio sesuai (misalnya `aac` untuk `.mov` dan `libvorbis` untuk `.webm`). Jika menggunakan `copy`, proses bisa *crash* karena kontainer `.webm` tidak selalu mendukung codec asal video (seperti mp3/aac).
3. **Filter Complex:** Setiap teks, gambar, dan efek (seperti spectrum) diubah menjadi perintah teks filter complex FFmpeg (`-filter_complex`). FFmpeg sangat ketat; kesalahan satu tanda koma atau nama variabel label input bisa menyebabkan render gagal.
4. **Resolusi Output:** Beberapa codec (seperti H264) mensyaratkan dimensi tinggi dan lebar gambar adalah angka genap. Filter `scale=trunc(iw/2)*2:trunc(ih/2)*2` digunakan untuk mencegah error *"height not divisible by 2"*.

---

## 💡 Tips untuk Anda sebagai Pengembang & Pengguna
1. **Pantau Terminal/Log:** Jika sewaktu-waktu aplikasi gagal merender video, FFmpeg error log biasanya disimpan di `C:\Users\[Username]\AppData\Roaming\vidmix-v2\ffmpeg-error.log`. Membaca log tersebut adalah cara tercepat mencari tahu penyebab crash.
2. **Sinkronisasi React & FFmpeg:** Pastikan setiap properti baru yang Anda tambahkan di tombol (misal: tombol rotasi teks) dikirimkan dari UI (React) ke *backend* (Electron) dan diterjemahkan menjadi argumen FFmpeg yang sah.

---
*Dokumen ini dibuat agar bisa dibaca kapan saja untuk mempermudah perbaikan maupun penambahan fitur di Vidmix v2.*
