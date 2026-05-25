# Deskripsi Alur Game

Dokumen ini menjelaskan alur dasar permainan web dalam proyek ini. Sesuaikan detail (kontrol, skor, level) dengan implementasi di `index.html` dan `game.js`.

## Alur Permainan (ringkas)

1. Menu Utama
   - Pemain membuka halaman utama dan menekan tombol "Mulai" untuk memulai permainan.

2. Persiapan / Pemilihan
   - Jika tersedia, pemain memilih level atau mode permainan.
   - Menampilkan instruksi singkat atau tutorial jika diperlukan.

3. Gameplay
   - Permainan dimulai: pemain mengendalikan avatar/objek menggunakan kontrol yang tersedia.
   - Tujuan umum: kumpulkan item/score, hindari rintangan, atau capai tujuan tertentu dalam batas waktu.
   - Sistem skor/nyawa berjalan selama permainan.

4. Pause
   - Pemain dapat menjeda permainan untuk melihat status atau pengaturan.

5. Game Over / Menang
   - Permainan berakhir ketika kondisi kalah atau menang tercapai.
   - Tampilkan skor akhir, statistik singkat, dan opsi untuk mengulang atau kembali ke menu utama.

6. Lanjutkan / Simpan
   - (Opsional) Simpan skor ke leaderboard lokal atau restart level.

## Catatan Implementasi

- Kontrol (contoh): panah / WASD untuk bergerak, spasi untuk aksi.
- Skor: tentukan cara perhitungan dan tampilan di HUD.
- Level & Asset: letakkan aset di folder `assets/asetgame` dan muat lewat `generate_assets.html` jika perlu.

Silakan beri tahu jika Anda mau saya lengkapi README ini dengan kontrol, skor, atau alur spesifik sesuai kode di `game.js`.
