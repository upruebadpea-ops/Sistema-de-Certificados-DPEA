# Sistema de Certificados DPEA

Aplicación Express preparada para Vercel, con Supabase como base de datos y Google Drive para almacenar los PDF.

## Funciones

- Registro y edición manual de certificados.
- Curso seleccionable o escribible; los cursos nuevos quedan disponibles después.
- Descripción común reutilizable por curso.
- Importación masiva CSV desde Excel.
- PDF institucional limpio, con QR arriba a la derecha y nombre destacado.
- Una subcarpeta de Google Drive por curso.
- Verificación pública, anulación y descarga mediante código.

## Supabase

1. Cree un proyecto y abra **SQL Editor**.
2. Ejecute `supabase/schema.sql` completo.
3. En **Project Settings > API**, copie la URL y `service_role`.
4. Nunca publique `service_role` ni la incluya en Git.

## Google Drive

1. Cree un proyecto de Google Cloud y active **Google Drive API**.
2. Cree una cuenta de servicio y una clave JSON.
3. Comparta la carpeta `CERTIFICADOS` con el correo de la cuenta de servicio como editor.
4. Quite el permiso público de edición de la carpeta.

La carpeta raíz configurada es `1Nph-pc6xfbXL59laggthFDNWfiw1X1aO`. El sistema crea dentro una carpeta por curso.

## Variables

Copie `.env.example` como `.env` y complete `BASE_URL`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_PRIVATE_KEY`.

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

## CSV

Columnas: `codigo,nombre,ci,curso,descripcion,horas,fecha`. Si el código queda vacío, se genera automáticamente.
