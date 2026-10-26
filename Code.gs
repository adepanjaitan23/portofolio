// ID Google Spreadsheet Anda
const SPREADSHEET_ID = '1VP2wEVy7-Di6u9-VAlJX0QmsVQQrjP_fNerMf0kCSZM';

// Username GitHub untuk grafik Contributions
const GITHUB_USERNAME = 'adepanjaitan23';

/**
 * Mengambil data kontribusi GitHub 1 tahun terakhir (data asli).
 * Hasil di-cache 6 jam supaya halaman tetap cepat.
 * Return: { total, contributions: [{date, count, level}] } atau null jika gagal.
 */
function getGithubContributions() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'gh_contrib_' + GITHUB_USERNAME;

  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  try {
    const res = UrlFetchApp.fetch(
      'https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(GITHUB_USERNAME) + '?y=last',
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;

    const raw = JSON.parse(res.getContentText());
    const days = (raw.contributions || []).map(function (d) {
      return {
        date: String(d.date),
        count: Number(d.count) || 0,
        level: Math.min(4, Math.max(0, Number(d.level) || 0))
      };
    });
    if (days.length === 0) return null;

    const out = {
      total: days.reduce(function (sum, d) { return sum + d.count; }, 0),
      contributions: days
    };
    cache.put(cacheKey, JSON.stringify(out), 21600); // 6 jam
    return out;
  } catch (error) {
    Logger.log('Error mengambil kontribusi GitHub: ' + error.toString());
    return null;
  }
}

/**
 * Jalankan fungsi ini sekali untuk membuat sheet dan header secara otomatis.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Definisi struktur sheet dan header yang dibutuhkan
  const schema = {
    'Experience': ['company', 'role', 'type', 'period', 'duration', 'logourl', 'description', 'tags'],
    'Education': ['institution', 'degree', 'period', 'duration', 'description', 'tags'],
    // Kolom A-C (title, year, link) tetap. Kolom detail baru ada di kanan:
    // slug (opsional, otomatis dari title), description (ringkas, untuk kartu), overview (penjelasan panjang),
    // tags (dipisah koma), features (satu fitur per baris / dipisah tanda |), image (cover),
    // github, demo (URL), role, status (mis. Completed / In progress)
    'Projects': ['title', 'year', 'link', 'slug', 'description', 'overview', 'tags', 'features', 'image', 'github', 'demo', 'role', 'status'],
    // link = URL bukti/sertifikat (ikon paperclip), description = detail saat baris dibuka (opsional)
    // rating (opsional, 0-5) menampilkan bintang pada struk di halaman Achievement
    'Awards': ['title', 'prize', 'awardedyear', 'grade', 'link', 'description', 'rating'],
    'Publications': ['title', 'journal', 'publisheddate', 'link'],
    // badgeurl = logo penyedia (daftar Home), certimage = gambar sertifikat (galeri /certs), link = URL sertifikat
    'Certifications': ['title', 'issuer', 'issueddate', 'badgeurl', 'link', 'certimage'],
    // Stack: satu baris = satu kategori. Kolom "items" diisi dipisah koma.
    'Stack': ['category', 'items']
  };

  for (let sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    let headers = schema[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    sheet.getRange(1, 1, 1, headers.length)
         .setBackground('#111111')
         .setFontColor('#ffffff')
         .setFontWeight('bold');
         
    sheet.setFrozenRows(1);
  }

  // Isi data awal sheet Stack (hanya jika masih kosong)
  const stackSheet = ss.getSheetByName('Stack');
  if (stackSheet.getLastRow() <= 1) {
    const defaultStack = [
      ['AI / ML', 'Python, TensorFlow, TensorFlow.js, PyTorch, Keras, Scikit-Learn, OpenCV, Pandas, NumPy, Matplotlib, Streamlit, Librosa, Jupyter Notebook, Hugging Face, Claude, ChatGPT, Gemini'],
      ['Frontend', 'JavaScript, TypeScript, React, Next.js, Tailwind CSS, HTML, CSS, Figma'],
      ['Backend', 'Node.js, SQL, C++, Flask, FastAPI, PostgreSQL, Pgpool-II'],
      ['DevOps / Cloud', 'Google Cloud Platform (GCP), Docker, Linux, Git, GitHub, Visual Studio Code, Networking, Cyber Security']
    ];
    stackSheet.getRange(2, 1, defaultStack.length, 2).setValues(defaultStack);
    stackSheet.setColumnWidth(1, 160);
    stackSheet.setColumnWidth(2, 700);
  }
  
  Logger.log("Database setup berhasil! Semua sheet termasuk Education dan Stack telah dibuat.");
}

/**
 * Mengubah link Google Drive biasa (".../file/d/ID/view" atau "open?id=ID")
 * menjadi URL thumbnail yang bisa dipakai sebagai gambar badge/logo.
 * URL lain dikembalikan apa adanya.
 */
function normalizeImageUrl(url, size) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + (size || 256);
  return url;
}

