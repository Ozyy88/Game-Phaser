## Water Hop — Alur Permainan (detail sesuai kode)

Ringkasan: pemain mengendalikan karakter yang berdiri di atas pelampung/platform dan melompat ke pelampung berikutnya. Tujuan: kumpulkan koin, perpanjang waktu dengan item jam, dan dapatkan skor setinggi mungkin sebelum waktu habis atau pemain tenggelam.

1) Inisialisasi
   - Saat halaman selesai dimuat, game memasang instance `WaterHopGame` dan menampilkan layar Menu Utama ([index.html](index.html)).
   - Musik efek/BGM akan di-unlock pada interaksi pertama (klik atau tekan tombol).

2) Memulai Permainan
   - Pemain menekan tombol `PLAY` untuk memulai (`startGame()`): skor = 0, koin = 0, waktu = 30 detik.
   - Terbentuk platform awal (aman) dan satu platform target di depan; pemain ditempatkan di tengah platform pertama.

3) Kontrol
   - Ketuk/klik di layar (kecuali tombol UI) untuk memerintahkan karakter melompat ke arah titik sentuh.
   - Tekan `Space` untuk melompat ke platform berikutnya (jika ada) sebagai alternatif keyboard.

4) Mekanika Lompatan
   - Saat permintaan lompatan diterima, state berubah dari `PLAYING` → `JUMPING` dan suara lompatan diputar.
   - Kecepatan horizontal dan vertikal dihitung agar lintasan parabola mencapai jarak target.

5) Koleksi Item
   - Setiap platform (kecuali platform pertama) berpeluang ~45% menghasilkan item: 70% koin, 30% booster waktu.
   - Mengambil koin menambah jumlah koin (+1) dan memicu efek partikel serta suara.
   - Mengambil booster waktu menambahkan +5 detik (maks 50 detik) dan menampilkan teks +5 Detik.

6) Deteksi Pendaratan & Progres
   - Jika karakter mendarat di area platform berikutnya: dianggap landing aman → state kembali `PLAYING`, skor bertambah +1, kamera digeser, dan platform baru di-spawn.
   - Jika karakter melewati/terjatuh di sela platform → state menjadi `FALLING`.

7) Jatuh, Tenggelam, dan Game Over
   - `FALLING`: gravitasi mempercepat jatuh; saat melewati ambang, state berpindah ke `DROWNING` dengan efek splash.
   - `DROWNING`: muncul gelembung; jika karakter keluar layar bawah, terjadi `GAMEOVER`.
   - Waktu juga mengakibatkan game over saat `timeLeft` mencapai 0.
   - Pada Game Over, BGM dihentikan; tampilan skor akhir dan high score diperbarui, lalu layar Game Over muncul.

8) UI & HUD
   - Top bar menampilkan `Score`, `Coins`, dan `Time` secara real-time.
   - Tombol audio (`🔊/🔇`) toggle suara.
   - Tombol `PLAY AGAIN` pada layar Game Over memanggil `startGame()` kembali.

Catatan teknis singkat:
   - File utama: [game.js](game.js) — logika permainan, perpustakaan partikel, dan audio.
   - Struktur UI: [index.html](index.html) — canvas game, layar menu, layar gameover.
   - Aset berada di `assets/asetgame` dan audio di `assets/audio`.

Jika Anda mau, saya bisa:
- Menambahkan bagian "Kontrol" yang menampilkan teks instruksional pada layar utama.
- Menyertakan daftar tombol dan skema skor persis sesuai perhitungan di `game.js`.

