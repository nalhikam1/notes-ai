# 🧠 Ensiklopedia Kode: Bedah Tuntas Quill Notes

Dokumen ini adalah *"Bible"* (buku panduan inti) dari segala baris kode di aplikasi **Quill Notes**. Kami memecah setiap elemen, blok, fungsi, dan komponen dari TIGA file utamanya agar *kamu yang mulai dari 0 sekalipun bisa memahami bagaimana setiap sekrup dan mur di program ini saling terhubung.*

Tidak ada yang dilewatkan. Setiap komponen HTML, setiap trik CSS, dan setiap fungsi di JS akan didokumentasikan di sini.

---

# 🧱 BAGIAN 1: `index.html` (Kerangka & Komponen)

Berperan sebagai wadah (kanvas) statis. JS akan mengambil wadah ini lalu mematikan/menghidupkannya, dan mengisi isinya secara dinamis.

## 1. Tag `<head>` dan Pustaka Eksternal
- **Google Fonts** (`DM Sans`): Digunakan untuk tipografi keseluruhan agar bernuansa modern.
- **Marked.js** (`https://cdn.jsdelivr.net/npm/marked/marked.min.js`): Pustaka *eksternal* (satu-satunya pustaka) yang dipakai oleh AI untuk mengubah balasan berbasis *Markdown* (mengandung bintang `**`, pagar `#`) menjadi teks HTML tebal/miring yang rapih di chat gelembung.
- PWA manifest *blob* *link* buatan skrip.

## 2. Jendela Onboarding `div id="onboarding"`
Hanya muncul ketika *user* baru pertama kali datang (Belum ada *LocalStorage*).
- **Langkah 1 (Karakter)**: form `p-name`, `p-role`, `p-about`.
- **Langkah 2 (API/AI)**: Tombol tombol pemilihan Provider, dropdown Model, dan kunci API.
- Diatur penampilannya melalui transisi antar-elemen id `s1` -> `s2` menggunakan fungsi `nextStep()`.

## 3. Aplikasi Utama `div id="app"`
Memiliki kelas `.app-container` (Flexbox Horizontal). Dibagi menjadi tiga kolom utama: KIRI, TENGAH, KANAN.

### A. Konteks KIRI: `#sidebar` (Gudang Navigasi)
- **Persona Badge**: Nampan profil user berisikan inisial avatar (`p-avatar`).
- **Sidebar Tabs**: Tombol "Pohon Projek" (Notes) dan "Daftar Template" (Templates). Memanggil fungsional `switchTab()`.
- **Konten Relatif Sidebar (`#sidebar-content`)**: **(AREA KOSONG)**. Ini adalah div kosong yang isinya selalu disuntikkan secara dinamis oleh JavaScript setiap kali terjadi perubahan folder/note.
- **Folder Toggle (`#menu-home`)**: Tombol untuk lompat kembali ke Beranda (Dashboard global).

### B. Konteks TENGAH: `.main-content` (Area Kerja Utama)
Area paling kompleks karena menggunakan sistem **3 Status Tampilan Berbeda** yang bergantian hidup/mati (*display: flex* / *display: none*):
1. **`#dashboard-view`**: 
   - Ini layar global. Ada papan metrik ("Total Projects", "Total Words"). 
   - `#projects-grid`: Div kosong tempat JS membangun desain kotak (*card*) tiap per-project agar bisa di-klik.
2. **`#project-view`**: 
   - Layar bila fokus masuk ke 1 Project spesifik.
   - Punya 2 mode saklar: List View (`☰`) dan Kanban View (`◫`).
   - `#project-content`: Area kosong tempat JS memuntahkan tabel (`<table>`) baris folder atau kotak-kotak *Kanban Board*.
3. **`#editor-view`**:
   - Area Papan Tulis (Catatan). Punya judul kolom bebas ketik `<input id="note-title">`.
   - `.editor-toolbar`: Segala tombol cetak Bold, Italic, Header `<h1>`, *Checklist*, hingga tabel. Memanggil sistem bawaan browser `document.execCommand(cmd)`.
   - **`<div id="editor" contenteditable="true">`**: Jantung penulisannya. Segala atribut bawaan web yang memungkinkan `<div>` bertingkah layaknya Ms.Word. Dia punya pengintai di *event* `oninput` untuk mengawasi kapan user stop ngetik agar disimpan otomatis (Autosave).

### C. Konteks KANAN: `#right-sidebar` (Asisten AI)
- **Top Tabs**: Tab 'Chat' untuk ngobrol, 'TOC' untuk daftar isi judul (sekarang dimatikan via styling), dan tab metrik dokumen aktif.
- **`#chat-history`**: Kotak bergulir (*Scrollable*) yang akan disumpal oleh gelembung jawaban chat dari user dan AI.
- **`#chat-input`**: Laman `textarea` pengetikan. Memicu fungsi ukur dimensi layar ketika mengetik panjang via `oninput="autoResizeChat(this)"`. Diiringi tab chips (Review, Analyze, Streamline).

