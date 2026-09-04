const CONFIG = {
  spreadsheetId: '1gLBe-us2BdKU4HjTbWzYu1Az31NXldV7w0qwCZ-uWgk',
  sheetId: 686160510,
  firstDataRow: 2
};

function doGet(event) {
  const query = normalize_(event && event.parameter ? event.parameter.codigo : '');
  const result = query ? findCertificates_(query) : { type: '', certificates: [] };
  const template = HtmlService.createTemplate(HTML_);
  template.query = query;
  template.result = result;
  return template.evaluate().setTitle('Verificación de certificado')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function findCertificates_(query) {
  const book = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = book.getSheets().find(item => item.getSheetId() === CONFIG.sheetId);
  if (!sheet) throw new Error('No se encontró la pestaña principal configurada.');
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < CONFIG.firstDataRow) return { type: '', certificates: [] };

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(normalize_);
  const rows = sheet.getRange(CONFIG.firstDataRow, 1, lastRow - CONFIG.firstDataRow + 1, lastColumn).getDisplayValues();
  const headerIndex = names => headers.findIndex(header => names.map(normalize_).includes(header));
  const documentIndex = headerIndex(['C.I.', 'CI', 'DOCUMENTO', 'DOCUMENTO (CI)']);
  const read = (row, names) => { const index = headerIndex(names); return index >= 0 ? row[index] || '' : ''; };
  const makeCertificate = row => ({
    code: row[0] || '',
    fullName: read(row, ['NOMBRE COMPLETO', 'NOMBRE', 'PARTICIPANTE']),
    documentId: read(row, ['C.I.', 'CI', 'DOCUMENTO', 'DOCUMENTO (CI)']),
    course: read(row, ['EVENTO / CURSO', 'CURSO', 'EVENTO']),
    hours: read(row, ['CARGA HORARIA', 'HORAS']),
    issueDate: read(row, ['FECHA EMISIÓN', 'FECHA DE EMISIÓN', 'FECHA']),
    pdfUrl: read(row, ['ENLACE DEL CERTIFICADO', 'ENLACE', 'LINK CERTIFICADO'])
  });

  const codeMatch = rows.filter(row => normalize_(row[0]) === query);
  if (codeMatch.length) return { type: 'code', certificates: codeMatch.map(makeCertificate) };
  const documentMatch = documentIndex >= 0 ? rows.filter(row => normalize_(row[documentIndex]) === query) : [];
  return { type: 'document', certificates: documentMatch.map(makeCertificate) };
}

function normalize_(value) {
  return String(value || '').trim().toUpperCase();
}

const HTML_ = `<!doctype html>
<html lang="es"><head><base target="_top"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:#17213d;font:16px Arial,sans-serif}.box{max-width:850px;margin:auto;padding:18px}.panel{padding:24px;background:#fff;border:1px solid #e0e5ed;border-radius:14px;box-shadow:0 7px 22px rgba(16,42,87,.08)}.search{display:flex;gap:9px}.search input{flex:1;min-width:0;padding:12px;border:1px solid #b8c1d0;border-radius:6px;font-size:16px}.search button,.download{padding:12px 18px;border:0;border-radius:6px;background:#1555a6;color:#fff;font-weight:bold;text-decoration:none;cursor:pointer}.verified{margin:-24px -24px 22px;padding:16px 20px;border-radius:14px 14px 0 0;background:#177543;color:#fff;text-align:center;font-size:20px;font-weight:700;letter-spacing:.2px}.details,.results{width:100%;border-collapse:collapse}.details th,.details td,.results th,.results td{padding:13px 11px;border-bottom:1px solid #dde5dd;text-align:left;vertical-align:top}.details th{width:34%;font-weight:700;color:#1c365b}.details td{font-weight:700}.download{display:inline-block;margin-top:18px;background:#177543}.other-search{margin-top:24px;padding-top:20px;border-top:1px solid #e0e5ed}.other-search label{display:block;margin-bottom:8px;font-weight:700;color:#1c365b}.results{margin-top:16px}.results th{background:#edf2f7;color:#1c365b}.invalid{padding:18px;color:#971b1b;background:#fff3f3;border-left:4px solid #bb2222;border-radius:6px}@media(max-width:520px){.box{padding:10px}.panel{padding:18px}.verified{margin:-18px -18px 18px}.search{display:block}.search button{width:100%;margin-top:8px}.details th{width:43%}.results th,.results td{padding:9px 6px;font-size:13px}}
</style></head><body><div class="box"><div class="panel">
<? if (!query) { ?><form class="search" method="get"><input type="hidden" name="embed" value="1"><input name="codigo" required placeholder="Código QR o C.I." autocomplete="off"><button type="submit">Buscar</button></form><? } ?>
<? if (query && result.type === 'code' && result.certificates.length) { ?><? const certificate = result.certificates[0]; ?><div class="verified">✓ CERTIFICADO VERIFICADO</div><table class="details"><tr><th>TITULAR:</th><td><?= certificate.fullName ?></td></tr><tr><th>DOCUMENTO (CI):</th><td><?= certificate.documentId ?></td></tr><tr><th>EVENTO / CURSO:</th><td><?= certificate.course ?></td></tr><tr><th>CARGA HORARIA:</th><td><?= certificate.hours ?></td></tr><tr><th>FECHA EMISIÓN:</th><td><?= certificate.issueDate ?></td></tr></table><? if (certificate.pdfUrl) { ?><a class="download" href="<?= certificate.pdfUrl ?>" target="_blank" rel="noopener">Descargar certificado</a><? } ?><form class="other-search" method="get"><input type="hidden" name="embed" value="1"><label>Buscar otros certificados por C.I.</label><div class="search"><input name="codigo" required placeholder="Ingrese el C.I."><button type="submit">Buscar por C.I.</button></div></form><? } ?>
<? if (query && result.type === 'document' && result.certificates.length) { ?><form class="other-search" method="get"><input type="hidden" name="embed" value="1"><label>Buscar otros certificados por C.I.</label><div class="search"><input name="codigo" required value="<?= query ?>" placeholder="Ingrese el C.I."><button type="submit">Buscar por C.I.</button></div></form><table class="results"><thead><tr><th>EVENTO / CURSO</th><th>CARGA HORARIA</th><th>FECHA EMISIÓN</th><th>CERTIFICADO</th></tr></thead><tbody><? result.certificates.forEach(function(certificate) { ?><tr><td><?= certificate.course ?></td><td><?= certificate.hours ?></td><td><?= certificate.issueDate ?></td><td><? if (certificate.pdfUrl) { ?><a href="<?= certificate.pdfUrl ?>" target="_blank" rel="noopener">Descargar</a><? } ?></td></tr><? }); ?></tbody></table><? } ?>
<? if (query && !result.certificates.length) { ?><div class="invalid">Certificado no encontrado.</div><? } ?>
</div></div></body></html>`;
