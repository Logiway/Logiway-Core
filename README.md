<p align="center">
  <img src="Logiway-FE/public/logiway-logo.png" alt="Logiway" width="160" />
</p>

# Logiway

Logiway adalah platform perencanaan rute logistik untuk kendaraan niaga di Indonesia. Logiway membantu operator menemukan rute yang sesuai dengan profil kendaraan, melihat informasi perjalanan, dan mengenali fasilitas serta kondisi penting di sepanjang rute.

## Fitur Utama

- Pencarian lokasi awal dan tujuan di Indonesia.
- Pilihan profil truk kecil, sedang, dan besar.
- Pengaturan kapasitas, tinggi, lebar, panjang, dan volume kendaraan.
- Perhitungan rute berdasarkan batas dimensi kendaraan.
- Visualisasi rute interaktif dengan animasi dari titik awal ke tujuan.
- Informasi jarak, estimasi durasi, tol, dan perjalanan kapal feri.
- Penanda SPBU, tempat istirahat, dan area layanan di sekitar rute.
- Penanda area risiko pungli berdasarkan hasil analisis yang tersedia.
- Fallback geocoding agar pencarian rute tetap berjalan ketika layanan AI tidak tersedia.

## Cara Kerja

1. Masukkan lokasi awal dan lokasi tujuan.
2. Pilih jenis truk yang digunakan.
3. Sesuaikan dimensi dan kapasitas kendaraan bila diperlukan.
4. Tekan **Hitung Rute Otomatis**.
5. Logiway menampilkan jalur perjalanan, jarak, durasi, dan informasi pendukung langsung pada peta.

## Informasi Peta

| Ikon | Informasi |
| --- | --- |
| Truk | Lokasi awal perjalanan |
| Pin tujuan | Lokasi tujuan |
| Kapal | Segmen perjalanan menggunakan kapal feri |
| Pompa bahan bakar | SPBU di sekitar rute |
| Tempat tidur | Tempat istirahat |
| Area layanan | Fasilitas layanan perjalanan |
| Peringatan | Area dengan risiko pungli |

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Mapcn, MapLibre |
| Backend | Node.js, Express |
| Routing | GraphHopper dan OpenStreetMap |
| Data lokasi | Nominatim dan Overpass |
| Analisis AI | IndoBERT |
| Deployment | Docker Compose dan Nginx |

## Struktur Aplikasi

```text
Logiway-Core/
├── Logiway-FE/   Web app dan peta interaktif
├── Logiway-BE/   API, routing, geocoding, dan integrasi data
├── Logiway-AI/   Pengelolaan dataset AI
└── contracts/    Kontrak API
```

## Menjalankan Logiway

Pastikan file berikut tersedia di `Logiway-BE/graphhopper`:

```text
graphhopper-web-11.0.jar
indonesia-260821.osm.pbf
```

Salin konfigurasi environment dan isi Gemini API key:

```powershell
Copy-Item ".env.example" ".env"
```

Jalankan seluruh aplikasi:

```powershell
docker compose up --build
```

Buka Logiway melalui:

```text
http://localhost:8001
```

Untuk menghentikan aplikasi:

```powershell
docker compose down
```
