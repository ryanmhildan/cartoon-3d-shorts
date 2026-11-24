---
name: generate-vidio-panjang
description: Ubah satu naskah dari /generate-naskah-panjang menjadi video YouTube HORIZONTAL 1920x1080 berdurasi 6–9 menit (tokoh kartun 2D di dunia 3D, narator ElevenLabs per bab, caption per kata, musik per bab dan efek suara, thumbnail, timestamp bab). Pakai saat user mengetik /generate-vidio-panjang diikuti nomor opsi atau judul.
argument-hint: "<nomor opsi atau judul dari topics/naskah_panjang_latest.md>"
---

# Generate vidio panjang

Naskah yang dipilih: $ARGUMENTS

Hasil akhir: `out/<slug>/<slug>.mp4` (1920x1080, 30 fps, 6–9 menit), `out/<slug>/thumb.jpg` (1280x720) dan `out/<slug>/upload.txt`.

Alurnya sama dengan `/generate-vidio`. **Baca `.claude/skills/generate-vidio/SKILL.md` dulu**: semua aturannya berlaku (look yang tidak boleh diubah, aturan shot, cek stills, tabel "Kalau macet"). Di bawah ini hanya yang berbeda.

## 0. Baca dulu
Sama seperti skill Shorts (CLAUDE.md, `cartoon-3d-short/SKILL.md`, STYLE_BIBLE), plus:
- Template horizontal: `src/videos/wide/` (komposisi `WideTest`). Ini contoh jembatan yang sudah diubah ke 16:9: kanvas 1920x1080, ketebalan garis tinta, blur, grain dan bloom diukur dari **sisi panjang** (1920), dan sight-line culling memakai rasio 16:9. Jangan salin dari `bridge/` untuk video panjang.

## 1. Ambil naskah
- Dari `topics/naskah_panjang_latest.md` (nomor atau judul). Buat `projects/<slug>/script.txt` dengan baris `## <judul bab>` dan satu kalimat per baris, plus `facts.md`.
- Tunjukkan daftar bab + jumlah kata ke user, lalu **langsung lanjut**.

## 2. Suara per bab (hemat kredit)
```
.venv/Scripts/python.exe tools/voice_long.py projects/<slug>/script.txt projects/<slug>
```
→ `voice.wav`, `words.json`, `chapters.json` (mulai/selesai tiap bab). Satu panggilan ElevenLabs per bab, di-cache: kalau satu bab diubah, **hanya bab itu yang dibayar ulang**. Skrip mencetak berapa karakter baru yang dipakai.
- Target 6–9 menit. Terlalu panjang: potong kalimat di bab yang lambat, jangan ubah kecepatan untuk semua bab.
- Cek `words.json`: tidak ada jeda aneh > 1 dtk di dalam bab.

## 3. Musik dan SFX
`sound.json`, dengan **musik per bab** (format di docstring `tools/sound.py`):
```json
{"tail": 1.5,
 "music": [
   {"prompt": "curious plucky strings, light gamelan percussion, mysterious, 100 bpm", "len": 90, "gain_db": -12},
   {"file": "projects/<slug lain>/cache/music_....mp3", "from": "<kata pertama bab 3>"},
   {"prompt": "tense low drums, rising", "len": 60, "from": 312.5}
 ],
 "sfx": [...]}
```
- `from` = detik (ambil dari `chapters.json`) atau kata. Track pendek diulang otomatis dengan crossfade, jadi **`len` 60–90 dtk sudah cukup** per suasana; jangan minta musik 9 menit penuh.
- **2–4 suasana musik** per video, bukan satu per bab. Pakai ulang track dari folder `cache/` proyek lain dengan `"file"` (gratis).
- SFX: 20–40 untuk seluruh video, terutama di hook, twist kecil tiap bab, dan twist utama. Utamakan `{"local": ...}` dan `{"file": ...}` dari cache proyek lain; ElevenLabs hanya untuk suara yang benar-benar khusus.
```
.venv/Scripts/python.exe tools/sound.py projects/<slug>
```

## 4. Rencana shot (`shots.md`)
- **Bukan satu kalimat = satu shot.** Video 16:9 panjang lebih tenang: satu shot ≈ 1–3 kalimat (5–12 dtk), dengan glide atau push-in pelan. Target 40–80 shot untuk 6–9 menit.
- Kelompokkan per bab. Tulis di atas tiap bab: tempat, cahaya, pemeran. **Maks 4–6 tempat** per video; ganti cahaya/sudut untuk variasi, bukan tempat baru.
- Pembuka (30 dtk pertama) tetap bergaya Shorts: potongan cepat, satu kalimat per shot, hal aneh langsung terlihat.
- Pergantian bab: crossfade 10–15 frame, atau shot "judul bab" (wide establishing shot 2–3 dtk).

