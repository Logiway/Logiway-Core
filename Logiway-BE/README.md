# Logiway Backend

Backend Logiway adalah API berbasis Node.js, TypeScript, dan Express untuk:

- mencari koordinat lokasi melalui OpenStreetMap Nominatim;
- menghitung rute kendaraan truk melalui GraphHopper;
- menganalisis risiko di sekitar rute menggunakan IndoBERT lokal melalui Python;
- mencari fasilitas pendukung rute melalui OpenStreetMap Overpass.

## Persyaratan

- Node.js 22 atau lebih baru;
- npm;
- Python 3;
- dependensi Python `torch` dan `transformers` untuk menjalankan IndoBERT;
- GraphHopper 11 untuk menghitung rute.

## Menyiapkan Backend

Jalankan perintah berikut dari folder `Logiway-BE`:

```sh
cp .env.example .env
npm ci
npm run build
npm start
```

Pada Windows PowerShell, perintah penyalinan environment dapat ditulis sebagai berikut:

```powershell
Copy-Item .env.example .env
```

File `.env` bersifat opsional karena backend memiliki nilai bawaan untuk sebagian besar pengaturan. Salin `.env.example` jika ingin mengubah pengaturan tersebut.

### Environment variable

| Variabel                 | Fungsi                                               | Nilai bawaan                                              |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------- |
| `PORT`                   | Port API backend                                     | `6767`                                                    |
| `CORS_ORIGIN`            | Origin frontend yang diizinkan                       | Tidak dibatasi jika kosong                                |
| `GRAPHHOPPER_URL`        | URL endpoint GraphHopper                             | `http://graphhopper:8989/route`                           |
| `GRAPHHOPPER_TIMEOUT_MS` | Batas waktu permintaan GraphHopper                   | `120000`                                                  |
| `NOMINATIM_URL`          | URL pencarian lokasi Nominatim                       | URL Nominatim OpenStreetMap                               |
| `OVERPASS_URLS`          | Maksimal tiga URL provider Overpass, dipisahkan koma | Dua provider Overpass publik                              |
| `OVERPASS_TIMEOUT_MS`    | Batas waktu permintaan Overpass                      | `12000`                                                   |
| `REQUEST_TIMEOUT_MS`     | Batas waktu provider umum                            | `15000`                                                   |
| `PYTHON_EXEC`            | Perintah executable Python                           | `python3` atau `py` di Windows                            |
| `MODEL_PATH`             | Lokasi folder model IndoBERT                         | `./src/modules/smart-route/ml/indobert-pungli-classifier` |

`OVERPASS_URL` tunggal masih dapat digunakan sebagai alternatif lama untuk `OVERPASS_URLS`. Semua URL Overpass harus menggunakan HTTPS.

## Perintah npm

```sh
npm run dev       # Menjalankan backend dalam mode pengembangan
npm run lint      # Memeriksa aturan lint
npm run typecheck # Memeriksa tipe TypeScript
npm run build     # Membuat hasil kompilasi di dist/
npm run check     # Menjalankan lint, typecheck, dan build
npm start         # Menjalankan hasil build
```

## API

### `GET /health`

Memeriksa apakah backend sedang berjalan.

```json
{"status": "ok"}
```

### `GET /api/locations?q=Jakarta`

Mencari lokasi melalui Nominatim. Parameter `q` dipangkas spasinya dan harus memiliki panjang 3 sampai 200 karakter. Respons berhasil berisi maksimal lima hasil:

```json
{
  "success": true,
  "locations": [
    {
      "displayName": "Jakarta, Indonesia",
      "coordinates": [106.8456, -6.2088]
    }
  ]
}
```

Urutan koordinat selalu `[longitude, latitude]`. Kegagalan provider dikembalikan sebagai error HTTP `502`.

### `POST /api/calculate-smart-route`

Menghitung rute berdasarkan lokasi awal, tujuan, dan profil truk.

Contoh request:

```json
{
  "origin": "Jakarta",
  "dest": "Bandung",
  "originCoordinates": [106.8456, -6.2088],
  "destinationCoordinates": [107.6191, -6.9175],
  "truckProfile": "truck_medium",
  "truckSpecifications": {
    "maxHeightM": 3,
    "maxWidthM": 2.1,
    "maxLengthM": 6,
    "grossWeightTon": 8,
    "maxAxleLoadTon": 4
  }
}
```

Ketentuan request:

- `origin` dan `dest` wajib memiliki panjang 2 sampai 200 karakter setelah spasi dipangkas;
- `truckProfile` harus berupa `truck_small`, `truck_medium`, atau `truck_large`;
- `originCoordinates` dan `destinationCoordinates` bersifat opsional, tetapi harus dikirim berpasangan;
- jika koordinat tidak dikirim, backend menggunakan Nominatim untuk mencari koordinat lokasi;
- `truckSpecifications` bersifat opsional. Jika tidak dikirim, spesifikasi bawaan profil truk digunakan;
- tinggi, lebar, panjang, berat total, dan beban gandar memengaruhi jalan yang dapat dipilih GraphHopper;
- kapasitas muatan dan volume tidak digunakan sebagai batasan jalan.

