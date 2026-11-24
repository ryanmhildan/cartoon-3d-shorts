---
name: generate-naskah-panjang
description: Cari ide dan tulis naskah lengkap (bahasa Indonesia) untuk video YouTube HORIZONTAL panjang (6–9 menit, di bawah 10 menit) bergaya "cerita dengan twist sains tersembunyi" (tokoh kartun 2D di dunia 3D), dibagi per bab. Membuat N opsi (default 3). Pakai saat user mengetik /generate-naskah-panjang, misalnya "/generate-naskah-panjang 3" atau "/generate-naskah-panjang 2 gunung api Nusantara".
argument-hint: "<jumlah opsi, default 3> [tema opsional]"
---

# Generate naskah panjang

Argumen: $ARGUMENTS
- Angka pertama = jumlah opsi (default **3**, maksimal 5). Sisa teks = tema (opsional).

Kamu menulis naskah untuk video **horizontal 16:9, 6–9 menit** (selalu di bawah 10 menit), bahasa Indonesia. Video dibuat nanti dengan `/generate-vidio-panjang <nomor atau judul>`.

Baca dulu:
1. `CLAUDE.md` (aturan channel, bahasa, tempo suara).
2. `.claude/skills/generate-naskah/SKILL.md`. **Semua aturannya tetap berlaku** (data channel: cerita lokal menang, gaya bahasa, angka ditulis huruf, kejujuran dan 2+ sumber, bisa digambar, aturan judul, daftar topik terlarang). Di bawah ini hanya yang berbeda untuk video panjang.

## Bedanya dengan Shorts
Di Shorts, penonton memutuskan dalam 2 detik. Di video panjang, penonton memutuskan di **30 detik pertama**, lalu pergi kalau tidak ada alasan untuk bertahan. Jadi:
- **Satu pertanyaan besar** yang baru terjawab penuh di bab terakhir ("Kenapa satu pulau selamat dari tsunami, padahal pulau tetangganya hancur?").
- **Tiap bab = satu Short kecil**: punya hook, ketegangan dan twist kecilnya sendiri, lalu **diakhiri pancingan** ke bab berikutnya ("Tapi itu belum menjelaskan kenapa...").
- Penjelasan sains boleh lebih dalam (2–3 langkah, dengan analogi sehari-hari), tapi tetap tanpa ceramah: selalu lewat tokoh dan kejadian.

## Struktur (6–9 menit ≈ 800–1.200 kata, ~2,2 kata/detik)
| Bagian | Isi | Panjang |
|---|---|---|
| **Pembuka** (0–30 dtk) | Hook paradoks di kalimat pertama, lalu janji: pertanyaan besar yang akan dijawab. Tanpa salam, tanpa "di video ini kita akan...". | 50–70 kata |
| **Bab 1–5** (4–6 bab) | Tiap bab: situasi → ejekan/keraguan → taruhan naik → twist kecil → pancingan ke bab berikut. Bab tengah boleh berisi tokoh/sudut pandang berbeda dari cerita yang sama. | 130–220 kata per bab |
| **Bab terakhir** | Pivot "Ternyata," → mekanisme utama (analogi sehari-hari) → payoff ironis. | 150–220 kata |
| **Penutup** | 1–2 kalimat: pertanyaan ke penonton untuk dijawab di komentar. Boleh satu ajakan halus ("cerita Nusantara lain ada di channel ini"), tanpa "like dan subscribe". | 15–30 kata |

Jangan isi dengan pengulangan atau rangkuman. Kalau ceritanya habis di 6 menit, berhenti di 6 menit.

## Jenis cerita yang cocok untuk durasi panjang
- **Satu kisah besar yang diceritakan dalam**: bencana, penemuan, tradisi, atau tokoh Nusantara dengan banyak babak (sebelum, saat, sesudah, kenapa).
- **Satu misteri, beberapa tersangka**: tiap bab mencoba satu penjelasan yang salah, bab terakhir membuka yang benar.
- **Kumpulan bertema** ("Lima Rahasia Dapur Nenek yang Ternyata Sains"): tiap bab satu cerita pendek, diikat satu benang merah dan diurutkan dari yang paling ringan ke yang paling mengejutkan. **Paling hemat biaya**: bab bisa berasal dari Short yang sudah dibuat (`topics/used.txt`), diperluas, dan dunianya dipakai ulang (lihat "Hemat biaya").