## 5. Kode
1. `cp -r src/videos/wide src/videos/<slug>`. Yang tetap: sama seperti skill Shorts, plus perubahan 16:9 di `Bridge.tsx`, `ink.ts`, `cast.ts`, `lensblur.ts`, `world.ts` (rasio sight-line) jangan dikembalikan.
2. **Kamera 16:9**: `fov` di `story.ts` adalah sudut **vertikal**. Di template jembatan (dibuat untuk 9:16) nilainya 34–44; untuk 16:9 pakai **≈ 22–30** untuk medium/close-up dan 30–40 untuk wide. Dengan fov yang sama, frame lebar menunjukkan jauh lebih banyak dunia di kiri-kanan: isi dengan prop dan tokoh latar, atau sisi frame akan kosong.
3. Komposisi horizontal: tokoh di sepertiga kiri/kanan, 2–3 tokoh dalam satu frame bisa berdampingan (bukan bertumpuk seperti di 9:16).
4. Shot banyak: pecah `story.ts` per bab (mis. `shots_bab1.ts`...) bila lebih dari ±40 shot, supaya mudah diubah.
5. Pakai ulang dunia lama: kalau naskah menyebut "dunia dari `src/videos/<slug lama>`", salin fungsi build-nya dari `build.ts`/`world.ts` lama ke proyek ini (fungsi build tidak tergantung ukuran frame; hanya kamera yang perlu diatur ulang).
6. Daftarkan di `src/Root.tsx` dengan ukuran horizontal dan caption horizontal:
   ```tsx
   <Composition id="<CompId>" component={withCaptions(<Name>Short, <slug>Words as Word[], HCAP)} durationInFrames={<NAME>_FRAMES} {...H} />
   ```
   (`H` = 1920x1080, `HCAP` = caption di y≈930 dari 1080, ukuran 76.)

## 6. Cek tampilan
- Still di tengah **setiap** shot, scale 0.5, per bab (batch 10–15 frame per perintah `scripts/stills.mjs`). Periksa seperti skill Shorts, plus: sisi kiri-kanan frame tidak kosong, tokoh tidak terpotong di atas (fov terlalu sempit), caption di bawah tidak menutup wajah/benda kunci.
- Perbaiki per bab. Jangan render final sebelum semua bab bersih.

## 7. Render final (di background)
Video panjang **wajib** dirender per potongan (render panjang bisa mati di tengah):
```
.venv/Scripts/python.exe tools/chunks.py <slug> <CompId> <frames dari length.json> 400 2
```
≈0,6 dtk/frame → 6 menit ≈ 1,8 jam, 9 menit ≈ 2,7 jam. Kalau berhenti, jalankan perintah yang sama lagi: potongan yang sudah jadi dilewati. Selesai → hapus `out/<slug>/part_*` setelah QA.
QA: durasi = `length.json.duration`; frame di awal, tiap pergantian bab, dan akhir; tidak ada frame hitam/putih.

## 8. Thumbnail
- Pilih frame paling aneh/menarik yang **tidak sedang ada caption** (di jeda antar kata), render: `node scripts/stills.mjs <CompId> out/<slug>/thumb_ <frame> 0.6667` → 1280x720. Ganti nama menjadi `thumb.jpg`.
- Tanpa teks bila gambarnya sudah bicara; kalau perlu teks, 2–4 kata besar di sisi yang kosong (Fredoka Bold, putih dengan garis hitam), tanpa membocorkan twist.

## 9. Serahkan
- Kirim video dan thumbnail dengan SendUserFile.
- `out/<slug>/upload.txt` (bahasa Indonesia): 3 ide judul (≤60 karakter, tanpa membocorkan twist), deskripsi 3–5 kalimat, **daftar bab dengan timestamp** dari `chapters.json` (baris pertama `0:00`, format `m:ss Judul bab`; YouTube butuh ≥3 bab dan tiap bab ≥10 dtk), sumber, 3–5 hashtag (tanpa #shorts).
- Tambahkan slug + judul ke `topics/used_panjang.txt`.
- Laporkan singkat: lokasi file, durasi, jumlah bab dan shot, karakter ElevenLabs yang dipakai.

## Hemat biaya (ringkas)
| Biaya | Cara menekan |
|---|---|
| Kredit suara ElevenLabs | Naskah final dulu; `voice_long.py` hanya membayar bab yang berubah. |
| Kredit musik | 2–4 track 60–90 dtk yang diulang; pakai ulang track dari proyek lain (`"file"`). |
| Kredit SFX | `local` dan `file` dari cache proyek lain dulu. |
| Waktu/sesi pembuatan dunia 3D | Maks 4–6 tempat, pemeran tetap, pakai ulang dunia dari Short lama, shot lebih panjang. |
| Render | 1080p saja (tanpa `--scale`), stills scale 0.5, render per potongan supaya tidak mengulang dari nol. |
