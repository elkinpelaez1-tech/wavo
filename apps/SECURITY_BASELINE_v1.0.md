# Línea Base de Seguridad (Security Baseline) - Viatra.pro
**Versión:** 1.0  
**Proyecto:** Viatra.pro (`imvzqhralrweiviepfej`)  
**Fecha de actualización:** Julio 2026  

---

## 1. Propósito y Alcance
Este documento define la línea base de controles de seguridad, directrices y excepciones técnicas y de arquitectura aplicadas al proyecto **Viatra.pro**, incluyendo el clúster de base de datos en Supabase, la API REST (PostgREST) y el código de la aplicación.

---

## 2. Controles Generales de Base de Datos
* **Row Level Security (RLS):** Toda tabla del esquema `public` que almacene datos de usuarios, clientes, transacciones, perfiles, servicios o configuración del negocio debe tener `ROW LEVEL SECURITY` habilitado y contar con políticas explícitas (`FOR SELECT`, `INSERT`, `UPDATE`, `DELETE`) aplicando el principio de mínimo privilegio.
* **Funciones de Base de Datos (`search_path`):** Las funciones `SECURITY DEFINER` o ubicadas en el esquema público deben definir explícitamente `SET search_path = public` o tener sus permisos de invocación (`EXECUTE`) controlados y auditados para prevenir ataques de inyección y suplantación del path de búsqueda.

---

## 3. Riesgos aceptados y excepciones documentadas

### Excepción 1: Alerta de RLS en `public.spatial_ref_sys` (PostGIS)
* **Objeto:** Tabla `public.spatial_ref_sys` en el clúster de base de datos Supabase de Viatra.pro (`imvzqhralrweiviepfej`).
* **Alerta detectada (Supabase Security Advisor):** `rls_disabled_in_public_public_spatial_ref_sys` (*RLS Disabled in Public*).
* **Clasificación del riesgo:** **Falso positivo / Riesgo Aceptado (Excepción formal documentada)**.
* **Justificación técnica y arquitectónica:**
  1. **Naturaleza y administración del objeto:** La tabla `spatial_ref_sys` es un objeto del sistema administrado automáticamente por la extensión **PostGIS (v3.3.7)** y propiedad exclusiva del rol administrativo del clúster (`supabase_admin`). Su función es proveer un catálogo estándar universal de exactamente 8,500 registros con definiciones geodésicas de Sistemas de Referencia de Coordenadas (códigos EPSG, cadenas PROJ4 y WKT).
  2. **Cero almacenamiento de datos de negocio o personales:** La tabla no almacena información de negocio, clientes, perfiles técnicos (`technical_profiles`), geolocalización privada de servicios (`services`), transacciones financieras (`payments`) ni datos personales susceptibles de protección (PII). Todo su contenido es conocimiento científico 100% público.
  3. **Preservación de la compatibilidad con futuras actualizaciones de la extensión:** **No se habilita Row Level Security (`ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;`) ni se alteran sus propiedades de propiedad (`owner`) para preservar la integridad del gestor de extensiones de PostgreSQL (`pg_extension`).** Modificar propiedades estructurales de una tabla administrada por una extensión causa que las futuras actualizaciones y migraciones del motor PostGIS (`SELECT postgis_extensions_upgrade();`) fallen con errores de violación de política o bloqueo de privilegios.
  4. **Aplicación estricta del principio de mínimo privilegio:** Para proteger el catálogo contra intentos de modificación sin alterar las dependencias estructurales del motor PostGIS ni forzar RLS, se aplicó la revocación de permisos de escritura desde la capa de la API REST (PostgREST):
     ```sql
     REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys FROM anon, authenticated;
     GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated, service_role;
     ```
* **Directriz para futuras auditorías técnicas:** Esta alerta en el *Supabase Security Advisor* debe considerarse una **excepción consciente, aprobada y plenamente justificada**. No se debe intentar activar RLS ni modificar la tabla en futuras verificaciones para garantizar que el clúster pueda actualizar de forma limpia y continua la extensión PostGIS sin interrupciones operativas.
