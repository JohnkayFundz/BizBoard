import { corsHeaders } from 'npm:@supabase/supabase-js@2.112.3/cors'

type Candidate = {
  url: string
  domain: string
  status: number | null
  title: string
  confidence: 'verified' | 'likely' | 'unverified'
  score: number
  reason: string
}

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })

function cleanName(value: string) {
  return value
    .replace(/\s*[—-]\s*(website|enquiry|lead).*/i, '')
    .replace(/\b(limited|ltd|llc|incorporated|inc|company|co\.)\b/gi, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
}

function compact(value: string) {
  return cleanName(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function meaningfulTokens(value: string) {
  const stop = new Set(['the', 'and', 'of', 'in', 'for', 'by', 'nigeria', 'lagos', 'naija', 'ng'])
  return cleanName(value).toLowerCase().split(/\s+/).filter(x => x.length >= 3 && !stop.has(x))
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim().slice(0, 180) : ''
}

async function check(url: string, businessName: string, location: string): Promise<Candidate | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'JohnKayClientEngine/1.0 website resolver' },
    })
    const text = await r.text()
    const title = extractTitle(text.slice(0, 120000))
    const tokens = meaningfulTokens(businessName)
    const haystack = (title + ' ' + url).toLowerCase()
    const matches = tokens.filter(token => haystack.includes(token)).length
    const base = compact(businessName)
    const host = new URL(r.url).hostname.replace(/^www\./, '')
    const domainMatch = host.replace(/[^a-z0-9]/g, '').includes(base) || base.includes(host.replace(/[^a-z0-9]/g, ''))
    let score = r.ok ? 55 : 20
    if (domainMatch) score += 25
    if (matches >= 2) score += 20
    else if (matches === 1) score += 10
    if (location && haystack.includes(location.toLowerCase().split(',')[0].trim())) score += 5
    score = Math.min(100, score)

    const confidence: Candidate['confidence'] =
      r.ok && (matches >= Math.min(2, tokens.length) || domainMatch) && score >= 75
        ? 'verified'
        : r.ok && score >= 60
          ? 'likely'
          : 'unverified'

    return {
      url: r.url.replace(/\/$/, ''),
      domain: new URL(r.url).hostname,
      status: r.status,
      title,
      confidence,
      score,
      reason: confidence === 'verified'
        ? 'Live site with a strong business-name match.'
        : confidence === 'likely'
          ? 'Live site found; business-name match should be reviewed before saving.'
          : 'A live domain responded, but the business match is weak.',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return response({ success: false, error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const businessName = String(body.business_name || '').trim()
    const location = String(body.location || '').trim()
    const email = String(body.email || '').trim()

    if (!businessName) return response({ success: false, error: 'Business name is required' }, 400)

    const base = compact(businessName)
    const domains = new Set<string>()
    const emailDomain = email.includes('@') ? email.split('@').pop()?.toLowerCase() : ''
    if (emailDomain && !/^(gmail|yahoo|outlook|hotmail|icloud|protonmail)\./i.test(emailDomain)) domains.add(emailDomain)

    for (const tld of ['com', 'com.ng', 'ng']) {
      domains.add(base + '.' + tld)
      domains.add('www.' + base + '.' + tld)
    }

    const candidates = (await Promise.all([...domains].slice(0, 10).map(domain => check(
      domain.startsWith('www.') ? 'https://' + domain : 'https://www.' + domain,
      businessName,
      location,
    )))).filter(Boolean) as Candidate[]

    candidates.sort((a, b) => b.score - a.score)

    return response({
      success: true,
      business_name: businessName,
      candidates: candidates.slice(0, 6),
      searched: domains.size,
      message: candidates.length
        ? 'Candidate websites found. Review the match before saving.'
        : 'No live candidate website was found from the business-name domain patterns.',
    })
  } catch (error) {
    return response({ success: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
