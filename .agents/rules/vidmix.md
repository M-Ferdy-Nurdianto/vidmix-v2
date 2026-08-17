# VidmixV2 — Agent Context & Hard Rules

## Tentang Project
VidmixV2 adalah desktop app (Electron + React + Vite) untuk auto-generate video loop panjang (video + musik + layer overlay) menggunakan FFmpeg via fluent-ffmpeg.
Dipakai untuk konten YouTube/streaming loop (misal musik loop 15m/30m/1h dengan video looping + watermark/text/spectrum visualizer).

Stack:
- Frontend: React + Vite + Tailwind (src/App.jsx — file utama, besar)
- Backend/Main process: Electron (electron/main.js)
- Video processing: fluent-ffmpeg + @ffmpeg-installer/ffmpeg (binary di-bundle, BUKAN pakai ffmpeg system)

Ada 2 mode render yang TERPISAH di electron/main.js:
1. `ipcMain.handle('start-render', ...)` — Batch Mixer (mode lama, generate banyak video sekaligus dari kombinasi video+musik)
2. `ipcMain.handle('render-editor', ...)` — Editor mode (mode baru, WYSIWYG dengan Layers panel: text, image, sticker, watermark, spectrum, dengan posisi x/y/scale/z-index per elemen)

## ATURAN KERAS — JANGAN PERNAH DILANGGAR

1. **JANGAN PERNAH hapus/hilangkan kode terkait `BOT_WA_ENABLED`** di project manapun yang aku kerjakan (VidmixV2 maupun LokTik). Kalau ada flag/env var ini di codebase, JANGAN disentuh nilainya, JANGAN dihapus fungsinya — biarin tetap inactive/false sampai aku eksplisit minta diaktifkan.

2. **JANGAN gabungin/hapus pemisahan antara `start-render` (Batch Mixer) dan `render-editor` (Editor mode)**. Ini dua alur render yang sengaja dipisah. Kalau nemu bug di satu handler, JANGAN "refactor jadi satu fungsi shared" tanpa aku minta — cukup fix di masing-masing handler yang relevan, dan SEBUTKAN eksplisit kalau bug yang sama kemungkinan ada di handler satunya.

3. **JANGAN ubah struktur filter_complex FFmpeg secara drastis** tanpa jelasin dulu apa yang berubah dan kenapa. Filter graph ini kompleks (banyak label chaining: `[outa]`, `[lastOutputLabel]`, dst) — perubahan kecil yang salah bisa bikin seluruh render gagal. Selalu trace label input/output sebelum ubah apapun di bagian ini.

4. **Setiap kali fix bug, JANGAN cuma fix di satu tempat kalau kode yang mirip ada di beberapa lokasi.** Contoh nyata: bug `-map [outa]` yang hardcode di `start-render` padahal ada `finalAudioLabel` dinamis — bug yang SAMA PERSIS sebenarnya sudah pernah difix di `render-editor` sebelumnya, tapi gak ke-apply ke `start-render`. SELALU grep dulu pola kode yang mau difix di seluruh file sebelum bilang "sudah fix".

5. **Setelah edit `electron/main.js`, app HARUS di-restart total** (bukan cuma reload window React) karena itu Node main process, bukan renderer. Kalau testing pakai versi installed (.exe), harus rebuild dulu: `npm run electron:build`.

6. Semua teks UI (tombol, label, pesan error) pakai **Bahasa Indonesia yang natural**, bukan hasil translate kaku. Ikuti gaya yang sudah ada di app (santai tapi jelas, contoh: "Kustom Nama Output", "Pilih Musik (Bisa Drag & Drop)").

---

## Riwayat Bug Fix (Referensi, Jangan Diulang)

Kalau kamu (AI agent) baca file ini, artinya bug-bug di bawah SUDAH pernah difix. Sebelum "fix" ulang hal yang mirip, cek dulu apakah kode saat ini sudah sesuai state di bawah. Kalau kamu nemu kode yang beda dari "SESUDAH", kemungkinan itu regresi dari edit sebelumnya — laporkan dulu ke user sebelum asal overwrite.

### Bug #1: FFmpeg error "Output with label 'outa' does not exist"
**Penyebab:** Saat ada layer `spectrum`, label audio `[outa]` di-asplit jadi `[outa_final]` + `[aud_spec_N]` (di `finalAudioLabel`). Tapi di bagian `outputOpts`, `-map` audio di-hardcode ke `[outa]`.
**Fix:** Pakai ``-map [${finalAudioLabel}]`` di kedua handler `start-render` dan `render-editor`.

