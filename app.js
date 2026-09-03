require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { parse } = require('csv-parse/sync');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Database = require('better-sqlite3');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CERT_DIR = path.join(ROOT, 'storage', 'certificates');
const IMPORT_DIR = path.join(ROOT, 'storage', 'imports');
[DATA_DIR, CERT_DIR, IMPORT_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

const app = express();
const db = new Database(path.join(DATA_DIR, 'certificados.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    document_id TEXT DEFAULT '',
    event_name TEXT NOT NULL,
    hours TEXT DEFAULT '',
    issue_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VALIDO' CHECK(status IN ('VALIDO','ANULADO')),
    pdf_filename TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_certificates_name ON certificates(full_name);
  CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);
`);

const upload = multer({
  dest: IMPORT_DIR,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.(csv)$/i.test(file.originalname))
});

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/certificados', express.static(CERT_DIR, { fallthrough: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'solo-desarrollo-cambiar',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.institution = process.env.INSTITUTION_NAME || 'División de Planificación y Evaluación Académica';
  res.locals.officialUrl = process.env.OFFICIAL_URL || 'https://planificacionacademica.usfx.bo/';
  res.locals.baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.locals.user = req.session.user || null;
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/admin/login');
  next();
}

function makeCode() {
  return `DPEA-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function clean(value, max = 250) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeRow(row) {
  const keys = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  return {
    code: clean(keys.codigo || keys.código || keys.code || makeCode(), 60).toUpperCase(),
    full_name: clean(keys.nombre || keys.participante || keys.full_name),
    document_id: clean(keys.ci || keys.documento || keys.document_id, 80),
    event_name: clean(keys.evento || keys.curso || keys.event_name),
    hours: clean(keys.horas || keys['carga horaria'] || keys.hours, 80),
    issue_date: clean(keys.fecha || keys['fecha emisión'] || keys.issue_date || new Date().toISOString().slice(0, 10), 30)
  };
}

async function generatePdf(cert) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0, 79 / 255, 159 / 255);
  const red = rgb(227 / 255, 6 / 255, 19 / 255);
  const logoPath = path.join(ROOT, 'public', 'logo-dpea.png');
  if (fs.existsSync(logoPath)) {
    const logo = await pdf.embedPng(fs.readFileSync(logoPath));
    page.drawImage(logo, { x: 48, y: 485, width: 110, height: 48 });
  }
  page.drawRectangle({ x: 18, y: 18, width: 806, height: 559, borderColor: blue, borderWidth: 5 });
  page.drawRectangle({ x: 29, y: 29, width: 784, height: 537, borderColor: red, borderWidth: 1 });
  const center = (text, y, size, font = regular, color = rgb(0.1, 0.1, 0.1)) => {
    let fitted = size;
    while (font.widthOfTextAtSize(text, fitted) > 720 && fitted > 10) fitted -= 0.5;
    const width = font.widthOfTextAtSize(text, fitted);
    page.drawText(text, { x: (842 - width) / 2, y, size: fitted, font, color });
  };
  center('UNIVERSIDAD MAYOR, REAL Y PONTIFICIA DE SAN FRANCISCO XAVIER', 525, 13, bold, blue);
  center('DIVISIÓN DE PLANIFICACIÓN Y EVALUACIÓN ACADÉMICA', 498, 15, bold, blue);
  center('CERTIFICADO', 425, 34, bold, red);
  center('Se otorga el presente certificado a:', 376, 16);
  center(cert.full_name.toUpperCase(), 330, 25, bold, blue);
  center(`Por su participación en: ${cert.event_name}`, 280, 15);
  if (cert.hours) center(`Carga horaria: ${cert.hours}`, 248, 13);
  center(`Fecha de emisión: ${cert.issue_date}`, 214, 12);
  center(`Código: ${cert.code}`, 68, 10, bold);

  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verificar/${encodeURIComponent(cert.code)}`;
  const qrData = await QRCode.toDataURL(verifyUrl, { width: 360, margin: 1, errorCorrectionLevel: 'H' });
  const qr = await pdf.embedPng(Buffer.from(qrData.split(',')[1], 'base64'));
  page.drawImage(qr, { x: 685, y: 48, width: 105, height: 105 });
  page.drawText('Escanee para validar', { x: 689, y: 36, size: 8, font: regular, color: blue });
  return Buffer.from(await pdf.save());
}

async function createPdfFor(cert) {
  const safeCode = cert.code.replace(/[^A-Z0-9_-]/gi, '_');
  const filename = `${safeCode}.pdf`;
  fs.writeFileSync(path.join(CERT_DIR, filename), await generatePdf(cert));
  db.prepare('UPDATE certificates SET pdf_filename=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(filename, cert.id);
  return filename;
}

app.get('/', (_req, res) => res.render('home'));
app.get('/buscar', (req, res) => {
  const code = clean(req.query.codigo, 60);
  if (!code) return res.redirect('/');
  res.redirect(`/verificar/${encodeURIComponent(code)}`);
});

app.get('/verificar/:code', (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE UPPER(code)=UPPER(?)').get(clean(req.params.code, 60));
  res.status(cert ? 200 : 404).render('verify', { cert });
});

app.get('/admin/login', (_req, res) => res.render('login', { error: null }));
app.post('/admin/login', async (req, res) => {
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const configured = process.env.ADMIN_PASSWORD || 'Cambiar123!';
  const ok = clean(req.body.username, 100) === expectedUser && await bcrypt.compare(clean(req.body.password, 200), await bcrypt.hash(configured, 10));
  if (!ok) return res.status(401).render('login', { error: 'Usuario o contraseña incorrectos.' });
  req.session.user = expectedUser;
  res.redirect('/admin');
});
app.post('/admin/logout', requireAuth, (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/admin', requireAuth, (req, res) => {
  const q = clean(req.query.q);
  const certs = q
    ? db.prepare('SELECT * FROM certificates WHERE code LIKE ? OR full_name LIKE ? OR event_name LIKE ? ORDER BY id DESC LIMIT 500').all(...Array(3).fill(`%${q}%`))
    : db.prepare('SELECT * FROM certificates ORDER BY id DESC LIMIT 500').all();
  const stats = db.prepare("SELECT COUNT(*) total, SUM(status='VALIDO') validos, SUM(status='ANULADO') anulados FROM certificates").get();
  res.render('admin', { certs, q, stats });
});

app.get('/admin/nuevo', requireAuth, (_req, res) => res.render('form', { cert: null, error: null }));
app.post('/admin/nuevo', requireAuth, async (req, res) => {
  const cert = normalizeRow(req.body);
  if (!cert.full_name || !cert.event_name) return res.status(400).render('form', { cert, error: 'Nombre y evento son obligatorios.' });
  try {
    const info = db.prepare('INSERT INTO certificates(code,full_name,document_id,event_name,hours,issue_date) VALUES(?,?,?,?,?,?)')
      .run(cert.code, cert.full_name, cert.document_id, cert.event_name, cert.hours, cert.issue_date);
    const saved = db.prepare('SELECT * FROM certificates WHERE id=?').get(info.lastInsertRowid);
    await createPdfFor(saved);
    req.session.message = `Certificado ${saved.code} creado correctamente.`;
    res.redirect('/admin');
  } catch (error) {
    res.status(400).render('form', { cert, error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'El código ya existe.' : error.message });
  }
});

app.get('/admin/:id/editar', requireAuth, (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE id=?').get(req.params.id);
  if (!cert) return res.sendStatus(404);
  res.render('form', { cert, error: null });
});
app.post('/admin/:id/editar', requireAuth, async (req, res) => {
  const cert = normalizeRow(req.body);
  cert.status = req.body.status === 'ANULADO' ? 'ANULADO' : 'VALIDO';
  try {
    db.prepare('UPDATE certificates SET code=?,full_name=?,document_id=?,event_name=?,hours=?,issue_date=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(cert.code, cert.full_name, cert.document_id, cert.event_name, cert.hours, cert.issue_date, cert.status, req.params.id);
    await createPdfFor(db.prepare('SELECT * FROM certificates WHERE id=?').get(req.params.id));
    req.session.message = 'Certificado actualizado y PDF regenerado.';
    res.redirect('/admin');
  } catch (error) { res.status(400).render('form', { cert: { ...cert, id: req.params.id }, error: error.message }); }
});

app.post('/admin/:id/estado', requireAuth, (req, res) => {
  const status = req.body.status === 'ANULADO' ? 'ANULADO' : 'VALIDO';
  db.prepare('UPDATE certificates SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  req.session.message = `Estado cambiado a ${status}.`;
  res.redirect('/admin');
});

app.get('/admin/importar', requireAuth, (_req, res) => res.render('import', { result: null, error: null }));
app.post('/admin/importar', requireAuth, upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).render('import', { result: null, error: 'Seleccione un archivo CSV.' });
  let rows;
  try { rows = parse(fs.readFileSync(req.file.path), { columns: true, skip_empty_lines: true, trim: true, bom: true }); }
  catch (error) { fs.unlinkSync(req.file.path); return res.status(400).render('import', { result: null, error: `CSV inválido: ${error.message}` }); }
  fs.unlinkSync(req.file.path);
  let created = 0, skipped = 0;
  for (const row of rows) {
    const cert = normalizeRow(row);
    if (!cert.full_name || !cert.event_name) { skipped++; continue; }
    try {
      const info = db.prepare('INSERT INTO certificates(code,full_name,document_id,event_name,hours,issue_date) VALUES(?,?,?,?,?,?)')
        .run(cert.code, cert.full_name, cert.document_id, cert.event_name, cert.hours, cert.issue_date);
      await createPdfFor(db.prepare('SELECT * FROM certificates WHERE id=?').get(info.lastInsertRowid));
      created++;
    } catch (_error) { skipped++; }
  }
  res.render('import', { result: { total: rows.length, created, skipped }, error: null });
});

app.get('/admin/plantilla.csv', requireAuth, (_req, res) => {
  res.type('text/csv').attachment('plantilla-certificados.csv').send('\uFEFFcodigo,nombre,ci,evento,horas,fecha\n,Nombre completo,1234567,Nombre del evento,40,2026-09-03\n');
});

app.use((_req, res) => res.status(404).render('404'));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).send('Ocurrió un error interno.'); });

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Sistema DPEA disponible en http://localhost:${port}`));
