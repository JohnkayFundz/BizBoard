export function normalizeContactAddresses(addresses: unknown): string[] {
  if (!Array.isArray(addresses)) return []

  const clean = (input: unknown): string | null => {
    if (typeof input !== 'string') return null

    let value = input
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    value = value
      .replace(/\s+(?:Phone|Tel|Telephone|Mobile|WhatsApp|Email|E-mail)\s*:?\s*.*$/i, '')
      .replace(/\s+\bCONNECT\b\s*.*$/i, '')
      .replace(/\[[^\]]+@[^\]]+\]/g, '')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (/(?:^|\s)(?:Phone|Tel|Telephone|Mobile|WhatsApp|Email|E-mail)\s*:/i.test(value)) return null
    if (/\b(?:CONNECT|mailto:|tel:)\b/i.test(value)) return null
    if (/(?:\+?234|0)\d[\d\s().-]{8,}/.test(value)) return null
    if (value.length < 8 || value.length > 150) return null

    value = value
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s*[,;|:-]+|[,;|:-]+\s*$/g, '')
      .trim()

    value = value
      .replace(/\b(Ojodu Berger)\s+(?=Ikeja\b)/i, '$1, ')
      .replace(/\b(Ikeja)\s+(?=Lagos State\b)/i, '$1, ')
      .replace(/\b(Lagos State)\s+(?=Nigeria\b)/i, '$1, ')
      .replace(/\b(Abuja)\s+(?=Nigeria\b)/i, '$1, ')
      .replace(/\b(FCT)\s+(?=Nigeria\b)/i, '$1, ')
      .trim()

    return value || null
  }

  const tokenStopWords = new Set([
    'no', 'number', 'plot', 'suite', 'shop', 'the', 'and', 'of', 'in', 'at',
    'street', 'st', 'road', 'rd', 'avenue', 'ave', 'close', 'crescent', 'cres',
    'way', 'drive', 'dr', 'lane', 'ln', 'boulevard', 'blvd', 'estate', 'phase',
    'lagos', 'lagosstate', 'nigeria', 'state', 'fct',
  ])

  const tokens = (value: string) => new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 3 && !tokenStopWords.has(token))
  )

  const overlaps = (a: string, b: string) => {
    const aTokens = tokens(a)
    const bTokens = tokens(b)
    if (!aTokens.size || !bTokens.size) return false

    const smaller = aTokens.size <= bTokens.size ? aTokens : bTokens
    const larger = aTokens.size <= bTokens.size ? bTokens : aTokens
    let shared = 0
    for (const token of smaller) if (larger.has(token)) shared += 1

    return shared === smaller.size || shared / smaller.size >= 0.85
  }

  const candidates = addresses
    .map(clean)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.length - a.length)

  const kept: string[] = []
  for (const candidate of candidates) {
    const candidateKey = candidate.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (kept.some(existing => {
      const existingKey = existing.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      return existingKey.includes(candidateKey) || candidateKey.includes(existingKey) || overlaps(existing, candidate)
    })) continue
    kept.push(candidate)
  }

  return kept.sort((a, b) => b.length - a.length).slice(0, 5)
}