Respons berhasil memiliki bentuk berikut:

```json
{
  "success": true,
  "distance_km": 123.4,
  "duration_minutes": 180,
  "route_mode": "standard",
  "is_navigable": true,
  "warning": null,
  "coordinates": [
    [106.8456, -6.2088],
    [107.6191, -6.9175]
  ],
  "geocoding": {
    "origin": {"name": "Jakarta", "coordinates": [106.8456, -6.2088]},
    "destination": {"name": "Bandung", "coordinates": [107.6191, -6.9175]}
  },
  "pungli_points": [],
  "used_pungli_avoidance": false,
  "route_color": "#2563eb",
  "route_details": {
    "road_environment": [],
    "road_class": [],
    "toll": [],
    "uses_ferry": false,
    "uses_toll": false
  },
  "route_facilities_status": "available",
  "route_facilities": []
}
```

Mode rute yang tersedia:

1. `risk_aware`: GraphHopper menggunakan batasan truk dan penalti pada titik risiko yang ditemukan IndoBERT.
2. `standard`: GraphHopper menggunakan batasan truk tanpa penalti risiko, apabila rute `risk_aware` gagal atau tidak memiliki titik risiko.
3. `straight_line_fallback`: garis lurus antara lokasi awal dan tujuan jika GraphHopper tidak dapat menghitung rute. Pada mode ini `distance_km` dan `duration_minutes` bernilai `null`, serta `is_navigable` bernilai `false`.

Titik risiko diklasifikasikan oleh model IndoBERT lokal. Lokasi titik risiko kemudian dicari koordinatnya melalui Nominatim. Jika proses klasifikasi, pencarian koordinat risiko, atau Overpass gagal, proses utama tetap berusaha menghasilkan rute. Fasilitas rute bersifat informasi tambahan dan dapat kosong jika provider Overpass tidak tersedia.

## Struktur Utama

```text
src/
├── app.ts                  # Membuat aplikasi Express dan middleware
├── main.ts                 # Menjalankan server
├── config/                 # Pembacaan environment dan logger
├── errors/                # Tipe error aplikasi
├── middleware/             # Request ID, logging, dan error handler
├── modules/
│   ├── location/           # Pencarian lokasi melalui Nominatim
│   └── smart-route/        # Validasi, risiko, rute, dan fasilitas
│       ├── ml/             # Script classifier.py dan model IndoBERT
│       └── repositories/   # Adapter GraphHopper, IndoBERT, dan Overpass
├── types/                  # Tipe TypeScript
└── utils/                  # Fungsi utilitas
```

Setiap request menerima `X-Request-ID`. ID yang tidak valid atau tidak dikirim akan diganti oleh backend. Log terstruktur mencatat startup, shutdown, penyelesaian request, dan error internal tanpa mencatat body request, cookie, atau header yang sensitif.

## Menjalankan dengan Docker

### Image backend API

Jalankan dari folder `Logiway-BE`:

```sh
docker build -t logiway-backend .
docker run --rm -p 6767:6767 logiway-backend
```

Image backend menggunakan Node.js 22, menjalankan proses sebagai user non-root, memasang Python beserta dependensi CPU `torch` dan `transformers`, serta menyediakan health check pada `/health`.

### Artefak GraphHopper

Sebelum menjalankan Compose, letakkan dua file berikut secara langsung di folder `Logiway-BE/graphhopper`:

- `graphhopper-web-latest.jar`
- `indonesia-latest.osm.pbf`

Jika file baru memiliki nama bertanggal atau berversi, ubah namanya ke nama tetap tersebut sebelum build. Contoh Windows PowerShell:

```powershell
Move-Item ".\graphhopper\indonesia-260823.osm.pbf" ".\graphhopper\indonesia-latest.osm.pbf" -Force
Move-Item ".\graphhopper\graphhopper-web-11.0.jar" ".\graphhopper\graphhopper-web-latest.jar" -Force
```

Di Linux atau macOS, gunakan `mv -f` dengan nama sumber dan tujuan yang sama. Nama tetap diperlukan karena instruksi Docker `COPY`, `ENTRYPOINT`, dan `config-log.yml` menggunakan path statis. Docker tidak memilih file terbaru berdasarkan tanggal atau versi secara otomatis. Setelah mengganti salah satu file, build ulang image GraphHopper agar file baru masuk ke image.

File tersebut diabaikan Git karena ukurannya besar. Folder `graph-cache/` juga merupakan hasil generate GraphHopper dan digunakan sebagai volume Docker.

Jalankan service backend dan GraphHopper dengan Compose:

```sh
docker compose build
docker compose up
```

API memakai GraphHopper pada `http://graphhopper:8989/route` dengan batas waktu bawaan `120000` ms. Jangan memasukkan file `.env` atau secret ke dalam image Docker.
