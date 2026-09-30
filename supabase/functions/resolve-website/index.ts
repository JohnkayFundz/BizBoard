import { corsHeaders } from 'npm:@supabase/supabase-js@2.112.3/cors'

type ContactInfo = {
  emails: string[]
  phones: string[]
  instagram: string[]
  social_profiles: string[]
  addresses: string[]
  sources: Array<{ url: string; domain: string; source_type: Candidate['source_type']; title: string }>
}

type Candidate = {
  url: string
  domain: string
  status: number | null
  title: string
  confidence: 'verified' | 'likely' | 'unverified'
  score: number
  reason: string
  source_type: 'official_website' | 'social_profile' | 'directory' | 'marketplace' | 'portfolio' | 'news_media' | 'unknown'
  contacts: ContactInfo
}

function classifyHost(hostname: string, title = ''): Candidate['source_type'] {
  const host = hostname.toLowerCase().replace(/^www\\./, '')
  const social = ['facebook.com','instagram.com','linkedin.com','twitter.com','x.com','youtube.com','tiktok.com','wa.me','whatsapp.com']
  const directories = ['wikipedia.org','foursquare.com','tripadvisor.com','yelp.com','yellowpages.com','hotfrog.com','finelib.com','businesslist.com.ng','connectnigeria.com','vconnect.com','ngex.com','nigeriapropertycentre.com','estateagentsng.com','propertypro.ng','directory']
  const marketplaces = ['jiji.ng','jumia.com.ng','konga.com','propertypro.ng','privateproperty.com.ng','cars45.com','autochek.africa']
  const media = ['bbc.com','cnn.com','reuters.com','guardian.ng','punchng.com','vanguardngr.com','thisdaylive.com','tribuneonlineng.com','premiumtimesng.com','businessday.ng','nairaland.com']
  if (social.some(d => host === d || host.endsWith('.' + d))) return 'social_profile'
  if (marketplaces.some(d => host === d || host.endsWith('.' + d))) return 'marketplace'
  if (directories.some(d => host === d || host.endsWith('.' + d) || host.includes(d))) return 'directory'
  if (media.some(d => host === d || host.endsWith('.' + d)) || /\\b(news|radio|newspaper|breaking news|live radio)\\b/i.test(title)) return 'news_media'
  if (/behance\\.net|dribbble\\.com|clutch\\.co|designrush\\.com|portfolio/i.test(host + ' ' + title)) return 'portfolio'
  return 'unknown'
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

function extractContactInfo(html: string, baseUrl: string): ContactInfo {
  const text = decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
  const emails = new Set<string>()
  const phones = new Set<string>()
  const instagram = new Set<string>()
  const social = new Set<string>()
  const addresses = new Set<string>()

  for (const match of html.matchAll(/(?:mailto:)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)) {
    const value = String(match[1] || '').toLowerCase().replace(/[),.;:]+$/, '')
    if (!value || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value)) continue
    emails.add(value)
  }

  for (const match of text.matchAll(/(?:\+234|0)(?:[\s().-]*\d){10}/g)) {
    const value = String(match[0]).replace(/[^\d+]/g, '')
    const digits = value.replace(/^\+/, '')
    if (digits.startsWith('234') && digits.length === 13) phones.add('+' + digits)
    else if (digits.startsWith('0') && digits.length === 11) phones.add('+234' + digits.slice(1))
  }

  for (const match of html.matchAll(/https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|tiktok\.com)\/[A-Za-z0-9._%/?=&-]+/gi)) {
    try {
      const url = new URL(match[0])
      const normalized = url.origin + url.pathname.replace(/\/$/, '')
      social.add(normalized)
      if (url.hostname.toLowerCase().replace(/^www\./, '') === 'instagram.com') instagram.add(normalized)
    } catch {}
  }

  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = decodeHtml(match[1] || '')
    try {
      const url = new URL(raw, baseUrl)
      const host = url.hostname.toLowerCase().replace(/^www\./, '')
      if (['instagram.com','facebook.com','linkedin.com','tiktok.com'].some(d => host === d || host.endsWith('.' + d))) {
        const normalized = url.origin + url.pathname.replace(/\/$/, '')
        social.add(normalized)
        if (host === 'instagram.com') instagram.add(normalized)
      }
    } catch {}
  }

  const addressPatterns = [
    /(?:address|location|office|head office|contact us)\s*[:\-–]?\s*([^|\n]{8,180})/gi,
    /(?:Lagos|Abuja|Port Harcourt|Ibadan|Kano|Benin City|Nigeria)[^|\n]{0,120}/gi,
  ]
  for (const pattern of addressPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = String(match[1] || match[0] || '').replace(/\s+/g, ' ').trim()
      if (value.length >= 8 && value.length <= 180 && !/^(phone|email|instagram)\b/i.test(value)) addresses.add(value)
    }
  }

  return {
    emails: [...emails].slice(0, 5),
    phones: [...phones].slice(0, 5),
    instagram: [...instagram].slice(0, 3),
    social_profiles: [...social].slice(0, 8),
    addresses: [...addresses].slice(0, 5),
    sources: [],
  }
}

