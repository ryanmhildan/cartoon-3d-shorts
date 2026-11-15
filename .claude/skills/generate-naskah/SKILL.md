---
name: generate-naskah
description: Cari ide cerita dan tulis naskah lengkap (bahasa Indonesia) untuk Shorts animasi bergaya "cerita dengan twist sains tersembunyi" (tokoh 2D di dunia 3D). Membuat N opsi (default 5), masing-masing dengan judul, hook, naskah penuh dan sumber. Pakai saat user mengetik /generate-naskah, misalnya "/generate-naskah 5" atau "/generate-naskah 3 sejarah Nusantara".
argument-hint: "<jumlah opsi, default 5> [tema opsional, mis. kedokteran, laut, sejarah Nusantara, psikologi]"
---

# Generate naskah

Argumen: $ARGUMENTS
- Angka pertama = jumlah opsi (default **5**, maksimal 8). Sisa teks = tema (opsional). Tanpa tema: sebar ke banyak bidang.

Kamu menulis naskah untuk channel YouTube Shorts **berbahasa Indonesia**. Kamu TIDAK membuat video di sini; user memilih satu, lalu menjalankan `/generate-vidio <judul atau nomor>`.

Baca dulu `CLAUDE.md` di folder ini (aturan channel, bahasa, tempo suara).

## Prinsip utama: cerita dulu, sains belakangan
Jangan menceramahi fakta. **Bangun cerita** yang membuat penonton penasaran: ada tokoh, ada situasi aneh, ada orang yang menertawakan atau meragukan, taruhannya naik, lalu di akhir terungkap **mekanisme sains nyata** di baliknya sebagai twist. Penonton harus merasa "ohhh, ternyata itu sebabnya!" dan ingin komentar.

## Rumus naskah (diukur dari 20 short channel referensi, 20/20 mengikutinya)
1. **Hook = paradoks yang dinyatakan sebagai fakta, kalimat pertama, tanpa pembukaan.** 10–16 kata. Seseorang melakukan hal yang terdengar bodoh/mustahil dengan taruhan besar, atau "Kalau kamu X, kamu bakal Y", atau "X itu dilarang, tapi...".
   - Contoh gaya: "Tujuh puluh empat tentara merobohkan jembatan besi, cuma dengan berjalan di atasnya."
2. **Setting 1–2 kalimat**, kalimat masa kini ("Tahun 1831. Jembatan baru itu kebanggaan seluruh kota."), detail konkret: waktu, tokoh biasa yang diberi nama, satu angka.
3. **Eskalasi 3–6 beat.** Orang lain tertawa/ragu/mengejek (boleh dialog pendek di dalam karakter, dikutip), taruhan naik terus. 1–2 lelucon hiperbola per video ("klaim vs kenyataan").
4. **Beat misteri**: satu pertanyaan atau "Tunggu... kok bisa?".
5. **Kata pivot "Ternyata,"** (padanan "You see," di referensi; boleh juga "Masalahnya," / "Rahasianya:") lalu **mekanisme sebenarnya**, sering lewat **analogi sehari-hari** ("Pernah dorong anak main ayunan?", "Bayangkan tubuhmu itu...").
6. **Payoff ironis** di 1–2 kalimat terakhir: pendek, mendaratkan twist, bikin orang ingin komentar. Video berakhir di kata terakhir (tanpa "like dan subscribe").

Dua mode cerita (campur di antara opsi):
- **Mode cerita**: orang ketiga, kalimat masa kini, tokoh biasa yang diberi nama ("Pak Darto", "seorang tukang roti bernama Hans").
- **Mode "Bayangkan kamu..."**: orang kedua, penonton jadi tokohnya.

Jenis cerita yang bagus (variasikan):
- A. **Orang yang ditertawakan, lalu terbukti benar.**
- B. **Kebiasaan lama yang aneh, ternyata ada alasannya.** (kenapa X dulu melakukan Y)
- C. **"Bayangkan kamu..."**: situasi nyata yang aneh dengan penonton sebagai tokohnya.
- D. **Trik/tipu daya/akal licik** yang memanfaatkan sains atau psikologi (perampok, penjudi, pedagang, tentara).
- E. **"Bagaimana kalau..."** eksperimen pikiran yang dijawab dengan sains nyata.
- Cerita lokal Indonesia/Nusantara = nilai plus (tradisi, sejarah, kehidupan sehari-hari).

## Gaya bahasa
- **Bahasa Indonesia lisan yang santai**, seperti orang bercerita ke teman: "cuma", "nggak", "bayangin", "kok", "eh". Hindari bahasa buku pelajaran dan istilah teknis (kalau terpaksa, jelaskan di anak kalimat berikutnya).
- Kalimat pendek-sedang (rata-rata ~10–14 kata). Satu ide per kalimat. **Satu kalimat per baris.**
- **Angka dan tahun ditulis dengan huruf** ("tujuh puluh empat", "tahun seribu delapan ratus tiga puluh satu") supaya narator membacanya benar.
- Panjang: **120–150 kata** (≈ 55–65 detik dengan suara ini, ~2,2 kata/detik). Hitung katanya.
- Setiap kalimat harus bisa **digambar secara harfiah** (tiap kalimat = satu shot). Hindari kalimat abstrak yang tidak bisa diperlihatkan.
- Jangan pernah menyebut nama channel referensi.

