# Sistema de Certificados DPEA

Aplicación Express preparada para Vercel, con Supabase como base de datos, Google Drive para almacenar los PDF y Google Sheets como registro por curso.

## Funciones

- Registro y edición manual de certificados.
- Curso seleccionable o escribible; los cursos nuevos quedan disponibles después.
- Descripción común reutilizable por curso.
- Importación masiva CSV desde Excel.
- PDF institucional limpio, con QR arriba a la derecha y nombre destacado.
- Hasta cinco firmas PNG, con nombre, cargo e institución opcionales.
- Una subcarpeta de Google Drive por curso.
- Una pestaña de Google Sheets por curso con nombre, C.I., enlace al PDF y fecha de finalización.
- Verificación pública, anulación y descarga mediante código.

## Supabase

1. Cree un proyecto y abra **SQL Editor**.
2. Ejecute `supabase/schema.sql` completo.
3. En **Project Settings > API**, copie la URL y `service_role`.
4. Nunca publique `service_role` ni la incluya en Git.

## Google Drive y Google Sheets

1. En el proyecto de Google Cloud, active **Google Drive API** y **Google Sheets API**.
2. Configure las credenciales OAuth de tipo **Aplicación web** con la URL de redirección `BASE_URL/auth/google/callback`.
3. Inicie sesión en el panel y pulse **Conectar Google**. Acepte los permisos de Drive y Sheets.
4. El sistema crea el archivo `Registro de certificados DPEA` en la carpeta raíz. Cada curso tendrá allí su propia pestaña.

La carpeta raíz configurada es `1Nph-pc6xfbXL59laggthFDNWfiw1X1aO`. El sistema crea dentro una carpeta por curso.

## Variables

Copie `.env.example` como `.env` y complete `BASE_URL`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_CALLBACK_URL`.

## Desarrollo

```powershell
npm install
Copy-Item .env.example .env
npm start
```

## Vercel

1. Importe el repositorio en Vercel.
2. No configure Build Command ni Output Directory.
3. Copie las variables de `.env.example` en **Settings > Environment Variables**.
4. Use la URL final de Vercel como `BASE_URL` y vuelva a desplegar antes de emitir certificados.
5. Configure `OFFICIAL_VERIFY_URL=https://planificacionacademica.usfx.bo/verificar-certificado/` para que el QR abra la página oficial.
6. Para que WordPress valide siempre directamente contra la columna A de `Hoja 1`, implemente `wordpress/google-apps-script-verificador.gs` como Aplicación web de Google y pegue `wordpress/verificador-certificado-divi.html` en el módulo Código de Divi. Reemplace allí la URL `/exec` de Apps Script. El verificador no publica una lista: solo busca el código exacto recibido.

## CSV

Columnas: `codigo,nombre,ci,curso,descripcion,horas,fecha,fecha_fin`. Si el código queda vacío, se genera automáticamente.
