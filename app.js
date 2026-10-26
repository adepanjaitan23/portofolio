(function () {
  'use strict';
  var CACHE_KEY = 'porto_data_v1';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeJson(v) { return JSON.stringify(v).replace(/</g, '\\u003c').replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029'); }

  // Kompiler template bergaya Apps Script: <? kode ?>, <?= teks-aman ?>, <?!= mentah ?>
  function compile(tpl) {
    var re = /<\?(!?=?)([\s\S]*?)\?>/g, code = 'var __o="";\n', last = 0, m;
    while ((m = re.exec(tpl))) {
      code += '__o+=' + JSON.stringify(tpl.slice(last, m.index)) + ';\n';
      if (m[1] === '=') code += '__o+=__esc(' + m[2] + ');\n';
      else if (m[1] === '!=') code += '__o+=(' + m[2] + ');\n';
      else code += m[2] + '\n';
      last = re.lastIndex;
    }
    code += '__o+=' + JSON.stringify(tpl.slice(last)) + ';\nreturn __o;';
    return new Function('__esc', 'D', 'with(D){' + code + '}');
  }

  function initialRoute() {
    var sp = new URLSearchParams(location.search), pg = sp.get('page');
    if (sp.get('project')) return { view: 'project', slug: sp.get('project') };
    if (pg === 'projects') return { view: 'projects', slug: '' };
    if (pg === 'achievement' || pg === 'achievements') return { view: 'achievements', slug: '' };
    if (pg === 'certs') return { view: 'certs', slug: '' };
    return { view: 'home', slug: '' };
  }

  // URL logo LinkedIn (licdn) bertanda tangan & kedaluwarsa → ganti favicon situs penerbit
  function fixLogo(u) {
    u = String(u || '');
    if (!/licdn\.com/i.test(u)) return u;
    var m = [['google_logo', 'google.com'], ['dicoding_logo', 'dicoding.com'], ['coursera', 'coursera.org'], ['credly', 'credly.com']];
    for (var i = 0; i < m.length; i++) if (u.toLowerCase().indexOf(m[i][0]) > -1) return 'https://www.google.com/s2/favicons?domain=' + m[i][1] + '&sz=128';
    return '';
  }
  function fixData(d) {
    ['certifications', 'experiences', 'educations', 'awards', 'publications'].forEach(function (k) {
      (d[k] || []).forEach(function (r) { if (r.badgeurl) r.badgeurl = fixLogo(r.badgeurl); if (r.logourl) r.logourl = fixLogo(r.logourl); });
    });
    return d;
  }

  function render(data) {
    data = fixData(data);
    var base = location.origin + location.pathname;
    var D = {
      experiences: data.experiences || [], educations: data.educations || [], projects: data.projects || [],
      awards: data.awards || [], publications: data.publications || [], certifications: data.certifications || [],
      stacks: data.stacks || [], baseUrl: base, baseUrlJson: safeJson(base),
      projectsJson: safeJson(data.projects || []), initialRouteJson: safeJson(initialRoute())
    };
    document.body.innerHTML = compile(window.__TPL)(esc, D);
    // Jalankan ulang <script> inline yang tadinya inert
    var scripts = Array.prototype.slice.call(document.body.querySelectorAll('script'));
    scripts.forEach(function (old) {
      var s = document.createElement('script');
      if (old.src) s.src = old.src; else s.text = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
    // Pengganti google.script.run → kirim ke API Apps Script (text/plain agar tanpa preflight CORS)
    window.sendMailToServer = function (d) {
      return fetch(window.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json(); })
        .then(function (r) { return r && r.ok ? { ok: true } : { ok: false, error: (r && r.error) || 'server', detail: (r && r.detail) || '' }; })
        .catch(function (e) { return { ok: false, error: 'server', detail: String(e && e.message || e) }; });
    };
    // Bila halaman masih 'loading' (render dari cache), DOMContentLoaded asli akan terpanggil sendiri → jangan dobel
    if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) {}
  var started = false;
  function start(d) { if (started) return; started = true; render(d); }
  if (cached) start(cached); // tampil instan dari cache kunjungan sebelumnya

  fetch(window.API_URL + '?action=data')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || d.error) throw new Error((d && d.error) || 'bad response');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
      start(d); // jika cache ada, data baru dipakai pada kunjungan berikutnya
    })
    .catch(function (err) {
      if (!started) document.getElementById('boot').textContent = 'Gagal memuat data. Periksa API_URL di config.js. (' + err.message + ')';
    });
})();