function searchQueries(businessName: string, location: string) {
  const cleanLocation = location.split(',')[0].trim()
  const name = businessName.replace(/"/g, '').trim()
  const withoutCountry = name.replace(/\b(nigeria|ng|lagos)\b/gi, '').replace(/\s+/g, ' ').trim()
  return [
    ['"' + name + '"', cleanLocation, 'Nigeria', 'website'],
    [name, cleanLocation, 'Nigeria', 'official website'],
    [withoutCountry || name, 'Nigeria', 'website'],
  ].map(parts => parts.filter(Boolean).join(' '))
}

function isLowValueHost(hostname: string, title = '') {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  const generic = [
    'rte.ie','shannonside.ie','breakingnews.ie','irishradiolive.com','leitrimobserver.ie',
    'bbc.com','cnn.com','reuters.com','guardian.ng','punchng.com','vanguardngr.com',
    'thisdaylive.com','tribuneonlineng.com','premiumtimesng.com','businessday.ng','nairaland.com'
  ]
  if (generic.some(d => host === d || host.endsWith('.' + d))) return true
  return /(^|[.\-])(news|radio|newspaper|media|press)([.\-]|$)/i.test(host)
    || /\b(news|radio|newspaper|breaking news|live radio)\b/i.test(title)
}

function isHardExcludedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return [
    'google.com',
    'googleusercontent.com',
    'bing.com',
    'duckduckgo.com',
    'microsoft.com',
    'support.microsoft.com',
    'messenger.com',
    'meta.com',
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

function extractSearchLinks(html: string, engine: 'ddg' | 'bing', allowPublicListingHosts = false) {
  const results: Array<{ url: string; title: string }> = []
  const seen = new Set<string>()
  const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(pattern)) {
    let href = decodeHtml(match[1])
    const title = decodeHtml(match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (!title || title.length < 2) continue
    try {
      const parsed = new URL(href, engine === 'ddg' ? 'https://duckduckgo.com' : 'https://www.bing.com')
      const redirected = parsed.searchParams.get('uddg')
      if (redirected) href = decodeURIComponent(redirected)
      const bingEncoded = parsed.searchParams.get('u')
      if (engine === 'bing' && bingEncoded && bingEncoded.startsWith('a1')) {
        try {
          const raw = bingEncoded.slice(2).replace(/-/g, '+').replace(/_/g, '/')
          const padded = raw + '='.repeat((4 - raw.length % 4) % 4)
          const decoded = atob(padded)
          if (decoded.startsWith('http')) href = decoded
        } catch {
          // Keep the original Bing URL when redirect decoding fails.
        }
      }
      const url = new URL(href)
      if (!['http:', 'https:'].includes(url.protocol)) continue
      if (isHardExcludedHost(url.hostname)) continue
      if (!allowPublicListingHosts && ['facebook.com','instagram.com','linkedin.com','twitter.com','x.com','youtube.com','tiktok.com','wa.me','whatsapp.com'].some(domain => { const host = url.hostname.toLowerCase().replace(/^www\\./, ''); return host === domain || host.endsWith('.' + domain) })) continue
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

async function fetchSearchResults(endpoint: string, engine: 'ddg' | 'bing', allowPublicListingHosts = false): Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }> {
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
    const results = r.ok ? extractSearchLinks(html, engine, allowPublicListingHosts) : []
    const diagnostic: DiscoveryDiagnostic = {
      engine,
      status: r.ok ? 'ok' : 'blocked',
      http_status: r.status,
      results: results.length,
    }
    console.log(JSON.stringify({ event: 'search_provider', provider: engine, http_status: r.status, results: results.length, bytes: html.length }))
    return { results, diagnostic }
  } catch (error) {
    console.error(JSON.stringify({ event: 'search_provider_error', provider: engine, error: error instanceof Error ? error.message : String(error) }))
    return {
      results: [],
      diagnostic: { engine, status: 'error', http_status: null, results: 0 },
    }
  } finally {
    clearTimeout(timeout)
  }
}


async function fetchJinaSearch(queryText: string): Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }> {
  const query = encodeURIComponent(queryText)
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
    const pattern = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)|(?:^|\s)(https?:\/\/[^\s)<>]+)/gim

    for (const match of text.matchAll(pattern)) {
      const rawUrl = match[1] || match[2]
      if (!rawUrl) continue
      try {
        const url = new URL(rawUrl)
        if (!['http:', 'https:'].includes(url.protocol) || isHardExcludedHost(url.hostname)) continue
        const normalized = url.origin + url.pathname.replace(/\/$/, '')
        if (seen.has(normalized)) continue
        seen.add(normalized)
        const start = Math.max(0, (match.index ?? 0) - 180)
        const context = text.slice(start, match.index ?? 0).replace(/\s+/g, ' ').trim()
        results.push({ url: normalized, title: context.slice(-140) })
        if (results.length >= 10) break
      } catch {
        // Ignore malformed URLs.
      }
    }

    console.log(JSON.stringify({ event: 'search_provider', provider: 'jina', http_status: r.status, results: results.length, bytes: text.length }))
    return {
      results,
      diagnostic: {
        engine: 'jina',
        status: r.ok ? (results.length ? 'ok' : 'blocked') : 'blocked',
        http_status: r.status,
        results: results.length,
      },
    }
  } catch (error) {
    console.error(JSON.stringify({ event: 'search_provider_error', provider: 'jina', error: error instanceof Error ? error.message : String(error) }))
    return {
      results: [],
      diagnostic: { engine: 'jina', status: 'error', http_status: null, results: 0 },
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function discoverPublicListingResults(businessName: string, location: string) {
  const cleanLocation = location.split(',')[0].trim()
  const name = businessName.replace(/"/g, '').trim()
  const queries = [
    '"' + name + '" "' + cleanLocation + '" (phone OR email OR instagram OR contact)',
    'site:businesslist.com.ng "' + name + '" "' + cleanLocation + '"',
    'site:vconnect.com "' + name + '" "' + cleanLocation + '"',
    'site:connectnigeria.com "' + name + '" "' + cleanLocation + '"',
    'site:instagram.com "' + name + '" "' + cleanLocation + '"',
    'site:linkedin.com/company "' + name + '" "' + cleanLocation + '"',
  ].map(x => x.replace(/\s+/g, ' ').trim())

  const jobs: Array<Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }>> = []
  for (const queryText of queries) {
    const query = encodeURIComponent(queryText)
    jobs.push(fetchSearchResults('https://www.bing.com/search?q=' + query + '&count=10', 'bing', true))
    jobs.push(fetchSearchResults('https://html.duckduckgo.com/html/?q=' + query, 'ddg', true))
    jobs.push(fetchJinaSearch(queryText))
  }
  const groups = await Promise.all(jobs)
  const seen = new Set<string>()
  const merged: Array<{ url: string; title: string }> = []
  for (const group of groups) {
    for (const item of group.results) {
      const key = item.url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= 36) break
    }
    if (merged.length >= 36) break
  }
  return { results: merged, diagnostics: groups.map(group => group.diagnostic) }
}

async function discoverWebResults(businessName: string, location: string) {
  const queries = searchQueries(businessName, location)
  const jobs: Array<Promise<{ results: Array<{ url: string; title: string }>; diagnostic: DiscoveryDiagnostic }>> = []

  for (const queryText of queries) {
    const query = encodeURIComponent(queryText)
    jobs.push(fetchSearchResults('https://www.bing.com/search?q=' + query + '&count=10', 'bing'))
    jobs.push(fetchSearchResults('https://html.duckduckgo.com/html/?q=' + query, 'ddg'))
    jobs.push(fetchJinaSearch(queryText))
  }

  const groups = await Promise.all(jobs)
  const seen = new Set<string>()
  const merged: Array<{ url: string; title: string }> = []

  for (const group of groups) {
    for (const item of group.results) {
      const key = item.url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= 30) break
    }
    if (merged.length >= 30) break
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
    const haystack = (title + ' ' + url + ' ' + text.slice(0, 60000)).toLowerCase()
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
    if (isLowValueHost(new URL(r.url).hostname, title)) score -= 60
    if (/\.ng$|\.com\.ng$/i.test(host)) score += 10
    score = Math.min(100, score)

    const sourceType = classifyHost(new URL(r.url).hostname, title)
    const contacts = extractContactInfo(text, r.url)
    const confidence: Candidate['confidence'] =
      r.ok && sourceType === 'unknown' && (matches >= Math.min(2, tokens.length) || domainMatch) && score >= 75
        ? 'verified'
        : r.ok && sourceType === 'unknown' && score >= 60
          ? 'likely'
          : 'unverified'

    return {
      url: r.url.replace(/\/$/, ''),
      domain: new URL(r.url).hostname,
      status: r.status,
      title,
      confidence,
      score,
      source_type: sourceType,
      contacts,
      reason: confidence === 'verified'
        ? discoveryTitle
          ? 'Found through web discovery and verified as a strong business-name match.'
          : 'Live site with a strong business-name match.'
        : confidence === 'likely'
          ? 'Found through web discovery; business-name match should be reviewed before saving.'
          : sourceType === 'social_profile'
            ? 'This is a social profile, not an official business website.'
            : sourceType === 'directory'
              ? 'This is a directory/listing result, not an official business website.'
              : sourceType === 'marketplace'
                ? 'This is a marketplace/listing result, not an official business website.'
                : sourceType === 'portfolio'
                  ? 'This appears to be a portfolio/design page rather than the business website.'
                  : sourceType === 'news_media'
                    ? 'This is a news/media result, not a news/business website.'
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

    const domainBases = new Set<string>([base])
    const tokens = meaningfulTokens(businessName)
    if (tokens.length >= 2) {
      domainBases.add(tokens.join(''))
      domainBases.add(tokens.slice(0, 2).join(''))
      domainBases.add(tokens.slice(-2).join(''))
    }
    const withoutCountry = cleanName(businessName).replace(/\b(nigeria|ng|lagos)\b/gi, '').trim()
    const countryFree = compact(withoutCountry)
    if (countryFree) domainBases.add(countryFree)

    for (const domainBase of domainBases) {
      for (const tld of ['com', 'com.ng', 'ng']) {
        domains.add(domainBase + '.' + tld)
        domains.add('www.' + domainBase + '.' + tld)
      }
    }

    const discovery = await discoverWebResults(businessName, location)
    const discovered = discovery.results
    const discoveredChecks = discovered.slice(0, 12).map(item =>
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

    const allCandidates = [...unique.values()]
    const primaryWebsiteCandidates = allCandidates.filter(candidate => candidate.source_type === 'unknown' && candidate.score >= 70 && candidate.confidence !== 'unverified')
    const fallbackDiscovery = primaryWebsiteCandidates.length ? { results: [], diagnostics: [] as DiscoveryDiagnostic[] } : await discoverPublicListingResults(businessName, location)
    if (!primaryWebsiteCandidates.length && fallbackDiscovery.results.length) {
      const fallbackChecks = await Promise.all(fallbackDiscovery.results.slice(0, 18).map(item => check(item.url, businessName, location, item.title)))
      for (const candidate of fallbackChecks.filter(Boolean) as Candidate[]) {
        const key = candidate.domain.toLowerCase()
        const existing = unique.get(key)
        if (!existing || candidate.score > existing.score) unique.set(key, candidate)
      }
    }
    const allCandidatesWithFallback = [...unique.values()]
    const finalCandidates = allCandidatesWithFallback
      .filter(candidate => candidate.source_type === 'unknown' && candidate.score >= 70 && candidate.confidence !== 'unverified')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const otherOnlinePresence = allCandidatesWithFallback
      .filter(candidate => candidate.source_type !== 'unknown')
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    const contactSources = [...allCandidatesWithFallback]
      .filter(candidate =>
        candidate.score >= 65 &&
        (
          candidate.contacts.emails.length ||
          candidate.contacts.phones.length ||
          candidate.contacts.instagram.length ||
          candidate.contacts.social_profiles.length ||
          candidate.contacts.addresses.length
        )
      )
      .sort((a, b) => {
        const aWeight = a.source_type === 'unknown' ? 20 : 0
        const bWeight = b.source_type === 'unknown' ? 20 : 0
        return (b.score + bWeight) - (a.score + aWeight)
      })
      .slice(0, 8)

    const contactIntel = {
      emails: [...new Set(contactSources.flatMap(candidate => candidate.contacts.emails))].slice(0, 8),
      phones: [...new Set(contactSources.flatMap(candidate => candidate.contacts.phones))].slice(0, 8),
      instagram: [...new Set(contactSources.flatMap(candidate => candidate.contacts.instagram))].slice(0, 5),
      social_profiles: [...new Set(contactSources.flatMap(candidate => candidate.contacts.social_profiles))].slice(0, 10),
      addresses: [...new Set(contactSources.flatMap(candidate => candidate.contacts.addresses))].slice(0, 5),
      sources: contactSources.map(candidate => ({
        url: candidate.url,
        domain: candidate.domain,
        source_type: candidate.source_type,
        confidence: candidate.confidence,
        score: candidate.score,
        title: candidate.title,
        label: candidate.source_type === 'social_profile' ? 'Social Profile' : candidate.source_type === 'directory' || candidate.source_type === 'marketplace' ? 'Google Business / Public Listing' : 'Website Domain',
      })),
    }

    console.log(JSON.stringify({
      event: 'discovery_summary',
      discovered: discovered.length,
      direct_domains: domains.size,
      checked: candidates.length,
      final_candidates: finalCandidates.length,
      other_online_presence: otherOnlinePresence.length,
      contact_sources: contactSources.length,
      contact_emails: contactIntel.emails.length,
      contact_phones: contactIntel.phones.length,
      contact_instagram: contactIntel.instagram.length,
      contact_addresses: contactIntel.addresses.length,
      fallback_results: fallbackDiscovery.results.length,
      diagnostics: [...discovery.diagnostics, ...fallbackDiscovery.diagnostics],
    }))

    return response({
      success: true,
      business_name: businessName,
      candidates: finalCandidates,
      other_online_presence: otherOnlinePresence,
      contact_intelligence: contactIntel,
      searched: domains.size,
      discovered: discovered.length + fallbackDiscovery.results.length,
      discovery: [...discovery.diagnostics, ...fallbackDiscovery.diagnostics],
      message: finalCandidates.length
        ? 'Official website candidates found through web discovery. Review the match before saving.'
        : contactIntel.emails.length || contactIntel.phones.length || contactIntel.instagram.length || contactIntel.addresses.length
          ? 'No official website was verified. Public listing and social contact details were found.'
          : otherOnlinePresence.length
            ? 'No official website was verified. Other online presence was found and classified separately.'
            : 'No public contact channels found across web listings. Add contact details manually.',
    })
  } catch (error) {
    return response({ success: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
