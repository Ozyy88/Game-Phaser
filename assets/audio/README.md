# 🔊 Water Hop - Audio Assets

Folder ini berisi semua aset audio untuk game Water Hop.

## Daftar Audio

| File | Deskripsi | Format |
|------|-----------|--------|
| `jump.mp3` | Efek suara lompat | MP3 |
| `coin.mp3` | Efek suara koin terkumpul | MP3 |
| `splash.mp3` | Efek suara air saat jatuh | MP3 |
| `gameover.mp3` | Efek suara game over | MP3 |
| `bgm.mp3` | Musik latar belakang | MP3 |

## Catatan
- Saat ini game menggunakan **Web Audio API** untuk generate suara secara prosedural (tanpa file audio).
- Jika Anda ingin mengganti dengan file audio custom, letakkan file `.mp3` di folder ini dan update `SoundManager` di `game.js`.
- Format yang disarankan: **MP3** atau **OGG** untuk kompatibilitas browser terbaik.
