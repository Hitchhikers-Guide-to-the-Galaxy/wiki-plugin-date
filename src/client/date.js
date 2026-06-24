// wiki-plugin-date
// Marks a wiki page as a time-located event.
// Exposes calendar-source / calendarData() for the Timeline Plugin.
// Backwards-compatible: also exposes radar-source / radarData() for the Radar Plugin.

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const SPANS  = ['EARLY','LATE','DECADE','DAY','MONTH','YEAR']

// ── Parser ────────────────────────────────────────────────────────────────────

// Narrow span: keep whichever span is more precise
const narrowSpan = (entry, span) => {
  const current = SPANS.indexOf(entry.span)
  if (current < 0) { entry.span = span; return }
  if (SPANS.indexOf(span) < current) entry.span = span
}

// Parse an ISO date string YYYY-MM-DD → Date (local midnight)
const parseISO = str => {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3])
}

// Parse one DSL line into a parsed entry object.
// Supports:
//   ISO point:   2026-01-15
//   ISO range:   2026-02-01..2026-05-30
//   Group tag:   #GroupName
//   Label:       any remaining words after date/group tokens
//   Natural lang (legacy): 1967, 60S, JAN, 14, Summer of Love …
export const parseLine = line => {
  const entry = {}
  const tokens = (line || '').match(/\S+/g) || []
  const remaining = []

  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]

    // ISO range: YYYY-MM-DD..YYYY-MM-DD
    const rangeMatch = tok.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/)
    if (rangeMatch) {
      entry.start = parseISO(rangeMatch[1])
      entry.end   = parseISO(rangeMatch[2])
      entry.iso   = true
      narrowSpan(entry, 'DAY')
      i++; continue
    }

    // ISO point: YYYY-MM-DD
    if (tok.match(/^\d{4}-\d{2}-\d{2}$/)) {
      entry.start = parseISO(tok)
      entry.iso   = true
      narrowSpan(entry, 'DAY')
      i++; continue
    }

    // Natural-language year: 1967
    if (tok.match(/^\d{4}$/)) {
      entry.year = +tok
      narrowSpan(entry, 'YEAR')
      i++; continue
    }

    // Decade: 60S
    const decadeMatch = tok.match(/^(\d0)S$/)
    if (decadeMatch) {
      entry.year = +decadeMatch[1] + 1900
      narrowSpan(entry, 'DECADE')
      i++; continue
    }

    // Span keyword: EARLY, LATE, …
    if (SPANS.includes(tok)) {
      entry.span = tok
      i++; continue
    }

    // Month abbreviation: JAN..DEC
    const monthIdx = MONTHS.indexOf(tok.slice(0, 3).toUpperCase())
    if (monthIdx >= 0) {
      entry.month = monthIdx + 1
      narrowSpan(entry, 'MONTH')
      i++; continue
    }

    // Day number: 1–31
    const dayMatch = tok.match(/^([1-3]?[0-9])$/)
    if (dayMatch) {
      entry.day = +dayMatch[1]
      narrowSpan(entry, 'DAY')
      i++; continue
    }

    // Group tag: #Name
    if (tok.startsWith('#')) {
      entry.group = tok.slice(1)
      i++; continue
    }

    // Anything else — label; take rest of line, but still extract any trailing #Group
    remaining.push(...tokens.slice(i))
    break
  }

  // Extract #Group tokens from the remaining label tokens
  const labelTokens = []
  for (const tok of remaining) {
    if (tok.startsWith('#') && !entry.group) entry.group = tok.slice(1)
    else labelTokens.push(tok)
  }
  if (labelTokens.length) entry.label = labelTokens.join(' ')
  return entry
}

// ── Resolver ──────────────────────────────────────────────────────────────────
// Takes parsed entries and resolves dates, carrying forward month/year context.
// Returns normalised event objects suitable for calendarData().

export const resolveEntries = (entries, pageTitle) => {
  let carry = new Date()
  const labelMap = {}
  const events = []

  for (const entry of entries) {
    let start, end, span

    if (entry.iso && entry.start) {
      // ISO path — start/end already Date objects from parseLine
      start = entry.start
      end   = entry.end || entry.start
      span  = entry.span || 'DAY'
    } else {
      // Natural-language path — carry-forward context
      if (labelMap[entry.label]?.date) carry = labelMap[entry.label].date
      if (entry.year)  carry = new Date(entry.year, 0)
      if (entry.month) carry = new Date(carry.getFullYear(), entry.month - 1)
      if (entry.day)   carry = new Date(carry.getFullYear(), carry.getMonth(), entry.day)
      start = carry
      end   = carry
      span  = entry.span || 'DAY'
    }

    const label = entry.label || pageTitle || ''
    if (label) labelMap[label] = { date: start }

    events.push({ label, start, end, span, group: entry.group || null })
  }

  return events
}

// ── Precision helpers (for radarData backwards compat) ────────────────────────

const PRECISION = { DAY: 864e5, MONTH: 26298e5, YEAR: 315576e5, DECADE: 315576e6, EARLY: 315576e6, LATE: 315576e6 }
const UNITS     = { DAY: 'day', MONTH: 'month', YEAR: 'year', DECADE: 'decade', EARLY: 'decade', LATE: 'decade' }

