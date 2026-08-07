# Rencana Pengembangan (To-Do)

Berikut adalah daftar fitur yang direncanakan untuk iterasi Vidmix selanjutnya bersama tim:

- [ ] **FFmpeg Progress Bar**: Mengirim data *progress* dari `fluent-ffmpeg` melalui IPC bridge untuk ditampilkan di antarmuka pengguna React secara real-time.
- [ ] **Pause/Cancel Render**: Menambahkan fungsi untuk membatalkan proses render (*kill process*) jika pengguna melakukan kesalahan input.
- [ ] **Dukungan Format Media Tambahan**: Selain `.mp4` dan `.mp3`, perlu diuji dukungan ekstensi lain seperti `.mkv` dan `.wav`.
- [ ] **Logging System**: Implementasikan sistem *logging* error otomatis (misal menggunakan `winston`) ke file teks lokal untuk kemudahan *debugging*.
- [ ] **Auto-Update**: Konfigurasi modul `electron-updater` agar rilis pembaruan perangkat lunak bisa terunduh secara otomatis.
