/* ═══════════════════════════════════════════════════════════════
   TEMPLATE.JS — Kelola semua template catatan di sini
   ────────────────────────────────────────────────────────────────
   • BUILT_IN_TEMPLATES  : template bawaan aplikasi, edit sesukamu
   • Custom Templates    : template yang kamu simpan sendiri dari catatan,
                           disimpan di localStorage
   ═══════════════════════════════════════════════════════════════ */

// -----------------------------------------------
// Helper tanggal & waktu (digunakan di template)
// -----------------------------------------------
const tglIndo = () => {
  const d = new Date();
  const tanggal = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const waktu = d
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":");
  return tanggal + ", " + waktu + " WIB";
};

// -----------------------------------------------
// TEMPLATE BAWAAN
// Tambah, edit, atau hapus template di sini.
// Setiap template memiliki:
//   name    : nama tampilan
//   desc    : deskripsi singkat
//   tags    : kata kunci untuk pencarian (pisahkan spasi)
//   content : isi HTML catatan
// -----------------------------------------------
const BUILT_IN_TEMPLATES = [
  {
    name: "Analisa Diri Harian",
    desc: "Refleksi harian ringan: emosi, trigger, dan hikmah.",
    tags: "refleksi emosi harian audit",
    content:
      "<h2>Analisa Diri Harian</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Trigger</h2><p>Ada peristiwa / hal apa?</p><h2>Reaksi emosi spontan</h2><p>Marah, sedih, kaget?</p><h2>Negativity Autopilot</h2><p>Pikiran otomatis negatif apa yang muncul?</p><h2>Reaksi fisikal spontan</h2><p>Berkeringat, gemetar, dada sesak, dll?</p><h2>Nutrisi yang kurang / diinginkan</h2><p>Apa yang sebenarnya jiwa (ego) ini inginkan?</p><h2>Tindakan Sadar</h2><p>Apa yang dilakukan untuk kembali hening / netral?</p><h2>Pelajaran / Rasa Syukur</h2><p>Pelajaran apa yang didapat hari ini?</p>",
  },
  {
    name: "Jurnal Hening",
    desc: "Latihan Hening dengan penuh Kesadaran",
    tags: "meditasi hening kesadaran spiritual",
    content:
      "<h2>Jurnal Hening</h2><p><strong>Waktu:</strong> " +
      tglIndo() +
      "</p><h2>Niat awal Meditasi</h2><p>Ingin penyelarasan diri karena dada terasa sesak</p><h2>Hambatan/Distraksi</h2><p>Pikiran, kenangan, atau rasa fisik apa yang timbul saat mencoba hening</p><h2>Keadaan saat meditasi</h2><p>Bisa menikmati? atau spanneng? susah tenang? ada ambisi abcde?</p><h2>Kondisi setelah Hening</h2><p>Apakah terasa damai? tenang? semakin Bersyukur, Terberkati?</p>",
  },
  {
    name: "Jurnal Topo Ing Rame (TIR)",
    desc: "Evaluasi kesadaran di saat sibuk, bekerja, atau dalam interaksi sosial",
    tags: "topo rame kerja sosial kesadaran",
    content:
      "<h2>Jurnal Topo Ing Rame</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Kondisi apa yang kamu coba hening?</h2><p>Lagi kerja dikantor, lagi bareng keluarga dirumah</p><h2>Respon spontan</h2><p>Takut, khawatir, merasa terganggu, merasa berisik</p><h2>Hal yang dirasa saat mencoba TIR</h2><p>Merasa semakin tenang menghadapi masalah</p><h2>Validasi</h2><p>Bertanya kepada Pamomong untuk divalidasi hasil heningnya</p>",
  },
  {
    name: "Mengenal Diri",
    desc: "Membongkar lapisan ego, luka batin, dan merealisasikan Diri Sejati",
    tags: "diri ego luka batin trauma",
    content:
      "<h2>Mengenal Diri dari lapisan terdalam</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Emosi Sadar</h2><p>Emosi spontan yang terasa saat ini</p><h2>Emosi Bawah Sadar</h2><p>Emosi yang terasa namun tidak bisa diartikan</p><h2>Dugaan Akar Emosi</h2><p>Dari masa lalu atau trauma yang tidak nyaman</p><h2>Pola otomatis kita</h2><p>Baper, bingung, melipir ingin sendiri atau mencari ketenangan atau langsung hening?</p><h2>Petunjuk yang dimengerti</h2><p>Kedepannya jangan baperan, fokus pada tujuan utama pemurnian jiwa dan pembentukan karakter diri lebih selaras</p>",
  },
  {
    name: "Bersyukur Setiap Hari",
    desc: "Mencatat rasa syukur dan berkah yang dirasakan setiap hari",
    tags: "syukur berkah harian positif",
    content:
      "<h2>Bersyukur Setiap Hari</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Terimakasih Gusti, karena</h2><ol><li>Bisa Menulis Jurnal dengan mudah</li><li>Lebih tenang menghadapi semua masalah</li><li>Masih diberi kesempatan Hidup</li></ol><h2>Momen Paling Bermakna</h2><p>Apa momen yang paling berkesan hari ini?</p><h2>Pelajaran Hari Ini</h2><p>Ada Hikmah apa hari ini?</p><h2>Niat untuk besok</h2><p>Hal baik apa yang ingin dilakukan besok?</p>",
  },
  {
    name: "Evaluasi Mingguan",
    desc: "Review mingguan: pencapaian, tantangan, dan rencana minggu depan",
    tags: "minggu evaluasi review pekanan",
    content:
      "<h2>Evaluasi Mingguan</h2><p><strong>Minggu ke-</strong> " +
      new Date().toLocaleDateString("id-ID") +
      "</p><h2>Pencapaian Minggu Ini</h2><p>Hal-hal positif yang berhasil dilakukan</p><h2>Tantangan yang Dihadapi</h2><p>Kesulitan atau hambatan apa yang muncul?</p><h2>Pola Emosi Minggu Ini</h2><p>Emosi dominan apa yang dirasakan?</p><h2>Area yang Perlu Diperbaiki</h2><p>Apa yang bisa ditingkatkan minggu depan?</p><h2>Rencana Minggu Depan</h2><p>Target dan niat untuk 7 hari ke depan</p>",
  },
  {
    name: "Doa & Niat",
    desc: "Mencatat doa, harapan, dan niat yang ingin disampaikan",
    tags: "doa niat harapan spiritual",
    content:
      "<h2>Doa & Niat</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Doa untuk Diri Sendiri</h2><p>Doa untuk diri sendiri agar diberi kemudahan dan kelancaran hidup</p><h2>Doa untuk Keluarga</h2><p>Doa agar orang terdekat ada dalam kebahagiaan selalu dan dipermudah juga</p><h2>Doa untuk Sesama</h2><p>Doa untuk orang lain dan lingkungan sekitar</p><h2>Niat Baik</h2><p>Komitmen atau niat baik yang ingin dipegang untuk lebih baik kedepannya</p>",
  },
  {
    name: "Catatan Studi",
    desc: "Template untuk mencatat materi belajar dan poin-poin penting",
    tags: "belajar studi catatan materi sekolah kuliah",
    content:
      "<h2>Catatan Studi</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><p><strong>Mata Pelajaran/Materi:</strong> </p><h2>Ringkasan</h2><p>Tuliskan intisari materi dengan kata-kata sendiri</p><h2>Poin Penting</h2><ul><li>Poin 1</li><li>Poin 2</li><li>Poin 3</li></ul><h2>Pertanyaan</h2><p>Hal yang belum dipahami atau ingin ditanyakan</p><h2>Tindak Lanjut</h2><p>Aktivitas selanjutnya: baca buku, tugas, latihan soal, dll</p>",
  },
  {
    name: "Rapat / Pertemuan",
    desc: "Notulen rapat atau catatan hasil pertemuan",
    tags: "rapat pertemuan meeting notulen kerja",
    content:
      "<h2>Notulen Rapat</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><p><strong>Agenda:</strong> </p><p><strong>Peserta:</strong> </p><h2>Pembahasan</h2><p>Ringkasan poin-poin yang dibahas</p><h2>Keputusan</h2><ul><li>Keputusan 1</li><li>Keputusan 2</li></ul><h2>Action Items</h2><ul><li><input type='checkbox'> Tugas 1 - Deadline: </li><li><input type='checkbox'> Tugas 2 - Deadline: </li></ul><h2>Catatan Tambahan</h2><p></p>",
  },
  {
    name: "Ide & Inspirasi",
    desc: "Tempat mencatat ide, inspirasi, dan pemikiran kreatif",
    tags: "ide inspirasi kreatif brainstorm",
    content:
      "<h2>Ide & Inspirasi</h2><p><strong>Tanggal:</strong> " +
      tglIndo() +
      "</p><h2>Ide Utama</h2><p>Jelaskan ide atau inspirasi yang muncul</p><h2>Latar Belakang</h2><p>Dari mana ide ini muncul? Apa pemicunya?</p><h2>Potensi & Peluang</h2><p>Apa yang bisa dikembangkan dari ide ini?</p><h2>Langkah Selanjutnya</h2><p>Apa yang perlu dilakukan untuk mewujudkan ide ini?</p><h2>Catatan Bebas</h2><p>Tuliskan apapun yang terlintas di pikiran...</p>",
  },
];

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TEMPLATES — Disimpan di localStorage
   ═══════════════════════════════════════════════════════════════ */

