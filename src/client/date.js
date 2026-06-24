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

// ── Style extraction ──────────────────────────────────────────────────────────
// Scans for a `STYLE <name>` line, removes it, returns { style, lines }.
// Default style is TYPOGRAPHIC (the original appearance).

export const STYLES = ['TYPOGRAPHIC', 'PLAIN', 'COMPACT', 'TABLE']

export const extractStyle = text => {
  let style = 'TYPOGRAPHIC'
  const lines = []
  for (const raw of (text || '').split('\n')) {
    const m = raw.trim().match(/^STYLE\s+(\S+)$/i)
    if (m) { style = m[1].toUpperCase(); continue }
    lines.push(raw)
  }
  return { style, lines }
}

// ── Visual rendering ──────────────────────────────────────────────────────────

const pad2 = n => String(n).padStart(2, '0')

// Shared short date formatter
const fmtShort = d => `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
const fmtISO   = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
const isRange  = ev => ev.start.getTime() !== ev.end.getTime()

// ── TYPOGRAPHIC (default) ─────────────────────────────────────────────────────

const renderPointTypo = (date, span) => {
  if (span === 'YEAR')   return `<div class="date-year">${date.getFullYear()}</div>`
  if (span === 'DECADE') return `<div class="date-year">${date.getFullYear()}'s</div>`
  if (span === 'MONTH') {
    return `<div class="date-month-name">${MONTHS[date.getMonth()]}</div>` +
           `<div class="date-year">${date.getFullYear()}</div>`
  }
  return `<div class="date-day">${pad2(date.getDate())}</div>` +
         `<div class="date-month-name">${MONTHS[date.getMonth()]}</div>` +
         `<div class="date-year">${date.getFullYear()}</div>`
}

const renderRangeTypo = (start, end) =>
  `<div class="date-range">` +
  `<span class="date-range-start">${fmtShort(start)}</span>` +
  `<span class="date-range-sep">–</span>` +
  `<span class="date-range-end">${fmtShort(end)}</span></div>`

const groupBadge = ev =>
  ev.group ? `<div class="date-group date-group-${ev.group.toLowerCase().replace(/\s+/g,'-')}">${ev.group}</div>` : ''

const renderEventTypo = ev => {
  const body = isRange(ev)
    ? renderRangeTypo(ev.start, ev.end)
    : renderPointTypo(ev.start, ev.span)
  return `<div class="date-event">${body}${groupBadge(ev)}</div>`
}

// ── PLAIN ─────────────────────────────────────────────────────────────────────
// Simple text list: one line per event

const fmtDatePlain = (ev) => {
  if (isRange(ev)) return `${fmtShort(ev.start)} – ${fmtShort(ev.end)}`
  if (ev.span === 'YEAR')   return String(ev.start.getFullYear())
  if (ev.span === 'DECADE') return `${ev.start.getFullYear()}'s`
  if (ev.span === 'MONTH')  return `${MONTHS[ev.start.getMonth()]} ${ev.start.getFullYear()}`
  return fmtShort(ev.start)
}

const renderEventPlain = ev => {
  const date  = fmtDatePlain(ev)
  const label = ev.label ? ` — ${ev.label}` : ''
  const group = ev.group ? ` <span class="date-plain-group">#${ev.group}</span>` : ''
  return `<div class="date-plain-row"><span class="date-plain-date">${date}</span>${label}${group}</div>`
}

// ── COMPACT ───────────────────────────────────────────────────────────────────
// Inline pills, all on one line

const renderEventCompact = ev => {
  const date  = fmtDatePlain(ev)
  const label = ev.label ? ` ${ev.label}` : ''
  const group = ev.group ? ` <span class="date-compact-group">#${ev.group}</span>` : ''
  return `<span class="date-compact-pill">${date}${label}${group}</span>`
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
// Three-column table: date | label | group

const renderEventsTable = events => {
  const rows = events.map(ev => {
    const date  = fmtDatePlain(ev)
    const label = ev.label || ''
    const group = ev.group || ''
    return `<tr><td class="date-td-date">${date}</td>` +
           `<td class="date-td-label">${label}</td>` +
           `<td class="date-td-group">${group ? `<span class="date-group">${group}</span>` : ''}</td></tr>`
  })
  return `<table class="date-table">` +
         `<thead><tr><th>Date</th><th>Event</th><th>Group</th></tr></thead>` +
         `<tbody>${rows.join('')}</tbody></table>`
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

const renderEvents = (events, style) => {
  if (!events.length) return '<em>no date</em>'
  switch (style) {
    case 'PLAIN':   return events.map(renderEventPlain).join('')
    case 'COMPACT': return events.map(renderEventCompact).join('')
    case 'TABLE':   return renderEventsTable(events)
    default:        return events.map(renderEventTypo).join('')
  }
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
/* TYPOGRAPHIC */
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
/* PLAIN */
.date-plain-row { font-family: sans-serif; font-size: .9em; color: #333; padding: .15em 0; }
.date-plain-date { font-weight: 600; margin-right: .2em; }
.date-plain-group { color: #779; font-size: .85em; }
/* COMPACT */
.date-compact-pill {
  display: inline-block; margin: .15em .3em .15em 0;
  padding: .15em .5em; border-radius: 12px;
  background: #eef; border: 1px solid #ccd;
  font-family: sans-serif; font-size: .82em; color: #334;
}
.date-compact-group { color: #779; }
/* TABLE */
.date-table { border-collapse: collapse; font-family: sans-serif; font-size: .88em; width: 100%; }
.date-table th { text-align: left; color: #999; font-weight: 500; border-bottom: 1px solid #ddd; padding: .2em .4em; font-size: .85em; }
.date-table td { padding: .25em .4em; border-bottom: 1px solid #eee; color: #333; }
.date-td-date { white-space: nowrap; color: #555; }
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
  const { style, lines } = extractStyle(item.text || '')
  const parsed = lines.filter(l => l.trim()).map(parseLine)

  // Determine page title from wiki context if available
  const pageTitle = (() => {
    try { return $item.closest('.page').find('h1').text().trim() } catch { return '' }
  })()

  const events = resolveEntries(parsed, pageTitle)
  $item.html(`<div class="wiki-plugin-date">${renderEvents(events, style)}</div>`)
}

// ── bind ──────────────────────────────────────────────────────────────────────

export const bind = ($item, item) => {
  const { lines } = extractStyle(item.text || '')
  const parsed   = lines.filter(l => l.trim()).map(parseLine)

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
