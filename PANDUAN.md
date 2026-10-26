# Deploy portofolio ke GitHub Pages (github.io) + Apps Script sebagai API

## Berkas
| Berkas | Tempat | Fungsi |
|---|---|---|
| `Code.gs` | Apps Script | API: GET data sheet (JSON), POST kirim email |
| `index.html` | GitHub repo | Kerangka halaman (CSS, font, Tailwind) |
| `site-template.js` | GitHub repo | Isi halaman (template dari Index lama) |
| `app.js` | GitHub repo | Mengambil data dari API lalu menampilkan halaman |
| `config.js` | GitHub repo | **Isi URL Web App Anda di sini** |
| `.nojekyll` | GitHub repo | Menonaktifkan Jekyll (file kosong) |
| `build.js` | opsional | Membuat ulang `index.html` + `site-template.js` dari HTML baru (`node build.js Index.html`) |

## A. Apps Script (API)
1. Buka project Apps Script lama. Ganti isi `Code.gs` dengan `Code.gs` baru. **Hapus file HTML `Index`** (tidak dipakai lagi).
2. Jalankan `authorizeMail` sekali → setujui izin (email + spreadsheet).
3. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone* → Deploy.
4. Salin URL berakhiran `/exec`. Tes di browser: `URL/exec` harus menampilkan JSON data.
   Setiap mengubah kode, buat **New version** pada deployment yang sama (URL tetap).

## B. GitHub Pages
1. Buat repo **publik** bernama `USERNAME.github.io` (alamat: `https://USERNAME.github.io/`).
2. Edit `config.js`: ganti `GANTI_DENGAN_ID_DEPLOYMENT` dengan URL `/exec` Anda.
3. Upload `index.html`, `site-template.js`, `app.js`, `config.js`, `.nojekyll` ke root repo (Add file → Upload files → Commit).
4. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, Branch `main`, folder `/ (root)` → Save.
5. Tunggu 1–2 menit, buka `https://USERNAME.github.io/`.

## C. Cek
- Home tampil, navbar `/projects`, `/achievement`, `/certs` berpindah (memakai `?page=...`, tidak perlu 404.html).
- Form "Get in touch" mengirim email. Jika gagal: pastikan deployment *Anyone* dan versi terbaru.
- Data pertama kali tampil dari server (1–3 dtk); kunjungan berikutnya instan dari cache browser, data baru tampil di kunjungan berikutnya.

## Catatan
- Perubahan di Google Sheet muncul dalam ±5 menit (cache server).
- Mengubah HTML: kirim versi baru ke saya, atau jalankan `node build.js Index.html`, lalu upload ulang `index.html` + `site-template.js`.
- Domain sendiri nanti: tambah file `CNAME` berisi domain Anda + atur DNS; tidak ada perubahan kode.