## Kejujuran (wajib)
- **Sains/mekanismenya harus nyata**, dicek dengan **minimal 2 sumber terpercaya** lewat web search (ensiklopedia, universitas, museum, jurnal, situs sains/sejarah yang dikenal).
- Kalau cerita berdasarkan **kejadian nyata**: cek siapa, kapan, di mana, angka, dan apakah "orang-orang menertawakan" benar terjadi (banyak yang mitos; kalau cuma "diragukan", tulis "diragukan").
- Kalau ceritanya **fiksi** (tokoh rekaan yang membungkus mekanisme nyata): pakai tokoh biasa tanpa klaim sejarah palsu (jangan karang tanggal, koran, kutipan tokoh nyata). Tandai opsi itu "fiksi, sains nyata".
- Jangan pernah mengarang kutipan tokoh nyata, koran, atau kejadian lalu menyajikannya sebagai fakta.

## Bisa digambar?
Video dibuat dengan dunia 3D (three.js) + tokoh kartun 2D (kepala bulat). Yang paling mudah:
- **Luar ruangan**: kota/desa Eropa lama, pasar, jalan, sungai, jembatan, taman, ladang, hutan, tebing, gua, perkemahan, kapal kecil/kano, kastil/tembok batu (Kenney Nature Kit + Fantasy Town Kit sudah ada: rumah, atap, tembok, menara, air mancur, kios pasar, gerobak, pohon, tanaman pangan, batu, jembatan, pagar, api unggun).
- **Dalam ruangan** dan benda modern (mobil, kantor, rumah sakit, kasino, penjara) bisa, tapi butuh kit Kenney tambahan atau dibangun dari bentuk sederhana; beri skor "bisa digambar" lebih rendah.
- Hal mikroskopis/abstrak: tunjukkan lewat analogi visual (ayunan, bola, air) atau kartu efek, bukan diagram.

## Langkah
1. **Brainstorm 12–15 kandidat** sesuai tema. Lewati:
   - topik di `topics/used.txt`;
   - topik yang sudah dibuat channel referensi (jangan meniru): rel kereta bercelah, minyak badai pelaut, lonceng kuburan, guci gempa kuno, pekerjaan "tidak melakukan apa-apa" di Jepang, jendela judi Jepang, kasir menang lotre, tombak vs perisai, tidur Edison dengan bola baja, sel penjara pink, gerobak yang menghentikan tentara, sopir yang merekam jalan, bentuk loop roller coaster, cermin yang mencurangi pacuan kuda, kota yang dibangun di sekitar tombol, undian kedua selalu menang, pencuri yang cuma memindah perabot, peluru meriam bajak laut, celah ksatria, cara kerja obat pereda nyeri, mesin slot, manusia tak bisa memilih angka acak, zona ide di otak, pohon yang membencimu, upload otak, teleportasi, jembatan yang runtuh karena tentara berbaris;
   - apa pun yang butuh kekerasan grafis atau darah.
2. **Verifikasi** tiap kandidat dengan web search (≥2 sumber). Buang yang tidak bisa diverifikasi.
3. **Skor 1–5** untuk: hook paradoks, ketegangan/ejekan, twist sains yang "ohhh", sains sederhana (bisa dijelaskan 1–2 kalimat), ending yang memancing komentar, bisa digambar. Ambil N terbaik (total /30).
4. **Tulis naskah lengkap** untuk tiap opsi mengikuti rumus. Baca ulang tiap naskah dan perbaiki: hook cukup aneh? Ada ejekan/keraguan? Ada pivot "Ternyata,"? Analoginya sehari-hari? Kalimat terakhir pendek dan ironis? 120–150 kata? Angka ditulis huruf?
5. **Tampilkan** ke user dengan format ini (ringkas):

```
## Opsi N: <Judul YouTube>  (tipe A–E · skor x/30 · nyata | fiksi, sains nyata)
Hook: "<kalimat pertama>"
Naskah (<jumlah> kata, ±<detik> dtk):
<satu kalimat per baris>
Twist sains: <1 kalimat>
Visual: <tempat, tokoh, 3–4 shot kunci>
Fakta & sumber: <2–3 fakta kunci> · <2+ link>
Catatan kejujuran: <yang disederhanakan/didramatisasi>
```

Judul bergaya: "Kenapa [Kelompok] [Melakukan Hal Aneh]", "[Benda] yang [Melakukan Hal Mustahil]", "Eksperimen [X] yang [Hasil Aneh]", "Bagaimana [Hal Kecil] [Mengalahkan Hal Besar]", "Arti Sebenarnya dari [Benda]". Maks ~45 karakter.

6. **Simpan**:
   - semua opsi (lengkap dengan fakta dan sumber) ke `topics/naskah_latest.md` (timpa), dan salinan ke `topics/naskah_<YYYY-MM-DD>.md`;
   - beri tiap opsi slug pendek (huruf kecil, underscore), tulis di judul opsi: `## Opsi 2: Judul ... [slug: jembatan_berbaris]`.
7. Tutup dengan: **"Pilih satu: ketik `/generate-vidio 2` atau `/generate-vidio <judul>`. Mau diubah dulu? Bilang saja (mis. 'opsi 3 hook-nya lebih lucu')."**

Pesan ke user: singkat, bahasa Indonesia sederhana.
