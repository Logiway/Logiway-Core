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

| Ikon              | Informasi                                |
| ----------------- | ---------------------------------------- |
| Truk              | Lokasi awal perjalanan                   |
| Pin tujuan        | Lokasi tujuan                            |
| Kapal             | Segmen perjalanan menggunakan kapal feri |
| Pompa bahan bakar | SPBU di sekitar rute                     |
| Tempat tidur      | Tempat istirahat                         |
| Area layanan      | Fasilitas layanan perjalanan             |
| Peringatan        | Area dengan risiko pungli                |

## Teknologi

| Bagian      | Teknologi                                              |
| ----------- | ------------------------------------------------------ |
| Frontend    | React, TypeScript, Vite, Tailwind CSS, Mapcn, MapLibre |
| Backend     | Node.js, TypeScript, Express                           |
| Routing     | GraphHopper dan OpenStreetMap                          |
| Data lokasi | Nominatim dan Overpass                                 |
| Analisis AI | IndoBERT                                               |
| Deployment  | Docker Compose dan Nginx                               |

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
graphhopper-web-latest.jar
indonesia-latest.osm.pbf
```

### Penamaan artefak GraphHopper

Jika file yang diunduh memiliki nama bertanggal atau nama versi, ubah namanya terlebih dahulu ke nama tetap yang digunakan oleh Dockerfile dan konfigurasi GraphHopper. Contoh pembaruan dataset peta:

```powershell
Move-Item ".\Logiway-BE\graphhopper\indonesia-260823.osm.pbf" ".\Logiway-BE\graphhopper\indonesia-latest.osm.pbf" -Force
```

Jika nama file JAR juga memiliki versi, ubah namanya dengan cara yang sama:

```powershell
Move-Item ".\Logiway-BE\graphhopper\graphhopper-web-11.0.jar" ".\Logiway-BE\graphhopper\graphhopper-web-latest.jar" -Force
```

Pada Linux atau macOS, gunakan `mv -f` dengan pasangan nama sumber dan tujuan yang sama. Lakukan rename ulang setiap kali menerima file pembaruan. Nama `latest` diperlukan karena instruksi Docker `COPY`, `ENTRYPOINT`, dan konfigurasi GraphHopper menggunakan path statis; Docker tidak memilih file berdasarkan tanggal secara otomatis. Setelah file diganti, jalankan ulang proses build agar artefak baru masuk ke image.

### Model finetuning

Setelah menjalankan script python untuk menjalankan fine tuning. extract indobert-pungli-classifier.zip, lalu pindah kan folder ```./Logiway-Core/Logiway-BE/src\modules/smart-route/ml```


Salin konfigurasi environment:

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
