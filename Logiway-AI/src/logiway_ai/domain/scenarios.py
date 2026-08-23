from __future__ import annotations

from logiway_ai.domain.models import Scenario

CITIES = (
    "Ambon",
    "Balikpapan",
    "Banda Aceh",
    "Bandung",
    "Banjarmasin",
    "Batam",
    "Bengkulu",
    "Denpasar",
    "Gorontalo",
    "Jayapura",
    "Kendari",
    "Kupang",
    "Makassar",
    "Malang",
    "Manado",
    "Mataram",
    "Medan",
    "Padang",
    "Palembang",
    "Palu",
    "Pekanbaru",
    "Pontianak",
    "Samarinda",
    "Semarang",
    "Sorong",
    "Surabaya",
    "Yogyakarta",
)

AREA_TYPES = (
    "area industri simulasi",
    "koridor arteri simulasi",
    "area pergudangan simulasi",
    "akses pelabuhan simulasi",
    "perbatasan kota simulasi",
    "simpang terminal simulasi",
)

VEHICLES = (
    "trailer",
    "tronton",
    "engkel",
    "kontainer 40 kaki",
    "truk tangki",
    "wing box",
    "dump truck",
)

TIMES = (
    ("00:00", 0),
    ("01:00", 1),
    ("02:30", 2),
    ("04:00", 4),
    ("06:00", 6),
    ("08:00", 8),
    ("10:00", 10),
    ("12:00", 12),
    ("14:00", 14),
    ("16:00", 16),
    ("18:00", 18),
    ("20:00", 20),
    ("22:00", 22),
    ("23:30", 23),
)

QUESTION_TEMPLATES = (
    "Bagaimana estimasi perjalanan {vehicle} di {location} pukul {time}?",
    "Buat estimasi risiko sintetis {vehicle} di {location} sekitar {time}.",
    "Apa langkah kehati-hatian untuk {vehicle} di {location} pukul {time}?",
    "Uji skenario {vehicle} di {location} pada {time}; ini bukan fakta lapangan.",
    "Analisis sintetis {vehicle} di {location} pukul {time}; ini bukan data resmi.",
    "Apa rencana mitigasi hipotetis untuk {vehicle} di {location} sekitar {time}?",
)

SCENARIOS = (
    Scenario(
        code="SYN-CONGESTION",
        category="kepadatan lalu lintas hipotetis",
        start_hour=15,
        end_hour=20,
        risk_during_window="tinggi",
        assumption="arus kendaraan dan antrean bongkar muat diasumsikan meningkat",
        advice="siapkan waktu penyangga, cek kondisi aktual, dan pilih titik tunggu yang aman",
    ),
    Scenario(
        code="SYN-NIGHT-SAFETY",
        category="keselamatan perjalanan malam hipotetis",
        start_hour=22,
        end_hour=4,
        risk_during_window="tinggi",
        assumption="penerangan dan aktivitas di sekitar koridor diasumsikan berkurang",
        advice=(
            "hindari berhenti sendirian, gunakan titik istirahat resmi, dan jaga "
            "komunikasi dengan dispatcher"
        ),
    ),
    Scenario(
        code="SYN-WEATHER",
        category="gangguan cuaca hipotetis",
        start_hour=13,
        end_hour=18,
        risk_during_window="sedang",
        assumption="hujan lebat dan jarak pandang rendah diasumsikan terjadi",
        advice=(
            "kurangi kecepatan, tambah jarak aman, dan tunda perjalanan bila kondisi "
            "aktual tidak aman"
        ),
    ),
    Scenario(
        code="SYN-LOADING",
        category="antrean fasilitas logistik hipotetis",
        start_hour=7,
        end_hour=12,
        risk_during_window="sedang",
        assumption="jadwal kedatangan kendaraan diasumsikan bertumpuk",
        advice="konfirmasi slot bongkar muat dan sediakan lokasi tunggu yang diizinkan",
    ),
    Scenario(
        code="SYN-VEHICLE",
        category="kesiapan kendaraan hipotetis",
        start_hour=0,
        end_hour=23,
        risk_during_window="sedang",
        assumption="kendaraan diasumsikan memerlukan pemeriksaan tambahan sebelum perjalanan",
        advice="periksa ban, rem, lampu, muatan, dokumen kendaraan, dan kesiapan pengemudi",
    ),
)
