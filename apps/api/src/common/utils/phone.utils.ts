/**
 * Normaliza un número de teléfono para WhatsApp.
 * Elimina espacios, "+", "-", "()", y caracteres no numéricos.
 * Retorna el formato internacional limpio: e.g. 573001234567
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Limpiar caracteres comunes
  const clean = phone.toString().replace(/[\s\+\-\(\)]/g, '').replace(/\D/g, '');
  
  // Si quedó vacío pero el original tenía algo, intentar al menos quitar espacios
  if (!clean && phone) {
    return phone.toString().trim();
  }
  
  return clean;
}