### Bug #2: Deteksi GPU pakai wmic yang sudah deprecated
**Penyebab:** `wmic` dihapus di Windows 11 24H2+.
**Fix:** Coba PowerShell `Get-CimInstance Win32_VideoController` dulu, fallback ke `wmic`, baru fallback terakhir ke `libx264`.

### Bug #3: Path font di-hardcode ke drive C:
**Penyebab:** Path font hardcode `C:/Windows/Fonts/...`. FFmpeg gagal render text jika Windows ada di drive lain.
**Fix:** Pakai `process.env.WINDIR` dengan fallback bertingkat: font spesifik → font base → arial.ttf → `null`.

### Bug #4: Error message di popup terlalu pendek, log lengkap susah diakses
**Penyebab:** Log lengkap ditulis ke `app.getPath('userData')`, UI cuma nampilin `err.message` singkat.
**Fix:** Error yang di-reject ke UI includes tail 15 baris terakhir dari log FFmpeg lengkap + path lokasi file log-nya.

---

## Cara Kerja FFmpeg Filter Graph (Panduan Sebelum Edit)

Bagian tersulit & paling gampang bikin bug di codebase ini adalah generate string `filter_complex` untuk FFmpeg. Ini penjelasan alurnya supaya AI agent gak asal ubah dan bikin regresi.

### Konsep Dasar
`filterParts` adalah array of string, tiap elemen satu filter FFmpeg. Di akhir, semua di-join jadi satu string besar dengan `;` (`filterParts.join(';')`) → ini yang jadi `filter_complex`.

Setiap filter punya format: `[input_label]nama_filter=param[output_label]`

**PRINSIP PALING PENTING:** Setiap label (`[xxx]`) yang jadi OUTPUT dari satu filter harus dipakai sebagai INPUT di filter berikutnya (atau di final `-map`). Kalau ada label yang:
- Dipakai 2x sebagai input tanpa di-split dulu → ERROR
- Tidak pernah dipakai sebagai input dan bukan final map → boros tapi gak error
- Di-reference sebagai input padahal belum pernah jadi output di manapun → ERROR "does not exist"

### Alur Audio (WAJIB DIPAHAMI KALAU MAU UBAH APAPUN SOAL AUDIO)

1. Semua file audio input di-resample & format-in dulu ke `[a_resampled_N]`
2. Semua `[a_resampled_N]` di-concat jadi `[concat_a]`
3. `[concat_a]` di-loudnorm + fade in/out jadi `[outa]`
4. **KALAU ADA layer spectrum**: `[outa]` di-`asplit` jadi beberapa cabang:
   - `[outa_final]` — ini yang dipakai buat audio output final
   - `[aud_spec_0]`, `[aud_spec_1]`, dst — satu per spectrum layer, buat divisualisasikan jadi gelombang/waveform
   - Variabel `finalAudioLabel` di-update jadi `'outa_final'`
5. **KALAU TIDAK ADA layer spectrum**: `finalAudioLabel` tetap `'outa'`

⚠️ ATURAN: SETIAP kali kamu nulis `-map` atau referensi ke output audio final, WAJIB pakai variabel `finalAudioLabel`, JANGAN hardcode `'outa'` atau `'outa_final'` langsung. Ini penyebab Bug #1.

### Alur Video/Visual

1. Mulai dari `lastOutputLabel = '0:v'` (video input pertama, mentah)
2. Kalau ada watermark global → overlay ke `lastOutputLabel`, update jadi `out_wm`
3. Loop semua `sortedLayers` (diurutkan by zIndex), tiap layer:
   - Ambil `lastOutputLabel` sebagai base
   - Apply filter sesuai tipe layer (overlay untuk image/sticker/watermark, drawtext untuk text, showwaves+geq untuk spectrum)
   - Update `lastOutputLabel` ke output baru
4. Di akhir loop, `lastOutputLabel` adalah hasil akhir semua layer ke-stack

⚠️ ATURAN: `lastOutputLabel` HARUS selalu diupdate setiap kali nambah filter baru yang mengubah video. Kalau lupa update, layer berikutnya bakal nge-skip hasil layer sebelumnya (bug "layer ketutupan/ilang").

### Kalau Mau Nambah Jenis Layer Baru (Checklist WAJIB)

