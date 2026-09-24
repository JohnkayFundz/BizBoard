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

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function searchQuery(businessName: string, location: string) {
  const cleanLocation = location.split(',')[0].trim()
  return [businessName, cleanLocation, 'Nigeria'].filter(Boolean).join(' ')
}

function isExcludedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return [
    'google.com',
    'googleusercontent.com',
    'bing.com',
    'duckduckgo.com',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'tiktok.com',
    'wa.me',
    'whatsapp.com',
  ].some(domain => host === domain || host.endsWith('.' + domain))
}

function extractSearchLinks(html: string, engine: 'ddg' | 'bing') {
  const results: Array<{ url: string; title: string }> = []
  const seen = new Set<string>()
  const pattern = engine === 'ddg'
    ? /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    : /<li[^>]+class=["'][^"']*b_algo[^"']*["'][\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>/gi

  for (const match of html.matchAll(pattern)) {
    let href = decodeHtml(match[1])
    const title = decodeHtml(match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    try {
      const parsed = new URL(href, engine === 'ddg' ? 'https://duckduckgo.com' : 'https://www.bing.com')
      const redirected = parsed.searchParams.get('uddg')
      if (redirected) href = decodeURIComponent(redirected)
      const url = new URL(href)
      if (!['http:', 'https:'].includes(url.protocol)) continue
      if (isExcludedHost(url.hostname)) continue
        const normalized = url.origin + url.pathname.replace(/\/$/, '')
      if (!seen.has(normalized)) {
        seen.add(normalized)
        results.push({ url: normalized, title })
      }
    } catch {
      // Ignore malformed search results.
    }
    if (results.length >= 12) break
  }

  return results
}

type DiscoveryDiagnostic = {
  engine: 'ddg' | 'bing' | 'jina'
  status: 'ok' | 'blocked' | 'error'
  http_status: number | null
  results: number
}

async function fetchSearchResults(endpoint: string, engine: 'ddg' | 'bing'): Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const r = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 JohnKayClientEngine/2.1 website discovery',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    const html = await r.text()
    const results = r.ok ? extractSearchLinks(html, engine) : []
    const diagnostic: DiscoveryDiagnostic = {
      engine,
      status: r.ok ? 'ok' : 'blocked',
      http_status: r.status,
      results: results.length,
    }
    return { results, diagnostic }
  } catch {
    return {
      results: [],
      diagnostic: { engine, status: 'error', http_status: null, results: 0 },
    }
  } finally {
    clearTimeout(timeout)
  }
}


async function fetchJinaSearch(businessName: string, location: string): Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }> {
  const query = encodeURIComponent(searchQuery(businessName, location))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const r = await fetch('https://s.jina.ai/' + query, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'JohnKayClientEngine/2.1 website discovery',
      },
    })
    const text = await r.text()
    const results: Array<{ url: string; title: string }> = []
    const seen = new Set<string>()
    const patterns = [
      /\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)<>]+)\\)/gi,
      /(https?:\\/\\/[^\\s)<>]+)/gi,
    ]
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const rawUrl = match[2] || match[1]
        const linkTitle = match[2] ? match[1] : ''
        try {
          const url = new URL(rawUrl.replace(/[.,;]+$/, ''))
          if (!['http:', 'https:'].includes(url.protocol) || isExcludedHost(url.hostname)) continue
          const normalized = url.origin + url.pathname.replace(/\\/$/, '')
          if (seen.has(normalized)) continue
          seen.add(normalized)
          const start = Math.max(0, (match.index ?? 0) - 180)
          const context = text.slice(start, match.index ?? 0).replace(/\\s+/g, ' ').trim()
          results.push({ url: normalized, title: (linkTitle || context).slice(-180) })
          if (results.length >= 10) break
        } catch {
          // Ignore malformed URLs.
        }
      }
      if (results.length >= 10) break
    }
    return {
      results,
      diagnostic: {
        engine: 'jina',
        status: r.ok ? (results.length ? 'ok' : 'blocked') : 'blocked',
        http_status: r.status,
        results: results.length,
      },
    }
  } catch {
    return {
      results: [],
      diagnostic: { engine: 'jina', status: 'error', http_status: null, results: 0 },
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function discoverWebResults(businessName: string, location: string) {
  const query = encodeURIComponent(searchQuery(businessName, location))
  const endpoints: Array<{ url: string; engine: 'ddg' | 'bing' }> = [
    { url: 'https://html.duckduckgo.com/html/?q=' + query, engine: 'ddg' },
    { url: 'https://www.bing.com/search?q=' + query, engine: 'bing' },
  ]
  const groups = await Promise.all([
    ...endpoints.map(item => fetchSearchResults(item.url, item.engine)),
    fetchJinaSearch(businessName, location),
  ])
  const seen = new Set<string>()
  const merged: Array<{ url: string; title: string }> = []
  for (const group of groups) {
    for (const item of group.results) {
      const key = item.url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= 12) {
        return { results: merged, diagnostics: groups.map(group => group.diagnostic) }
      }
    }
  }
  return { results: merged, diagnostics: groups.map(group => group.diagnostic) }
}

async function check(url: string, businessName: string, location: string, discoveryTitle = ''): Promise<Candidate | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'JohnKayClientEngine/2.0 website resolver' },
    })
    const text = await r.text()
    const title = extractTitle(text.slice(0, 120000)) || discoveryTitle
    const tokens = meaningfulTokens(businessName)
    const haystack = (title + ' ' + url).toLowerCase()
    const matches = tokens.filter(token => haystack.includes(token)).length
    const base = compact(businessName)
    const host = new URL(r.url).hostname.replace(/^www\./, '')
    const normalizedHost = host.replace(/[^a-z0-9]/g, '')
    const domainMatch = normalizedHost.includes(base) || base.includes(normalizedHost)
    const locationHint = location.split(',')[0].trim().toLowerCase()
    let score = r.ok ? 50 : 15
    if (domainMatch) score += 25
    if (matches >= 2) score += 20
    else if (matches === 1) score += 10
    if (locationHint && haystack.includes(locationHint)) score += 5
    if (discoveryTitle && meaningfulTokens(discoveryTitle).some(token => tokens.includes(token))) score += 5
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
        ? discoveryTitle
          ? 'Found through web discovery and verified as a strong business-name match.'
          : 'Live site with a strong business-name match.'
        : confidence === 'likely'
          ? 'Found through web discovery; business-name match should be reviewed before saving.'
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

    const discovery = await discoverWebResults(businessName, location)
    const discovered = discovery.results
    const discoveredChecks = discovered.slice(0, 8).map(item =>
      check(item.url, businessName, location, item.title)
    )

    const directChecks = [...domains].slice(0, 10).map(domain =>
      check(
        domain.startsWith('www.') ? 'https://' + domain : 'https://www.' + domain,
        businessName,
        location,
      )
    )

    const checked = await Promise.all([...discoveredChecks, ...directChecks])
    const candidates = checked.filter(Boolean) as Candidate[]
    const unique = new Map<string, Candidate>()

    for (const candidate of candidates) {
      const key = candidate.domain.toLowerCase()
      const existing = unique.get(key)
      if (!existing || candidate.score > existing.score) unique.set(key, candidate)
    }

    const finalCandidates = [...unique.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    return response({
      success: true,
      business_name: businessName,
      candidates: finalCandidates,
      searched: domains.size,
      discovered: discovered.length,
      discovery: discovery.diagnostics,
      message: finalCandidates.length
        ? 'Candidate websites found through web discovery. Review the match before saving.'
        : 'No live candidate website was found. You can search manually using the business name and location.',
    })
  } catch (error) {
    return response({ success: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
