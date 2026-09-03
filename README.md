# Sistema de Certificados DPEA

Aplicación web independiente para registrar, generar y validar certificados de la División de Planificación y Evaluación Académica.

## Funciones

- Panel administrativo protegido por usuario y contraseña.
- Alta y edición manual.
- Importación masiva desde CSV preparado en Excel.
- Base de datos SQLite.
- Código único por certificado.
- PDF institucional generado automáticamente.
- QR dentro del PDF que abre la validación pública.
- Consulta pública por código.
- Anulación y reactivación sin eliminar el historial.
- CI parcialmente oculto en la página pública.
- Enlace permanente al sitio oficial de la DPEA.

## Instalación local

```bash
npm install
copy .env.example .env
npm start
```

Abra `http://localhost:3000`. El usuario inicial del ejemplo es `admin` y la contraseña es `Cambiar123!`; deben cambiarse antes de publicar.

## Configuración

Edite `.env`:

- `BASE_URL`: dirección pública final, por ejemplo `https://certificados.planificacionacademica.usfx.bo`.
- `SESSION_SECRET`: texto aleatorio largo.
- `ADMIN_USER` y `ADMIN_PASSWORD`: credenciales administrativas.
- `OFFICIAL_URL`: página institucional.

La base se crea automáticamente en `data/certificados.db`. Los PDF quedan en `storage/certificates`.

## Importación

El panel permite descargar una plantilla CSV. Las columnas son:

```text
codigo,nombre,ci,evento,horas,fecha
```

El código puede quedar vacío. Cada fila válida crea el registro y genera su PDF con QR.

## Producción

Se recomienda desplegar detrás de HTTPS con Nginx o una plataforma compatible como Render/Railway, montar `data/` y `storage/` en un volumen persistente y programar copias de seguridad. Para que el QR use el dominio institucional se debe configurar `BASE_URL` antes de emitir los PDF.

Google Drive puede añadirse como almacenamiento remoto en una segunda etapa; la versión actual mantiene archivos y base en el servidor para funcionar sin depender de cuentas personales.
