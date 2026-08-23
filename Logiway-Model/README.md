# Model Klasifikasi Laporan Logiway (IndoBERT Fine-Tuning)

Dokumentasi ini berisi penjelasan komprehensif mengenai arsitektur, alur pengumpulan dataset, metodologi pelatihan (fine-tuning) model Natural Language Processing (NLP) berbasis IndoBERT, integrasi pemetaan spasial, serta justifikasi keputusan teknis dalam pengklasifikasian laporan dunia logistik ke dalam 4 kategori risiko.

---

## Daftar Isi
1. Deskripsi Proyek & Alur Pengumpulan Dataset
2. Spesifikasi Model dan Kategori Label
3. Persyaratan Sistem dan Dependensi
4. Alur Kerja Pelatihan (Training Pipeline) & Hyperparameter
5. Cara Menjalankan Pelatihan
6. Output dan Struktur Hasil Training
7. Evaluasi dan Pengujian Inference
8. Pemetaan Spasial & Integrasi GraphHopper Routing Engine
9. Justifikasi Pengambilan Keputusan Teknis

---

## 1. Deskripsi Proyek & Alur Pengumpulan Dataset

Proyek ini bertujuan untuk membangun model klasifikasi teks otomatis berbasis Pre-trained Transformer Model (IndoBERT) guna mendeteksi berbagai jenis gangguan jalan raya dan kondisi operasional logistik di Indonesia, seperti pungutan liar (pungli), penertiban regulasi ODOL (Over Dimension Over Load), dan informasi kelancaran arus lalu lintas.

### Sumber Spesifik & Pengumpulan Teks
- **Pencarian Berita & Laporan Real-Time**: Dataset dikumpulkan secara otomatis dari sumber berita dan laporan aktual menggunakan Google News RSS feed dengan kueri terarah (*targeted search queries*), antara lain:
  - `"pungli sopir truk [Nama Kota/Jalur]"`
  - `"razia ODOL jembatan timbang [Nama Kota/Jalur]"`
  - `"pemajakan truk [Nama Kota/Jalur]"`
- **Pembersihan Data**: Teks artikel berita dibersihkan dari karakter HTML, duplikasi judul, dan potongan teks yang tidak relevan sebelum diproses ke tahap pemodelan.

---

## 2. Spesifikasi Model dan Kategori Label

- **Base Model**: `indobenchmark/indobert-base-p1` (`BertForSequenceClassification`)
- **Jenis Tugas**: Multi-class Text Sequence Classification
- **Jumlah Kelas**: 4 Kategori Risiko

### Kriteria Pelabelan & Skema Label (Label Mapping)

| ID Label | Nama Label | Skor Severity | Kriteria & Pedoman Pelabelan Teks |
|---|---|---|---|
| 0 | AMAN_INFORMASI | 0 / 10 | Berita/laporan umum mengenai kondisi jalan atau lalu lintas yang kondusif, arus lancar, tanpa indikasi gangguan atau tindakan ilegal. |
| 1 | PUNGLI_RINGAN | 4 / 10 | Laporan pemungutan uang tidak resmi tingkat ringan, uang rokok, retribusi parkir liar, atau kutipan pos tanpa kekerasan fisik. |
| 2 | PUNGLI_BERAT | 9 / 10 | Laporan kejahatan berat di jalan, bajing loncat, pemalakan bersenjata, pengancaman, begal, pelemparan kaca truk, atau kekerasan premanisme. |
| 3 | REGULASI_ODOL | 7 / 10 | Laporan penertiban aturan muatan barang, operasi razia jembatan timbang, pemeriksaan uji KIR, dan penimbangan tonase kendaraan oleh Dishub/Kepolisian. |

*Catatan: Khusus untuk armada kendaraan kecil (pickup), dampak tingkat keparahan REGULASI_ODOL diturunkan ke skor 1/10 agar tidak memicu detak putar rute yang tidak efisien.*

---

## 3. Persyaratan Sistem dan Dependensi

### Perangkat Keras yang Direkomendasikan
- GPU: NVIDIA GPU dengan dukungan CUDA (disarankan T4 GPU / V100 untuk efisiensi pelatihan).
- CPU: Multi-core processor (opsional untuk inferensi atau pelatihan data skala kecil).