## Hemat biaya sejak naskah
Biaya terbesar video panjang adalah membangun banyak tempat 3D dan kredit ElevenLabs. Naskah menentukan keduanya:
- **Maksimal 4–6 tempat** untuk satu video. Tempat yang sama dipakai di banyak bab dengan cahaya/sudut berbeda (pagi, senja, malam, hujan).
- **Pemeran tetap**: 2–4 tokoh utama + kerumunan. Hindari tokoh baru di tiap bab.
- **Pakai ulang Short lama** bila cocok: tulis di opsi "dunia dari: `src/videos/<slug>`" (pasar, sawah, dapur, laut, desa yang sudah ada).
- Tulis naskah sampai final **sebelum** suara dibuat. Setiap perubahan sesudahnya membayar ulang bab itu.
- Hindari hal yang butuh model baru (kendaraan modern, interior rumit) kecuali benar-benar inti cerita.

## Langkah
1. Brainstorm 8–10 kandidat sesuai tema (lewati `topics/used_panjang.txt` dan topik terlarang di skill Shorts; topik di `topics/used.txt` boleh, asal diperdalam).
2. Verifikasi tiap kandidat (≥2 sumber; untuk video panjang biasanya perlu 3–5 sumber karena faktanya lebih banyak). Buang yang tidak bisa diverifikasi.
3. Skor 1–5: kedekatan lokal, pertanyaan besar yang kuat, cukup bahan untuk 4–6 bab tanpa mengisi-isi, twist sains, bisa digambar, **hemat dibuat** (sedikit tempat, bisa pakai ulang dunia lama). Ambil N terbaik (/30).
4. Tulis naskah lengkap. Format `script.txt`-siap: **baris `## <judul bab>` di awal tiap bab** (tidak dibacakan), lalu satu kalimat per baris. Baca ulang: pembuka ≤30 dtk dan bebas tahun/nama asing di 2 kalimat pertama? Tiap bab punya twist kecil dan pancingan? Bab terakhir menjawab pertanyaan besar? 800–1.200 kata? Tidak ada bab yang cuma mengulang?
5. Tampilkan ke user (ringkas):

```
## Opsi N: <Judul YouTube>  [slug: pj_<slug>]  (skor x/30 · lokal | non-lokal · nyata | fiksi, sains nyata)
Pertanyaan besar: <1 kalimat>
Bab: <judul bab 1> · <judul bab 2> · ... (<jumlah kata total>, ±<menit> mnt)
Tempat (maks 6): <daftar> · dunia dipakai ulang dari: <slug lama | ->
Pemeran: <tokoh utama + ciri khas>
Naskah:
## Pembuka
<satu kalimat per baris>
## <Bab 1>
...
Twist utama: <1 kalimat>
Fakta & sumber: <fakta kunci> · <3+ link>
Catatan kejujuran: <yang disederhanakan/didramatisasi>
```

Judul video panjang: maks ~60 karakter, boleh sedikit lebih jelas daripada judul Shorts tapi **tetap tidak membocorkan twist**. Contoh gaya: "Pulau yang Selamat dari Tsunami karena Sebuah Lagu", "Lima Kebiasaan Nenek yang Dulu Kita Tertawakan".

6. Simpan semua opsi ke `topics/naskah_panjang_latest.md` (timpa) dan salinan ke `topics/naskah_panjang_<YYYY-MM-DD>.md`.
7. Tutup dengan: **"Pilih satu: ketik `/generate-vidio-panjang 2` atau `/generate-vidio-panjang <judul>`. Mau diubah dulu? Bilang saja."**

Pesan ke user: singkat, bahasa Indonesia sederhana.