### D. Konteks BAWAH: `#bottom-bar` & Modal-Modal
- `#bottom-bar`: Navigasi melayang yang cuma menyala di *Mobile/HP* via media queries. Berisi *Home*, *Projects* (Buka Sidebar), *+* Note, *Assistant*, *Settings*.
- **Modal (*Popup Window*)**: Layar gelap `.modal-overlay` yang memblokir klik layar hingga tombol `✕` dipencet. Isinya UI tambahan untuk memindahkan note (`#move-modal`), buat folder (`#folder-modal`), dan simpan template (`#tmpl-modal`).

---

# 🎨 BAGIAN 2: `style.css` (Lukisan & Tata Letak Flex/Grid)

Mengatur bagaimana wadah HTML di bab 1 dilukis sedemikian rupa, menyulapnya dari tag HTML kaku menjadi website premium.

## 1. CSS Root & Reset 
- `:root`: Deklarasi *"Token"* nama variabel warna. Menyimpan kodesandi hex seperti `--bg: #0f0f0f`. Sangat berguna supaya memanggil warna cukup lewat sintak `var(--bg)` di mana saja (semua fungsi dark-mode menumpu darisni!).
- `* { box-sizing: border-box; }`: Peraturan duniawi HTML agar padding ketebalan garis tak merusak batas lebar blok yang disetel `100%`.

## 2. Struktur Skeleton (Flexbox Area)
- `.app-container` memiliki `display: flex; height: 100vh; overflow: hidden;`. Ini yang membikin Sidebar, Main-Content, Right-Sidebar bersampingan tanpa pernah ada scrollbar tumpah menutupi tubuh bawah layar.
- `.main-content`: Ditugaskan `flex: 1` agar mengisi wilayah kosong manapun setelah "digencet" Sidebar yang fix melintang sebesar `240px`/`300px`.

## 3. Komponen Estetika Spesifik (UI Micro-Blocks)
- **Tombol & Input (`.btn-primary`, `.form-input`)**: Dibangun secara estetik rata-rata dengan lekuk `border-radius: 8px` dan transisi lunak (`transition: 0.2s`).
- **Sidebar Tree Hierarchy (`.tree-row`, `.tree-children`)**:
  Menjawab mengapa sub-folder bisa 'masuk ke dalam'. Elemen utamanya dimanipulasi dengan `padding-left`. Panah "Collapse/Expand" pakai `.tree-arrow.open { transform: rotate(90deg); }`.

## 4. Editor Toolbar & Checklist
- Memodifikasi tombol WYSIWYG yang memiliki `hover` efek ke highlight abu-abu di `.editor-toolbar button`.
- Checklist HTML (Checkbox palsu). Di CSS kita membuat kotak bundar mati yang dinamis dengan gaya `:before`/`:after`, jika ia `.done`, dicoretlah garisnya dengan `.ql-check-text { text-decoration: line-through }`.

## 5. Mobile Responsiveness / Media Queries 📱!
- `@media (max-width: 768px)`: Area pembalik keadaan!
- **Sidebar Kabur**: `#sidebar` disetel posisi ke `fixed`, terbang keluar layar dengan `-100% translateX`. Baru ditarik masuk kala ditambahin *class* `.open`. Menyingkirkan keberadaannya dari grid tengah.
- **Tengah Berkuasa**: `.main-content` akan memakan `100%` jatah lebar HP di titik ini.
- **AI Sidebar Menjadi Layar Lipat Bawah**: `.right-sidebar` yang sebelumnya di sisi flex paling kanan dikonvert dari Flex menjadi `position: fixed; inset: 0; z-index: 999; transform: translateY(100%);`. Dia turun bersembunyi dibawah batas monitor HP, ia muncul naik (seperti *sheet* laci) bila ditekan fungsinya.

---

# 🧠 BAGIAN 3: `script.js` (Logika Kinerja Detik per Detik)

Sekarang kita membedah organ terpentingnya. Skrip terbagi atas belasan kelompok *Fungsi* murni yang menempel pada variabel global.

