---
name: generate-vidio
description: Ubah satu naskah dari /generate-naskah menjadi video Shorts animasi selesai (tokoh kartun 2D di dunia 3D, narator ElevenLabs bahasa Indonesia, caption per kata, musik dan efek suara). Pakai saat user mengetik /generate-vidio diikuti nomor opsi atau judul, misalnya "/generate-vidio 2" atau "/generate-vidio Jembatan yang Runtuh karena Lagu".
argument-hint: "<nomor opsi atau judul dari topics/naskah_latest.md>"
---

# Generate vidio

Naskah yang dipilih: $ARGUMENTS

Hasil akhir: `out/<slug>/<slug>.mp4` (1080x1920, 30 fps, 55–65 dtk, suara + caption + musik + SFX) dan `out/<slug>/upload.txt`.

## 0. Baca dulu (wajib, setiap kali)
1. `CLAUDE.md` (aturan channel, bahasa, perintah).
2. `.claude/skills/cartoon-3d-short/SKILL.md`: pipeline dunia 3D, **nilai look final** (cahaya, tinta, lensa, grade, karakter, kamera) dan daftar perbaikan. Nilai look itu JANGAN diubah; yang berubah per video hanya cerita, tata letak dunia, pemeran dan kamera.
3. `.claude/skills/cartoon-3d-short/references/STYLE_BIBLE.md` dan, untuk detail, `references/reports/*.md` (motion, depth, characters, lighting...). Frame referensi di `references/frames/` hanya untuk dibandingkan, jangan pernah dipublikasikan.
4. Contoh lengkap yang sudah terbukti: `src/videos/bridge/` (komposisi `BridgeShort`).

## 1. Ambil naskah
- Angka → opsi itu di `topics/naskah_latest.md`. Judul → cocokkan (boleh tidak persis) dengan judul opsi. Kosong → tanya user, lalu berhenti.
- Kalau tidak ada di file: anggap teks itu cerita baru; riset dulu (≥2 sumber) dan tulis naskahnya mengikuti rumus di `.claude/skills/generate-naskah/SKILL.md`.
- Ambil slug dari opsi (`[slug: ...]`). Buat `projects/<slug>/`:
  - `script.txt`: naskah final, **satu kalimat per baris**, angka ditulis huruf;
  - `facts.md`: fakta, sumber, catatan apa yang disederhanakan/fiksi.
- Tunjukkan naskah final ke user dalam satu pesan singkat lalu **langsung lanjut** (tidak perlu menunggu), kecuali user minta ditinjau dulu.

## 2. Suara (ElevenLabs)
```
.venv/Scripts/python.exe tools/voice.py projects/<slug>/script.txt projects/<slug>
```
→ `voice.wav` + `words.json` (timing per kata persis dengan naskah).
- Target 55–65 dtk. Terlalu panjang/pendek: ubah naskah (tambah/potong kalimat) atau `ELEVENLABS_SPEED` di `.env` (0.9–1.15), lalu buat ulang. **Setiap pembuatan ulang memakai kredit ElevenLabs**: rapikan naskah dulu, jangan coba-coba berkali-kali.
- Dengarkan tidak bisa; jadi periksa `words.json`: tiap kata ada, tidak ada jeda aneh > 0,8 dtk.

## 3. Suara latar (musik + SFX)
Tulis `projects/<slug>/sound.json` (format lengkap di docstring `tools/sound.py`):
- `music.prompt`: instrumental yang cocok dengan mood (mis. "playful pizzicato cartoon mystery, light percussion, quirky, 110 bpm"; untuk kisah lama: "light comedic march, fife and snare"; misteri: "curious plucky strings, ticking clock"). Default `gain_db` -10.
- `sfx`: **8–15 efek**, tepat di kata kuncinya (`at_word`, `nth`), mis. whoosh di hook, benturan, tawa orang, kerumunan, langkah, pintu, air, ledakan kecil, "ding" di twist. Tulis prompt dalam bahasa Inggris yang spesifik ("crowd of villagers laughing", "cartoon boing"). Efek bawaan gratis: `{"local": "pop"}` (whoosh pop splash sting squish chime thunder crash rumble tick coins ding boing laugh).
```
.venv/Scripts/python.exe tools/sound.py projects/<slug>
```
→ `mix.wav` (-14 LUFS) dan `length.json` (`frames` = panjang video). Hasil ElevenLabs di-cache (`projects/<slug>/cache/`), jadi menjalankan ulang tidak memakan kredit selama teksnya sama.

