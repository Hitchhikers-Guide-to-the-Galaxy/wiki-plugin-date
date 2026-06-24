import { strict as assert } from 'assert'
import { parseLine, resolveEntries, extractStyle, STYLES } from '../src/client/date.js'

// ── parseLine ─────────────────────────────────────────────────────────────────

const test = (name, fn) => { try { fn(); console.log('  ✓', name) } catch(e) { console.error('  ✗', name, e.message); process.exitCode = 1 } }

console.log('parseLine')

test('ISO point', () => {
  const e = parseLine('2026-01-15')
  assert.ok(e.start instanceof Date)
  assert.equal(e.start.getFullYear(), 2026)
  assert.equal(e.start.getMonth(), 0)
  assert.equal(e.start.getDate(), 15)
  assert.equal(e.span, 'DAY')
  assert.equal(e.end, undefined)
})

test('ISO range', () => {
  const e = parseLine('2026-02-01..2026-05-30')
  assert.ok(e.start instanceof Date)
  assert.ok(e.end instanceof Date)
  assert.equal(e.start.getMonth(), 1)
  assert.equal(e.end.getMonth(), 4)
  assert.equal(e.span, 'DAY')
})

test('ISO with group tag', () => {
  const e = parseLine('2026-02-01..2026-05-30 #Demoscene')
  assert.equal(e.group, 'Demoscene')
})

test('ISO with label override', () => {
  const e = parseLine('2026-02-01..2026-05-30 Wiki Wild Compo #Demoscene')
  assert.equal(e.label, 'Wiki Wild Compo')
  assert.equal(e.group, 'Demoscene')
})

test('natural-language year', () => {
  const e = parseLine('1967 Summer of Love')
  assert.equal(e.year, 1967)
  assert.equal(e.label, 'Summer of Love')
  assert.equal(e.span, 'YEAR')
})

test('natural-language decade', () => {
  const e = parseLine('60S')
  assert.equal(e.year, 1960)
  assert.equal(e.span, 'DECADE')
})

test('natural-language month+day', () => {
  const e = parseLine('JAN 14 Human Be-In')
  assert.equal(e.month, 1)
  assert.equal(e.day, 14)
  assert.equal(e.label, 'Human Be-In')
  assert.equal(e.span, 'DAY')
})

test('group tag only', () => {
  const e = parseLine('2026-06-01 #Projects')
  assert.equal(e.group, 'Projects')
})

// ── resolveEntries ────────────────────────────────────────────────────────────

console.log('resolveEntries')

test('ISO point uses page title as label', () => {
  const entries = [parseLine('2026-01-15')]
  const events  = resolveEntries(entries, 'My Page')
  assert.equal(events[0].label, 'My Page')
  assert.equal(events[0].start.getDate(), 15)
  assert.equal(events[0].end.getDate(), 15)
})

test('label override takes priority over page title', () => {
  const entries = [parseLine('2026-02-01 My Event')]
  const events  = resolveEntries(entries, 'Page Title')
  assert.equal(events[0].label, 'My Event')
})

test('ISO range returns start and end dates', () => {
  const entries = [parseLine('2026-02-01..2026-05-30')]
  const events  = resolveEntries(entries, 'Test Page')
  assert.ok(events[0].end.getTime() > events[0].start.getTime())
})

test('natural-language carry-forward year', () => {
  const entries = ['1967', 'JAN 14 Human Be-In'].map(parseLine)
  const events  = resolveEntries(entries, '')
  assert.equal(events[1].start.getFullYear(), 1967)
  assert.equal(events[1].start.getMonth(), 0)
  assert.equal(events[1].start.getDate(), 14)
})

// ── extractStyle ──────────────────────────────────────────────────────────────

console.log('extractStyle')

test('defaults to TYPOGRAPHIC when no STYLE line', () => {
  const { style, lines } = extractStyle('2026-01-15 Wiki Wild Compo')
  assert.equal(style, 'TYPOGRAPHIC')
  assert.equal(lines.length, 1)
})

test('extracts STYLE PLAIN and removes the line', () => {
  const { style, lines } = extractStyle('STYLE PLAIN\n2026-01-15 Event')
  assert.equal(style, 'PLAIN')
  assert.deepEqual(lines, ['2026-01-15 Event'])
})

test('is case-insensitive', () => {
  const { style } = extractStyle('style compact\n2026-01-15')
  assert.equal(style, 'COMPACT')
})

test('strips STYLE line leaving remaining event lines intact', () => {
  const text = '2026-01-01 First\nSTYLE TABLE\n2026-06-01 Second'
  const { style, lines } = extractStyle(text)
  assert.equal(style, 'TABLE')
  assert.equal(lines.length, 2)
})

test('STYLES exports the four canonical names', () => {
  assert.deepEqual(STYLES, ['TYPOGRAPHIC', 'PLAIN', 'COMPACT', 'TABLE'])
})