## 1. Jantung Data: Konfigurasi State (`ST`)
Ini adalah peta DNA memory yang aktif selama web berjalan:
```javascript
const ST = {
  projects: [{id:'..', name:'General', ...}],
  folders: [],
  notes: [{id:'..', title:'', content:'', folderId:'..'}],
  templates: [], 
  activeId: null,      // Di note mana kamu ngetik saat ini?
  activeProjectId: null, // Project apa yang menunggui layar tengahmu?
  openNodes: {},       // Ingatan ID folder mana saja yang posisinya sedang 'Terbuka / Expanded'
  // Dan pengaturan API + Persona...
};
```
- Kenapa ada `folderId` atau `projectId` di dalam *Object Note*? Karena cara JS kita menyambungkan Note/Folder ke Induk-nya ada pada skema **"Relational Indexing"**. JS tahu Note tsb milik Project B karena ia menyuntik tulisan "Project=B". Sama persis kaya Database SQL!

## 2. Booting / Memulai Mesin (`initApp`, `loadState`)
- **`loadState()`**: Skrip pertama berjalan. Ia mem-`fetch` atau `localStorage.getItem('quill2')`. Bila isinya valid (Persona tak kosongan), maka dia isikan seluruh data ke dalam Variabel Tunggal `ST` lalu menyuruh `initApp()` berjalan.
- **`initApp()`**: Akan melempar perintah melukis-ulang `renderSidebar()` dan `showDashboard()`. Ini alasannya beranda depan akan seketika hidup walau sebelumnya kosong!

## 3. Sistem Operasional CRUD (Create, Read, Update, Delete)
Banyak *Function* berulang perannya:
- `uid()`: Pembuat KTP / Generator identitas acak acak unik (*Kombinasi huruf-angka waktu*). Tiap buat komponen baru, JS ngasih cap id acak ini agar unik anti tertukar seumur hidup.
- **Membuat Hirarki** (`openNewFolder`, `saveFolder`, `newNote`):
  Saat tombol + ditekan, alurnya -> Minta input nama lewat `#folder-modal` -> tekan "SaveFolder" -> JS akan melempar nilai objek baru `{id: uid(), name:"A"}` menggunakan `.push(..)` ke Array `ST.projects` (Atau foldernya). Lalu secepat kilat memanggil `saveState()` (Agar simpan permanen) diikuti `renderSidebar()` (agar UI layarnya me-refres memunculkan nama barunya).
- **Penghapusan Kaskade Berlipat** (`deleteProject`, `deleteFolder`):
  Menariknya disini jika di-klik "Delete Project B". Fungsi Javascript `.filter()` akan menghilangkan Project ID B dari kelompok `ST.projects`. NAMUN JS tidak hanya mendelete project, metode `.filter` akan menghapus setiap *folders* yang membawa label `projectId === 'B'`, dan menghapus semua notes berlabel ID tsb. Itulah Kaskade. Habis sampai ke akar-akarnya.

## 4. Mesin Render Dinamis (`renderTree`, `renderSidebar`, dsb.)
Cara kerja JS untuk mewujudkan teks Array `ST` menjadi balok GUI HTML di layar:
- `renderTree()` memakai prinsip fungsi **Rekursif**. Ia akan terus menggali ke lubang sub-folder jika dia menangkap folder yang punya `parentId` setara di memori, merender tag `<div>` hingga ke akar kedalaman Notes!
- Modul *render* (*cth `renderProjectDashboard`*) memakai `.map().join('')` untuk menghasilkan susur kiasan *String HTML* yang panjang lalu ditanam bulat-bulat ke wadahnya via `.innerHTML = html`. Sangat primitif tapi laju eksekusinya super ringan untuk browser.

## 5. Sistem Ketikan & Penyimpan Otomatis (`autoSave`)
Kenapa saat kamu ketik, catatan kesimpan sendiri?
1. Saat elemen HTML `<div id="editor">` tersetrum jari keyboard (trigger `oninput`), fungsi menyembunyikan tag pemanggil ke fungsi JS `scheduleAutoSave()`.
2. Skema Jeda **Debounce (800ms) Timer**: JS merintah *Timer Jam* internal `setTimeout()` mundur diam-diam... Kalau dalam batas 800 *millisecond* jari orang mengetik lagi, timernya di `clearTimeout` dan mundur lagi. Tujuannya? Agar tak nge-*spamming* penyimpanan ke HardDisk yang lamban / boros di tiap ketikan 1 huruf kecil sekalipun.
3. Kalau lolos dari penantian pengetik (jari diam), baru ia mengeksekusi `autoSave()` sejati: Menggandakan (*Clone*) tulisan utuh `document.getElementById('editor').innerHTML`, melempar isinya ke property `content` di Array Note `ST` dan menguncinya permanen (`saveState`). Sembari mengubah status teks pojok memunculkan *"✓ Tersimpan"*.