## 4. Rencana shot
Tulis `projects/<slug>/shots.md` dulu, sebelum kode:
- **Satu kalimat = satu shot** (kalimat panjang boleh 2 framing dalam satu shot). Frame = `round(start_detik * 30)` dari `words.json`; shot berakhir di awal kalimat berikutnya; total frame = `length.json`.
- Per shot: tempat, siapa di layar + ekspresi/aksi, framing kamera (wide / medium / close-up / dari bawah / dari atas), gerakan, cahaya (`day`, `golden`; penjelasan sains boleh pindah ke cahaya lain), efek 2D (burst, puff, bintang, splash, tanda), dan foreground prop.
- Aturan gaya (dari referensi): setiap kalimat **diilustrasikan secara harfiah**; kamera kebanyakan diam dengan push-in pelan, gerakan berupa glide 18–40 frame; hard cut hanya untuk lompatan besar; crossfade 6–8 frame saat pindah tempat; kilat putih 4 frame setelah hook; dutch tilt 4–5° untuk drama; depth of field di close-up/medium; tokoh punya bayangan kontak.
- Tokoh: beri tokoh utama **warna/aksesori khas** dan pertahankan di semua shot. Desain sendiri (jangan menyalin tokoh channel lain).

## 5. Bangun videonya (kode)
1. Salin contoh: `cp -r src/videos/bridge src/videos/<slug>` (nama folder = slug). Hapus `words_test.json` di salinan.
2. **Tetap (jangan ubah nilainya)**: `ink.ts`, `lensblur.ts`, `grade.ts`, `shade.ts`, `cardshade.ts`, `lights.ts`, `Bridge.tsx` (pipeline post), bagian look di `paint.ts` dan `toon.ts`.
3. **Tulis ulang untuk cerita ini**:
   - `story.ts`: `FPS`, `TOTAL` (= `length.json.frames`), `SHOTS` (frame a/b tiap shot dari `shots.md`), `XFADE`, `FLASH_AT`, kamera `CAMS`, `KICKS`, `DOF`/`dofAt`, `FOREGROUND`, dan "fisika cerita" (posisi/gerak benda dari waktu).
   - `build.ts`: tata letak dunia (rumah `house()`, prop Kenney via `prop()`/`kitClone()`, jalan, sungai...). `buildTown` adalah contoh; buat fungsi build untuk tempat-tempat cerita ini. Pakai sight-line culling seperti contohnya.
   - `world.ts`: daftar `KENNEY` (model yang dipakai), `World.update()` (apa yang terlihat/bergerak per shot).
   - `cast.ts` + `toon.ts`: pemeran (Outfit baru, ekspresi `Expr`, pose/mode, kerumunan), efek 2D per shot.
   - Ganti nama export `BridgeShort`/`BRIDGE_FRAMES` dan string `"bridge kit"` agar unik untuk slug ini.
4. Model 3D: model Kenney yang sudah ada di `public/bridge/kenney/` (lihat juga `assets_src/` untuk ratusan model Nature Kit + Fantasy Town Kit; salin `.glb` yang dibutuhkan ke `public/bridge/kenney/`). Butuh kit lain (kota modern, interior, kendaraan, bajak laut...)? Kenney.nl (CC0): buka halaman kit di browser bawaan, ambil URL unduhan bertanda tangan via `fetch('https://kenney.nl/download-link/' + hex('assets/<nama-kit>'))` di halaman itu, unduh dengan curl ke folder baru `assets_src/<kit>/`, ekstrak, salin `.glb` yang dipakai. Tulis kit tambahan di `CLAUDE.md`.
5. Daftarkan di `src/Root.tsx` dengan caption:
   ```tsx
   import { <Name>Short, <NAME>_FRAMES } from "./videos/<slug>/Bridge";
   import <slug>Words from "../projects/<slug>/words.json";
   <Composition id="<CompId>" component={withCaptions(<Name>Short, <slug>Words as Word[])} durationInFrames={<NAME>_FRAMES} {...V} />
   ```
   `CompId` = slug dalam CamelCase tanpa underscore (mis. `JembatanBerbaris`). Pastikan `<NAME>_FRAMES` = `length.json.frames`.