const radarEntry = (date, span) => {
  const precision = PRECISION[span] ?? PRECISION.DAY
  const units     = UNITS[span]     ?? UNITS.DAY
  return { units: [units], value: Math.floor(date.getTime() / precision), precision }
}

// ── Formatter (display label from natural-language dates) ─────────────────────

const formatNL = (date, span) => {
  switch (span) {
    case 'YEAR':   return date.getFullYear().toString()
    case 'DECADE': return `${date.getFullYear()}'S`
    case 'EARLY':  return `Early ${date.getFullYear()}'S`
    case 'LATE':   return `Late ${date.getFullYear()}'S`
    case 'MONTH':  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
    default:       return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  }
}

// ── Visual rendering ──────────────────────────────────────────────────────────

const pad2 = n => String(n).padStart(2, '0')

// Format a Date as a typographic display string:
//   point  →  15\nJANUARY\n2026
//   range  →  start..end  (single-line abbreviated)
const renderPoint = (date, span) => {
  if (span === 'YEAR')   return `<div class="date-year">${date.getFullYear()}</div>`
  if (span === 'DECADE') return `<div class="date-year">${date.getFullYear()}'s</div>`
  if (span === 'MONTH') {
    return `<div class="date-month-name">${MONTHS[date.getMonth()]}</div>` +
           `<div class="date-year">${date.getFullYear()}</div>`
  }
  // DAY
  return `<div class="date-day">${pad2(date.getDate())}</div>` +
         `<div class="date-month-name">${MONTHS[date.getMonth()]}</div>` +
         `<div class="date-year">${date.getFullYear()}</div>`
}

const renderRange = (start, end, span) => {
  const fmt = d => `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  return `<div class="date-range"><span class="date-range-start">${fmt(start)}</span>` +
         `<span class="date-range-sep">–</span>` +
         `<span class="date-range-end">${fmt(end)}</span></div>`
}

const isRange = ev => ev.start.getTime() !== ev.end.getTime()

const renderEvent = ev => {
  const body = isRange(ev)
    ? renderRange(ev.start, ev.end, ev.span)
    : renderPoint(ev.start, ev.span)
  const group = ev.group
    ? `<div class="date-group date-group-${ev.group.toLowerCase().replace(/\s+/g,'-')}">${ev.group}</div>`
    : ''
  return `<div class="date-event">${body}${group}</div>`
}

const CSS = `
<style>
.wiki-plugin-date {
  font-family: Georgia, serif;
  padding: .6em .8em;
  background: #f9f9f9;
  border-left: 3px solid #aaa;
  margin-bottom: 6px;
  line-height: 1.1;
}
.date-event { display: inline-block; margin-right: 1em; vertical-align: top; }
.date-day   { font-size: 2.4em; font-weight: bold; color: #222; line-height: 1; }
.date-month-name { font-size: .85em; text-transform: uppercase; letter-spacing: .08em; color: #555; }
.date-year  { font-size: .8em; color: #888; }
.date-range { font-size: .9em; color: #444; }
.date-range-sep { margin: 0 .35em; color: #aaa; }
.date-group {
  display: inline-block; margin-top: .3em;
  padding: .1em .45em; border-radius: 3px;
  font-size: .72em; font-family: sans-serif;
  background: #dde; color: #334; letter-spacing: .04em;
}
</style>`

let cssInjected = false
const injectCSS = () => {
  if (cssInjected) return
  document.head.insertAdjacentHTML('beforeend', CSS)
  cssInjected = true
}

// ── emit ──────────────────────────────────────────────────────────────────────

export const emit = ($item, item) => {
  injectCSS()
  const text   = item.text || ''
  const lines  = text.split(/\n/).filter(l => l.trim())
  const parsed = lines.map(parseLine)

  // Determine page title from wiki context if available
  const pageTitle = (() => {
    try { return $item.closest('.page').find('h1').text().trim() } catch { return '' }
  })()

  const events = resolveEntries(parsed, pageTitle)
  const html = events.map(renderEvent).join('')
  $item.html(`<div class="wiki-plugin-date">${html || '<em>no date</em>'}</div>`)
}

// ── bind ──────────────────────────────────────────────────────────────────────

export const bind = ($item, item) => {
  const text     = item.text || ''
  const lines    = text.split(/\n/).filter(l => l.trim())
  const parsed   = lines.map(parseLine)

  const pageTitle = (() => {
    try { return $item.closest('.page').find('h1').text().trim() } catch { return '' }
  })()

  const site   = (() => { try { return window.location.hostname } catch { return '' } })()
  const events = resolveEntries(parsed, pageTitle)

  // calendar-source interface (consumed by Timeline Plugin)
  $item.addClass('calendar-source')
  $item.get(0).calendarData = () => events.map(ev => ({
    label: ev.label,
    start: ev.start,
    end:   ev.end,
    span:  ev.span,
    group: ev.group,
    page:  pageTitle,
    site,
  }))

  // radar-source backwards compat (consumed by Radar Plugin)
  $item.addClass('radar-source')
  const radarMap = {}
  for (const ev of events) {
    if (ev.label) radarMap[ev.label] = radarEntry(ev.start, ev.span)
  }
  $item.get(0).radarData = () => radarMap

  // Double-click to edit
  $item.on('dblclick', () => wiki.textEditor($item, item))
}

// ── Register ──────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && window !== null) {
  window.plugins = window.plugins || {}
  window.plugins.date = { emit, bind }
}