/** "Lost & Found Portal" -> "lost-found-portal" */
function slugify(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** JSON aman untuk disisipkan ke dalam <script> */
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// Email tujuan untuk form "Get in touch"
const CONTACT_TO = 'aderizkypan@gmail.com';

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * JALANKAN SEKALI dari editor Apps Script (pilih "authorizeMail" lalu Run)
 * untuk menyetujui izin kirim email. Setelah itu deploy ulang sebagai versi baru.
 */
function authorizeMail() {
  Logger.log('Sisa kuota email hari ini: ' + MailApp.getRemainingDailyQuota());
}

/**
 * Dipanggil dari popup surat di website (google.script.run.sendContactMessage).
 * Mengirim email ke CONTACT_TO. Return: { ok: true } atau { ok: false, error: 'invalid' | 'rate' | 'quota' | 'server' }
 */
function sendContactMessage(p) {
  try {
    p = p || {};
    // Honeypot: kolom tersembunyi diisi bot -> pura-pura sukses
    if (String(p.website || '').trim() !== '') return { ok: true };

    const name = String(p.name || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
    const email = String(p.email || '').replace(/[\r\n]+/g, '').trim().slice(0, 120);
    const message = String(p.message || '').trim().slice(0, 2000);
    if (!name || message.length < 5 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'invalid' };
    }

    // Batas kirim: 1 pesan/menit per email dan maksimal 20 pesan/jam secara total
    const cache = CacheService.getScriptCache();
    const key = 'mail_' + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email.toLowerCase())
    );
    if (cache.get(key)) return { ok: false, error: 'rate' };
    const count = parseInt(cache.get('mail_hour') || '0', 10);
    if (count >= 20) return { ok: false, error: 'rate' };
    if (MailApp.getRemainingDailyQuota() < 1) return { ok: false, error: 'quota' };

    const when = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMM yyyy, HH:mm') + ' WIB';
    MailApp.sendEmail({
      to: CONTACT_TO,
      replyTo: email,
      name: 'Portofolio Website',
      subject: '[Portofolio] Pesan baru dari ' + name,
      body: 'Dari: ' + name + ' <' + email + '>\nWaktu: ' + when + '\n\n' + message,
      htmlBody:
        '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6">' +
        '<p style="margin:0 0 4px"><b>Dari:</b> ' + escHtml(name) + ' &lt;' + escHtml(email) + '&gt;</p>' +
        '<p style="margin:0 0 14px;color:#777"><b>Waktu:</b> ' + escHtml(when) + '</p>' +
        '<div style="padding:14px 16px;background:#f6f3ea;border-radius:8px;white-space:pre-wrap">' + escHtml(message) + '</div>' +
        '<p style="margin-top:14px;color:#999;font-size:12px">Balas email ini untuk membalas langsung ke pengirim.</p></div>'
    });

    cache.put(key, '1', 60);
    cache.put('mail_hour', String(count + 1), 3600);
    return { ok: true };
  } catch (err) {
    Logger.log('Error mengirim pesan kontak: ' + err.toString());
    return { ok: false, error: 'server', detail: String(err && err.message ? err.message : err) };
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Membaca semua sheet → objek data (di-cache 5 menit bila ukurannya muat). */
function buildData() {
  let experiences = [], educations = [], projects = [], awards = [], publications = [], certifications = [], stacks = [];

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    function getSheetData(sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return [];
      
      const headers = data[0].map(h => h.toString().toLowerCase().trim());
      const rows = data.slice(1);
      
      return rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          let val = row[index];
          if ((header === 'tags' || header === 'items') && val) {
            obj[header] = val.toString().split(',')
              .map(s => s.trim())
              .filter(s => s !== '');
          } else if (header === 'items') {
            obj[header] = [];
          } else if (header === 'features') {
            obj[header] = val ? val.toString().split(/\r?\n|\|/).map(s => s.trim()).filter(s => s !== '') : [];
          } else if (header === 'certimage' && val) {
            obj[header] = normalizeImageUrl(val.toString().trim(), 1200);
          } else if (header === 'image' && val) {
            obj[header] = normalizeImageUrl(val.toString().trim(), 1200);
          } else if (header === 'tags') {
            obj[header] = [];
          } else if ((header === 'badgeurl' || header === 'logourl') && val) {
            obj[header] = normalizeImageUrl(val.toString().trim());
          } else if (header === 'link' && val) {
            obj[header] = val.toString().trim();
          } else {
            obj[header] = val !== undefined ? val : '';
          }
        });
        return obj;
      });
    }

    experiences = getSheetData('Experience');
    educations = getSheetData('Education');
    projects = getSheetData('Projects')
      .filter(p => p.title && String(p.title).trim() !== '');

    // Slug unik untuk URL detail (?project=slug)
    const usedSlugs = {};
    projects.forEach(function (p, i) {
      p.year = String(p.year === undefined ? '' : p.year);
      let base = slugify(p.slug) || slugify(p.title) || ('project-' + (i + 1));
      let slug = base, n = 2;
      while (usedSlugs[slug]) { slug = base + '-' + (n++); }
      usedSlugs[slug] = true;
      p.slug = slug;
    });
    awards = getSheetData('Awards');
    publications = getSheetData('Publications');
    certifications = getSheetData('Certifications');
    stacks = getSheetData('Stack');

  } catch (error) {
    Logger.log("Error membaca spreadsheet: " + error.toString());
  }

  return { experiences: experiences, educations: educations, projects: projects, awards: awards,
           publications: publications, certifications: certifications, stacks: stacks };
}

/** GET  ?action=data  → seluruh data portofolio (JSON) */
function doGet(e) {
  try {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('porto_data');
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    const txt = JSON.stringify(buildData());
    try { if (txt.length < 95000) cache.put('porto_data', txt, 300); } catch (err) {}
    return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

/** POST (text/plain berisi JSON) → kirim pesan kontak via email */
function doPost(e) {
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return jsonOut(sendContactMessage(p));
  } catch (err) {
    return jsonOut({ ok: false, error: 'server', detail: String(err) });
  }
}