### Dependensi Software
Persyaratan pustaka Python yang dibutuhkan tercantum dalam file `requirements.txt`:
- `transformers`
- `datasets`
- `evaluate`
- `accelerate`
- `scikit-learn`
- `pandas`
- `torch`

---

## 4. Alur Kerja Pelatihan (Training Pipeline) & Hyperparameter

Pelatihan dilakukan melalui beberapa tahapan terstruktur di dalam file notebook `Logiway_Model.ipynb`:

1. **Instalasi & Konfigurasi Pustaka**: Mengunduh dan mengonfigurasi pustaka Hugging Face `transformers`, `datasets`, `evaluate`, dan `torch`.
2. **Pengumpulan & Pembersihan Dataset**:
   - Scraping otomatis berita dari RSS Google News berdasarkan kata kunci topik logistik.
   - Pembersihan teks, pembuangan duplikasi artikel, dan penyimpanan dataset ke file `dataset_pungli.csv`.
3. **Pra-pemrosesan & Pembagian Dataset**:
   - Pembagian dataset dengan rasio 80% data latih (*train*) dan 20% data uji (*test*).
   - Tokenisasi teks menggunakan tokenizer IndoBERT dengan batas maksimum token (*max length*) 128 - 512 token.
4. **Hyperparameter Pelatihan Fine-Tuning**:
   - **Base Architecture**: `indobenchmark/indobert-base-p1` (BertForSequenceClassification)
   - **Learning Rate**: `2e-5`
   - **Epochs**: `3`
   - **Batch Size**: `16` (GPU) atau `4` (CPU)
   - **Weight Decay**: `0.01`
   - **Optimizer**: `AdamW`
   - **Hidden Dropout Prob**: `0.1`
   - **Attention Dropout Prob**: `0.1`
5. **Metrik Evaluasi Performa Model**:
   Performa model diuji pada data evaluasi menggunakan metrik:
   - **Accuracy**: Mengukur persentase prediksi yang tepat dari seluruh sampel uji.
   - **Precision, Recall, & F1-Score (Macro / Weighted)**: Mengukur ketepatan dan sensitivitas model pada masing-masing kelas (khususnya untuk meminimalkan *false positive* pada kelas PUNGLI_BERAT dan REGULASI_ODOL).
   - **Confusion Matrix**: Memvisualisasikan penyebaran salah klasifikasi antar kategori.

---

## 5. Cara Menjalankan Pelatihan

### Opsi A: Menjalankan di Lingkungan Lokal (VS Code / Jupyter Lab)

1. Persiapkan Virtual Environment:
   ```bash
   python -m venv .venv
   ```
   Aktifkan environment:
   - Windows (PowerShell):
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - Linux / macOS:
     ```bash
     source .venv/bin/activate
     ```

2. Install Seluruh Dependensi:
   ```bash
   pip install -r requirements.txt
   ```

3. Jalankan Notebook:
   Buka file `Logiway_Model.ipynb` di Jupyter Notebook, Jupyter Lab, atau VS Code, lalu jalankan seluruh sel secara berurutan.

---

### Opsi B: Menjalankan di Google Colab

1. Unggah file `Logiway_Model.ipynb` ke Google Colab.
2. Pastikan Runtime disetel menggunakan Accelerator GPU (Menu: Runtime > Change runtime type > T4 GPU).
3. Jalankan seluruh sel (Runtime > Run all).
4. Setelah proses pelatihan selesai, file zip bobot model (`indobert-pungli-classifier.zip`) dapat diunduh ke komputer Anda.

---

## 6. Output dan Struktur Hasil Training

Setelah pelatihan selesai, direktori proyek akan menghasilkan file berikut:

- `dataset_pungli.csv`: File dataset hasil scraping berita dan pelabelan otomatis.
- `indobert-pungli-classifier/`: Folder berisi artefak model PyTorch dan tokenizer hasil fine-tuning (`config.json`, `model.safetensors`, `tokenizer.json`, `tokenizer_config.json`).
- `indobert-pungli-classifier.zip`: File arsip kompresi dari folder model untuk keperluan distribusi atau deployment.

---

## 7. Evaluasi dan Pengujian Inference

Anda dapat langsung menguji model yang telah dilatih menggunakan pustaka `transformers.pipeline`:

```python
from transformers import pipeline

# Memuat model yang telah dilatih
classifier = pipeline(
    "text-classification",
    model="./indobert-pungli-classifier",
    tokenizer="./indobert-pungli-classifier"
)

# Contoh pengujian kalimat
teks_laporan = "Waspada preman bersenjata peras jutaan rupiah dan ancam sopir ekspedisi di lintas Sumatera."
hasil = classifier(teks_laporan)[0]

print(f"Hasil Prediksi : {hasil['label']}")
print(f"Tingkat Kepercayaan: {hasil['score']:.4f}")
```

---

## 8. Pemetaan Spasial & Integrasi GraphHopper Routing Engine

Hasil klasifikasi teks laporan oleh IndoBERT dipetakan ke peta digital melalui alur kerja terintegrasi:

1. **Pengambilan Teks & Lokasi**: Modul web scraper mengambil teks laporan bersama nama entitas lokasi (misal: "Bekasi", "Subang", "Tanjung Priok").
2. **Geocoding Spasial**: Modul geocoder mengonversi entitas nama lokasi menjadi koordinat [longitude, latitude] menggunakan OpenStreetMap Nominatim API & kamus fail-safe lokal.
3. **Klasifikasi IndoBERT**: Skrip PyTorch mengevaluasi teks dan mengembalikan kelas label beserta skor keparahan (*severity score*).
4. **Pembentukan Poligon Zona Risiko**: Koordinat titik [lon, lat] dikonversi menjadi zona poligon lingkaran beradius 400 meter.
5. **Penyesuaian Prioritas Rute GraphHopper**: Poligon dimasukkan ke dalam objek `custom_model` GraphHopper untuk menurunkan nilai prioritas (*priority multiplier*) ruas jalan yang berpotongan dengan poligon tersebut, sehingga mesin routing otomatis membelokkan armada menjauhi lokasi berisiko.

---

## 9. Justifikasi Pengambilan Keputusan Teknis

### Mengapa Fine-Tuning IndoBERT dibanding Model Closed-Source (OpenAI / Gemini API)?
1. **Adaptabilitas Bahasa Lokal & Slang Logistik**: IndoBERT dilatih pada korpus Bahasa Indonesia sehingga mampu memahami istilah lokal dan slang jalanan (seperti *"pemajakan"*, *"uang rokok"*, *"batu melayang"*, *"kancil"*).
2. **Tanpa Biaya Cloud & Kuota Token**: Pelaksanaan inferensi berjalan 100% lokal di container tanpa biaya per-token API berbayar dan terhindar dari *rate-limit*.
3. **Privasi & Keamanan Data**: Data internal perjalanan logistik armada tidak dikirimkan ke server pihak ketiga eksternal.
4. **Latensi Konsisten**: Terhindar dari *network latency* cloud API dan risiko *model drift*.

### Logika Matematis Penyeimbang Rute (BBM vs MST vs Risiko Pungli)

GraphHopper mengalkulasi rute menggunakan fungsi bobot biaya (*edge weight cost function*):

$$\text{Cost}(e) = \frac{\text{Distance}(e)}{\text{Speed}(e)} \times \frac{1}{\text{Priority}(e)}$$

Nilai prioritas risiko (\text{Priority}_{\text{risk}}) dihitung dari skor keparahan IndoBERT ($S \in [0, 10]$) dengan formula:

$$\text{Priority}_{\text{risk}}(S) = \max\left(0.05, \, 1 - \frac{S}{10}\right)$$

- Untuk `PUNGLI_BERAT` ($S = 9$), nilai prioritas menjadi 0.1, menyebabkan biaya ruas jalan melonjak 10 kali lipat dan memaksa GraphHopper memilih rute alternatif yang lebih aman.
- Untuk `REGULASI_ODOL` ($S = 7$), penalti disesuaikan dengan profil truk. Truk sedang/besar menerima penalti prioritas 0.3, sedangkan pickup kecil menerima penalti minimal (0.9).
- Keseimbangan antara jarak perjalanan (BBM), kepatuhan Muatan Sumbu Terberat (MST), dan penghindaran titik rawan dihitung secara matematis menggunakan algoritma optimasi graf Contraction Hierarchies / Dijkstra.