## 6. Algoritme Obrolan AI (`sendChat`, `requestAI`)
- **Pembantu Konteks Teks (`updateChatCtx`)**: Membaca serpihan kalimat terakhir yang lagi disentuh (di-*Block*/ *highlight*) jendala mouse di Note via `window.getSelection()`. Atau kalau tidak nyorot blok text tertentu ya diambil lah satu layar note.
- **`requestAI` - Jantung Telepati API**: Mengemas Array pesanan (seperti *"Kamu peran XYZ"*, dan *"Apa kata user.."*), menggabungkan menjadi paketan payload JSON. Menembakkannya menggunakan protokol `fetch()` ke alamat yang sesuai setelan, termasuk perantara `api/ai.js`.
- **Ekstrak & Streamline API**: Data balasan dijahit balik kedalam Array `ST.chatHistory` lalu meminta elemen `<div class="chat-bubble">` menge-print pelan-pelan pesannya menggunakan `marked.parse(content)` agar struktur list dan *bold* tampil cantik.

## 7. Import/Export Smart Merge (Mesin Cadangan Cerdas)
Fitur revolusioner anti tumpah yang baru diracik berkonsep Logika Tumpang Tindih (*Overwrite*):
- **Export (`exportData`)**: Mengambil tali tebal murni JSON dari penyimpanan dalam perut browser `localStorage.getItem('quill2')`. Mengubah wujud si teks abstrak ini menjadi *virtual format file* (`Blob`). Menugaskan tag jangkar (*Anchor* / `<a>`) bohongan untuk "Klinik Download ini" secara diam-diam.
- **Import (`importData`)**: Mengurai bongkaran `Blob / JSON` kembali menjadi bentuk *Object Array JavaScript* (Daging). 
  - Logika Pengecekan *Smart Merge* (Mengguna Loop Perulangan): Bukannya langsung ditumpah membanjiri `ST` lama, skrip membaca elemen JSON satu per satu. Misalnya ia memeriksa Project "Draf Novel": *"Hai ST, do you have a Project named 'draf novel' in lowercase?"*. Melalui validasi `.toLowerCase().trim()`.
  - Apabila Jawabannya YA: Oh ini sekeping Note / Project Duplikat!! Dia enggan menambahkannya ke array list. Tetapi skrip cerdik; JS menangkap ID lama milik Project ST (komputer kita aslinya saat ini), dan memaksa Note selingannya me-nyalin ID lama tsb (*Pointer Relocation*, misal `ip.newId = existing.id`) jadi anak-anak sub-folder aslinya yang lagi bersiap diproses bakal tidak bingung dia berlabuh kemana dan tidak jadi anak yatim error.
  - Apabila belia, alias Baru/Belum Eksis judulnya: Tancap gas `push(inote)` telan datanya! Selesai. Datamu 100% rapi terkodratkan.

---

# ☁️ BAGIAN Tambahan: `api/ai.js` (Proxy Serverless CORS)

Backend palsu penembus tembok peramban ini merupakan `Node.js` (*CommonJS module `module.exports ...`*).

Karena aplikasimu kini eksklusif ditenagai oleh **NVIDIA NIM**, kodenya sudah aku pangkas bersih dari segala percabangan (`if/else`) provider lain!

### Mekanisme Kerja Proxy Tunggal NVIDIA `ai.js`:
1. **Menerima Header Web (CORS Bypass)**: Browser memaksa cek HTTP Header `OPTIONS`. Dan diresponi oleh `ai.js` kita seakan ia mesin *Server* sah: `res.setHeader('Access-Control-Allow-Origin', '*')` yang mana mengizinkan seluruh domain memakai fungsinya dengan lancar tanpa diblokir.
2. **Menangkap Payload (`req.body`)**: Frontend (*script.js*) melempar data berupa instruksi AI target `system`, sandi sakti `apiKey`, `model`, dan sejarah obrolan `messages` lewat protokol `POST`.
3. **Penyambung Lidah (Eksekutor Node.js)**: Dari alam Node.js / Vercel Serverless ini, tak ada pantangan pemblokiran IP. Ia merakit ulang paket JSON bergaya OpenAI (`messages: [{role:'system'}, ...]`) dan menembakkannya langsung pakai `fetch` ke URL sasaran `https://integrate.api.nvidia.com/v1/chat/completions` sambil menyusupkan kuncimu ke header `Authorization: Bearer`.
4. **Penerjemah Keluar (`res`)**: NVIDIA akan membalas di server. Data kembalian `data.choices[0].message.content` diekstrak dari responnya, lalu dibungkus dan dikembalikan ke antarmuka layar Quill-mu sesederhana: `return res.status(200).json({ text: "Balasan AI Keren Nvidia!" })`.

--- 

### **Inilah cetak biru *(blueprint)* dari titik A-Z.** 
Jika kamu mempreteli berkas berdasarkan urutan ini, kamu bisa membangun Quill Notes atau Aplikasi Web tercanggih lainnya sepenuhnya hanya lewat `Notepad` sederhana kamu dari nol! Selamat bereksplorasi ria! 🎉