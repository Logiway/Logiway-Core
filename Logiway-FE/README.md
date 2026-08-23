# Logiway Frontend

Frontend React 19 untuk Smart Logistics Router. Aplikasi memakai endpoint backend untuk pencarian lokasi Indonesia, profil truk Logiway, perhitungan rute backend, dan primitive peta Mapcn source-owned dengan engine MapLibre serta koordinat `[longitude, latitude]`.

## Stack

- React 19, TypeScript, dan Vite 8
- Tailwind CSS v4 melalui `@tailwindcss/vite` dengan konfigurasi CSS-first
- Lucide React untuk seluruh ikon antarmuka
- Primitive Mapcn source-owned dengan MapLibre GL sebagai engine peta

## Arsitektur

```text
src/
├── api/
│   ├── locations/
│   │   ├── locations.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── routes.ts
│   │   └── index.ts
│   └── index.ts
├── app/
│   ├── app.tsx
│   ├── main.tsx
│   └── styles.css
├── components/
│   ├── location/
│   │   ├── location-field.tsx
│   │   └── index.ts
│   ├── route/
│   │   ├── route-information.tsx
│   │   ├── route-map.tsx
│   │   └── index.ts
│   ├── truck/
│   │   ├── truck-specifications-card.tsx
│   │   └── index.ts
│   ├── ui/
│   │   ├── error-toast.tsx
│   │   ├── map.tsx
│   │   ├── select.tsx
│   │   └── index.ts
│   └── index.ts
├── constants/
│   ├── trucks.ts
│   └── index.ts
├── hooks/
│   ├── locations/
│   │   ├── use-location-autocomplete.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── use-smart-route.ts
│   │   └── index.ts
│   └── index.ts
└── types/
    ├── coordinates.ts
    ├── location-suggestion.ts
    ├── smart-route.ts
    ├── truck.ts
    └── index.ts
```

Setiap `index.ts` hanya berisi ekspor eksplisit. Import lintas kategori memakai barrel kategori, sedangkan file dalam kategori yang sama memakai import sibling konkret. UI generik, termasuk combobox pemilihan profil truk, berada di `components/ui`. UI memakai `calculateSmartRoute` dan `searchLocations` secara langsung melalui hooks tanpa lapisan repository atau service tambahan.

Lima spesifikasi truk dapat diedit dari preset terpilih. Hanya tinggi, lebar, dan panjang kendaraan yang dikirim sebagai `truckSpecifications` untuk memengaruhi pemilihan jalan; kapasitas dan volume tetap menjadi informasi operasional yang dapat disesuaikan. Koordinat autocomplete disimpan terpisah untuk asal dan tujuan, dibersihkan hanya saat teks lokasi terkait diedit manual, lalu dikirim berpasangan agar backend tidak melakukan geocoding ulang.

`src/app/styles.css` hanya memuat setup Tailwind, aturan global minimum, aksesibilitas, dan selector MapLibre yang tidak dapat dipindahkan ke JSX. Layout, komponen, dan state responsif ditulis dengan utility Tailwind di TSX.

## Prasyarat

- Node.js 22.12 atau lebih baru
- npm
- Backend Logiway pada port `6767` untuk pengembangan lokal

## Environment

Aplikasi memakai `/api` secara default untuk autocomplete dan routing. Dalam pengembangan, salin `.env.example` menjadi `.env.local` bila target backend bukan default:

```dotenv
DEV_API_PROXY_TARGET=http://localhost:6767
VITE_API_BASE_URL=
```

Vite mem-proxy `/api` ke `DEV_API_PROXY_TARGET` tanpa menghapus prefix. Variabel tanpa prefix `VITE_` hanya dipakai konfigurasi dev server dan tidak dikirim ke browser. `VITE_API_BASE_URL` dibiarkan kosong untuk local, Docker, dan produksi same-origin; isi hanya saat frontend dan backend dipasang pada origin berbeda. Semua nilai `VITE_` bersifat publik dan tidak boleh memuat rahasia.

Image produksi Nginx meneruskan `/api` ke backend melalui DNS Docker `backend:6767`. Deployment eksternal harus mengatur reverse proxy `/api` ke backend atau menetapkan `VITE_API_BASE_URL` saat build frontend; tidak ada domain produksi bawaan.

## Kompatibilitas API Rute

Frontend menerima `distance_km` sebagai angka atau string numerik lama dan menormalkannya menjadi angka. Respons backend lama tanpa metadata rute diperlakukan sebagai `route_mode: "standard"`, `is_navigable: true`, dan `warning: null`. Nilai `distance_km` atau `duration_minutes` boleh `null` hanya untuk `route_mode: "straight_line_fallback"` dengan `is_navigable: false`; hasil tersebut ditampilkan sebagai petunjuk garis lurus, bukan jarak atau waktu rute yang telah dihitung.

Peta memakai primitive Mapcn dengan engine MapLibre. Detail `road_environment` GraphHopper menampilkan ikon segmen kapal feri, sedangkan fasilitas SPBU, tempat istirahat, dan area layanan berasal dari data OSM backend. `pungli_points` ditampilkan sebagai penanda risiko yang telah divalidasi saat runtime. Frontend tidak mengklaim IndoBERT aktif; status model atau proses inferensi tetap menjadi tanggung jawab backend. Backend lama yang belum mengirim `route_details`, `route_facilities_status`, `route_facilities`, atau `pungli_points` tetap didukung dengan nilai default aman.

## Perintah

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

`npm run dev` hanya untuk pengembangan. Build produksi berada di `dist`.

## Docker

Build image dari direktori paket:

```bash
docker build -t logiway-fe .
docker run --rm -p 8080:8080 logiway-fe
```

Container menggunakan build multi-stage dan Nginx non-root pada port `8080`. Konfigurasi produksi meneruskan `/api/...` ke service Docker bernama `backend` pada port `6767` tanpa menghapus `/api`. Jalankan frontend dan backend pada network Docker yang sama agar nama `backend` dapat di-resolve.