1. Tambahin logic generate filter di dalam loop `sortedLayers.forEach(...)` — ikuti pola layer yang sudah ada.
2. PASTIKAN update `lastOutputLabel` di akhir blok logic layer barunya.
3. Kalau layer baru butuh input tambahan (gambar/file), tambahin ke `command.input(...)` dan hitung index-nya dengan benar.
4. Terapkan perubahan yang SAMA PERSIS di KEDUA handler (`start-render` DAN `render-editor`).
5. Test dengan kombinasi: layer baru SENDIRIAN, layer baru + spectrum, layer baru + watermark, layer baru + banyak layer lain sekaligus.

---

## Coding Conventions (Ikuti Supaya Konsisten Antar Sesi/Agent)

### Umum
- Bahasa komentar kode: campur Indonesia-Inggris seperti yang sudah ada (komentar penjelasan logic pakai Indonesia, nama variabel/fungsi pakai Inggris/camelCase)
- JANGAN import library baru tanpa nanya dulu ke user — cek `package.json` dulu, kalau ada library yang mirip fungsinya sudah terpasang, pakai itu
- JANGAN ubah `BOT_WA_ENABLED` atau kode terkait WA bot (lihat PART 1 aturan #1) — ini berlaku di semua project (VidmixV2, LokTik, dll)

### Penamaan Label FFmpeg Filter
- Pola: `[nama_deskriptif_index]` — contoh: `wave_raw_0`, `spec_scaled_2`, `a_resampled_1`
- JANGAN pakai nama generic yang gampang collision seperti `[out]`, `[tmp]` tanpa index/suffix unik
- Variabel yang nyimpen "output terakhir yang harus dipakai" (`lastOutputLabel`, `finalAudioLabel`) HARUS selalu dipakai via variabel, JANGAN pernah hardcode nilai stringnya langsung di tempat lain

### Sebelum Klaim "Sudah Fix"
Wajib jalanin urutan ini sebelum bilang ke user bug sudah kelar:
1. `grep_search` pola kode yang mirip di SELURUH file (bukan cuma di lokasi bug yang dilaporkan) — cek apakah bug yang sama ada di tempat lain
2. Sebutkan eksplisit ke user: "Fix ini saya terapkan di [lokasi A]. Saya cek juga [lokasi B/C yang mirip], hasilnya: [sudah benar / ikut saya fix juga / tidak relevan karena ...]"
3. JANGAN bilang "sudah pasti kelar" tanpa user coba render ulang dan konfirmasi — selalu minta user test dan kasih tau hasilnya

### Struktur Perubahan
- Untuk bug fix kecil (1-5 baris): kasih SEBELUM/SESUDAH yang jelas, JANGAN rewrite seluruh fungsi
- Untuk fitur baru: jelasin dulu rencana perubahan dalam poin-poin sebelum nulis kode, biar user bisa koreksi arah sebelum kerjaan kebanyakan
- SELALU sebutkan file mana + baris sekitar berapa yang diubah, biar user gampang cross-check manual kalau perlu

---

## Checklist Sebelum Klaim Bug Fixed

Sebelum bilang ke user "sudah fix, coba render ulang", pastikan hal-hal ini sudah dipikirkan (kalau nggak bisa dites langsung karena ini desktop app Windows, minimal SEBUTKAN checklist ini ke user biar mereka yang test):

- [ ] Apakah fix diterapkan di KEDUA handler render (`start-render` DAN `render-editor`) kalau bug-nya relevan ke keduanya?
- [ ] Apakah ada label FFmpeg filter yang di-reference tapi mungkin belum pernah jadi output (`[xxx]` dipakai sebagai input padahal belum pernah muncul sebagai output di filterParts manapun)?
- [ ] Apakah ada label yang dipakai 2x sebagai input tanpa di-split dulu?
- [ ] Kalau ubah bagian yang berhubungan sama path file sistem (font, ffmpeg binary, folder output) — apakah masih hardcode asumsi device tertentu (drive C:, folder khusus, dll)?
- [ ] Apakah user perlu restart full app (bukan cuma reload) buat lihat efek perubahan ini? Kalau iya, WAJIB diingatkan eksplisit.
- [ ] Apakah user perlu rebuild (`npm run electron:build`) kalau testing pakai versi .exe yang sudah ter-install?
- [ ] Kalau bug ini kejadian di device tertentu doang / kadang muncul kadang nggak — apakah sudah dicek kemungkinan penyebabnya spesifik ke environment device (font gak ada, drive beda, Windows version beda, GPU driver), bukan cuma logic error?