## 5b. Look alternatif "dunia hidup" (hanya kalau user memintanya)
Tokoh tetap kartun 2D yang sama, tapi dunianya PBR realistis: langit foto HDRI, tekstur foto, bayangan lembut, AO, kabut jarak, padi/rumput bergoyang angin. Tidak ada garis tinta di dunia. Contoh lengkap: `src/videos/looktest/LookTest.tsx` (komposisi `LookTest`), stills pembanding di `out/looktest/`.
- Kit bersama di `src/common/hidup/` (jangan disalin per video, impor saja):
  - `Stage.tsx`: `<HidupScene make={build} />`. `build(H)` mengembalikan `{ root, update(f, cam) => Shot, look? }`. Stage mengatur langit, matahari + bayangan (kotak 90 m yang ikut kamera), kabut, dan post (N8AO, bloom, AgX, saturasi, vignette). Preset `DAY`; ubah lewat `look` (arah `sun`, `fogDensity`, `sat`...).
  - `kit.ts`: `pbr(H, tekstur, { size })` + `worldUV(geo)` (tekstur ukuran asli dalam meter), `M()`, `scatter()` (pohon utuh), `scatterPick()` (rumput/pakis/semak per rumpun), `instanced()`, `addSway()`, `rng()`.
  - `plants.ts`: `paddy()` (sawah + pematang + padi bergoyang), `verge()` (rumput liar pinggir jalan), `coconutPalm()`/`palmRow()` (kelapa prosedural), `bananaPlant()`.
  - `house.ts`: `kampungHouse()` (tembok plester, genteng tanah liat, teras bertiang, pintu/jendela kayu).
  - `card.ts`: `Card` = tokoh dari `toon.ts` (`bodyFront`/`bodySide`) sebagai kartu yang menghadap kamera, dengan bayangan matahari asli + bayangan kontak.
- Aset di `public/hidup/` (Poly Haven, CC0): `sky_4k.hdr`, `tex/<id>_diff|nor|rough.jpg` (2k), `models/<id>/<id>.glb` + `textures/<id>_alpha_1k.jpg`. Daftarnya di `TEX` dan `MODELS` (kit.ts). Aset baru: API `https://api.polyhaven.com/files/<id>`. Model harus dikemas jadi **.glb** (gltf + .bin terpisah gagal dimuat di browser render), dan alpha daun dipasang dari file alpha terpisah.
- Poly Haven tidak punya kelapa, pisang, bambu, rumah Indonesia, atau kendaraan: buat secara prosedural seperti `plants.ts`/`house.ts`.
- Ukuran: dunia sejauh mata memandang perlu ribuan instance. Pohon Poly Haven berat (island_tree ≈ 1,3 juta verteks), jadi pakai beberapa saja di dekat kamera dan kelapa prosedural untuk barisan jauh. Still ≈ 20 dtk (skala 0.5), render ≈ 0,8 dtk/frame.
- Hindari: batang pohon tepat di depan lensa (cek garis pandang shot), gunung tanpa kabut (pakai warna kabut, `fog: false`), dan `Object.assign` ke `position` mesh (read-only).

