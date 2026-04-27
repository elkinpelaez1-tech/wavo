/**
 * Normaliza un número de teléfono para WhatsApp.
 * Elimina espacios, "+", "-", "()", y caracteres no numéricos.
 * Retorna el formato internacional limpio: e.g. 573001234567
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\+\-\(\)]/g, '').replace(/\D/g, '');
}