/** Ambil semua template custom dari localStorage. */
function loadCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem("ikw_custom_templates") || "[]");
  } catch {
    return [];
  }
}

/** Simpan array template custom ke localStorage. */
function _saveCustomTemplates(templates) {
  localStorage.setItem("ikw_custom_templates", JSON.stringify(templates));
}

/**
 * Gabungkan template bawaan + custom.
 * Urutan: custom (Template Saya) dulu, lalu bawaan.
 */
function getAllTemplates() {
  return [...loadCustomTemplates(), ...BUILT_IN_TEMPLATES];
}

/**
 * Simpan objek catatan sebagai template custom baru.
 * @param {object} note - objek catatan dari S.notes
 * @returns {object} template baru yang disimpan
 */
function saveNoteAsTemplate(note) {
  const customs = loadCustomTemplates();
  const newTpl = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: note.title || "Template Baru",
    desc: "Disimpan pada " + new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    tags: (note.tags || []).join(" "),
    content: note.content || "",
    custom: true,
  };
  customs.push(newTpl);
  _saveCustomTemplates(customs);
  return newTpl;
}

/**
 * Hapus template custom berdasarkan ID.
 * @param {string} id - id template custom
 */
function deleteCustomTemplate(id) {
  const customs = loadCustomTemplates().filter((t) => t.id !== id);
  _saveCustomTemplates(customs);
}