## 6. Cek tampilan (ulang sampai bersih, biasanya 3–5 putaran)
```
node scripts/stills.mjs <CompId> out/<slug>/s_ <frame tengah tiap shot, dipisah koma> 0.5
```
(≈8 dtk per still.) Buka **setiap** still dengan Read dan periksa:
- kalimat di shot itu benar-benar terlihat (benda kunci ada di layar, tidak terpotong);
- tokoh tidak terpotong tepi, tidak saling menutupi, wajah tidak tertutup caption (caption di y≈1330 dari 1920);
- tidak ada objek yang menghalangi kamera, tidak ada lubang/langit hitam/benda melayang;
- warna dan cahaya sesuai nilai look (bandingkan dengan `references/frames/` bila ragu);
- shot berurutan terlihat berbeda (framing/tempat/ukuran);
- caption terbaca dan teksnya sesuai kata yang diucapkan.
Perbaiki kode, ulangi. Untuk gerakan, render klip pendek bagian yang meragukan:
`.venv/Scripts/python.exe tools/finish.py <slug> <CompId> --frames=<a>-<b>` lalu ambil 2–3 frame dengan `tools/ffmpeg/bin/ffmpeg.exe -ss <detik> -i out/<slug>/<slug>.mp4 -frames:v 1 x.jpg`.

## 7. Render final
Jalankan di background (≈0,6 dtk/frame; video 60 dtk ±20 menit):
```
.venv/Scripts/python.exe tools/finish.py <slug> <CompId>
```
(tambah `--scale=1.3333` untuk 1440x2560 / 2K; ±1,8x lebih lama). Hasil: `out/<slug>/<slug>.mp4`.
QA setelah selesai: durasi = `length.json.duration` (±0,1 dtk); ambil frame di awal, tengah, akhir dan cek; cek tidak ada frame hitam/putih di luar flash.

## 8. Serahkan
- Kirim videonya ke user dengan SendUserFile.
- Tulis `out/<slug>/upload.txt` (bahasa Indonesia): 3 ide judul (≤45 karakter, idealnya 4–7 kata, gaya "Kenapa…", "…yang…", "Eksperimen…"; jangan bocorkan jawaban/kata kunci twist, tanpa tahun dan nama asing; lihat aturan judul di `generate-naskah/SKILL.md`), deskripsi 2–3 kalimat yang tidak membocorkan twist, sumber, 5 hashtag (#shorts #faktaunik #sains + 2 sesuai topik).
- Tambahkan slug + judul ke `topics/used.txt`.
- Laporkan singkat: lokasi file, durasi, jumlah shot, 3 judul, dan bahwa user bisa minta perubahan ("tokoh utamanya pakai topi merah", "musiknya lebih misterius", "hook-nya diganti"). Setelah perubahan: ulangi dari langkah yang terdampak (naskah → suara → sound → stills → render).

## Kalau macet
| Masalah | Solusi |
|---|---|
| `ERROR: ElevenLabs error 401/403` | API key salah/kedaluwarsa, atau fitur tidak ada di paket (`output_format` harus `mp3_44100_128`). |
| Kredit ElevenLabs habis | Suara: `tools/voice.py ... --kokoro am_michael` (gratis, bahasa Inggris saja; untuk Indonesia tunggu kredit). Musik: `{"local": "playful"}`. SFX: `{"local": ...}`. |
| Render berhenti diam-diam di tengah (exit 1 tanpa pesan) | Baca dulu log Remotion untuk error di frame itu (mis. `fx.ink.dispose is not a function`, sudah diperbaiki di template sejak 2026-11-14). Kalau memang GPU kehabisan memori: `tools/finish.py <slug> <CompId> --concurrency=2`, atau render per 400 frame lalu gabung dengan ffmpeg concat. |
| Video final buram di beberapa shot, padahal still tajam | `cam.near` di `world.ts` berubah antar shot. Kanvas yang dipakai ulang setelah crossfade menghitung kedalaman blur dengan nilai lama. Biarkan `cam.near` tetap (mis. 0.1) di semua shot. |
| Still hitam / WebGL error | Chrome terpasang di `C:/Program Files/Google/Chrome/...`, `--gl angle`. Tutup render lain yang jalan bersamaan. |
| Disk penuh | Hapus `D:/remotion_tmp/*` (bundle sementara Remotion, besar). |
| `at_word '...' is not in words.json` | Kata itu dieja lain di `words.json` (cek tanda hubung/huruf besar), atau pakai `"at": detik`. |
