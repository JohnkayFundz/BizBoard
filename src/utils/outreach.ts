export function normalizeWhatsAppPhone(value: string | null | undefined): string {
  let phone = String(value ?? '').replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '234' + phone.slice(1)
  return phone
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = normalizeWhatsAppPhone(phone)
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

export function buildMailtoUrl(email: string, subject: string, message: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
}

export function buildInstagramInboxUrl(): string {
  return 'https://instagram.com/direct/inbox/'
}
