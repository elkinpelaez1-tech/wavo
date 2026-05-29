# Estado de Depuración - Wavo (Meta API)

**Contexto del Problema:**
Meta responde aparentemente con éxito (200 OK) al enviar mensajes de WhatsApp, pero el mensaje no llega al usuario final en ciertos casos.

**Cambios Realizados (Localmente):**
1. **`apps/api/src/meta/meta.service.ts`**:
   - Se agregaron logs completos antes de la petición (`this.baseUrl`, `META_PHONE_NUMBER_ID`, `payload` exacto en JSON).
   - Se agregaron logs completos después de la petición (`response.data` de Meta).
   - Se agregaron logs completos en el `catch` para atrapar cualquier error silencioso.
   - **Prueba aislada**: Se forzó el uso de una URL de imagen pública y estable (logo de React) siempre que se envíe una imagen, para descartar bloqueos de infraestructura o accesibilidad.

2. **`apps/api/src/workers/message.worker.ts`**:
   - Se agregó una validación estricta: Si la respuesta de Meta no contiene `messages[0].id`, el worker lanza un error crítico. Esto envía la tarea al `catch`, marcándola como fallida y evitando falsos positivos en el dashboard.

**Siguientes Pasos (Pendiente para la próxima sesión):**
Estamos a la espera de que WhatsApp realice la verificación de la empresa.
Una vez aprobada la verificación, retomaremos las pruebas controladas (idealmente en el entorno local con `npm run dev:api`) para monitorear el flujo y revisar la respuesta final de Meta, confirmando si el mensaje ya llega físicamente a los dispositivos.

*Nota para el asistente (IA) futuro: Al reanudar, lee este archivo para retomar el contexto exacto. El entorno `.env` local ya fue configurado correctamente con la base Redis de producción para permitir pruebas locales precisas en cuanto Meta apruebe la cuenta.*
