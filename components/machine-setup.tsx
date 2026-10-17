'use client'

import { supabase } from '@/lib/supabase'

// How the machine reports water temperature: Celsius, Fahrenheit, or the
// machine's own numbered steps (e.g. 1 (cold) … 5 (hot)).
export type TempMode = 'C' | 'F' | 'steps'

// Which dial direction makes the grind finer.
export type DialDirection = 'cw' | 'ccw'

export type MachineSetup = {
  machine: string
  machineDetails: string
  /** Basket diameter in mm (e.g. '54'). Dose grams live in the shot log. */
  basketDiameter: string
  tempMode: TempMode
  /** Default water temperature: value in tempMode, or the default step. */
  defaultTemp: string
  tempStepMin: string
  tempStepMax: string
  tempStepMinLabel: string
  tempStepMaxLabel: string
  preinfusionEnabled: boolean
  preinfusionSeconds: string
  /** Optional: empty means the grinder is built into the machine. */
  grinder: string
  grinderDetails: string
  grindMin: string
  grindMax: string
  dialDirection: DialDirection
}

export type ShotTemperature = {
  value: number
  unit: 'C' | 'F' | 'step'
}

type EquipmentRow = {
  type: string
  brand: string
  model: string
  settings: Record<string, unknown> | null
}

export const DIAL_DIRECTION_LABELS: Record<DialDirection, string> = {
  cw: 'Clockwise = finer',
  ccw: 'Counterclockwise = finer',
}

export const TEMP_MODE_LABELS: Record<TempMode, string> = {
  C: 'Celsius (°C)',
  F: 'Fahrenheit (°F)',
  steps: 'Machine steps (e.g. 1–5)',
}

// A brand-new setup starts empty on purpose: a fresh user gets guided through
// the questions instead of seeing somebody else's machine as their own.
export function emptyMachineSetup(): MachineSetup {
  return {
    machine: '',
    machineDetails: '',
    basketDiameter: '',
    tempMode: 'C',
    defaultTemp: '',
    tempStepMin: '1',
    tempStepMax: '5',
    tempStepMinLabel: 'cold',
    tempStepMaxLabel: 'hot',
    preinfusionEnabled: false,
    preinfusionSeconds: '5',
    grinder: '',
    grinderDetails: '',
    grindMin: '',
    grindMax: '',
    dialDirection: 'cw',
  }
}

function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseNumberList(value: unknown): number[] {
  const matches = str(value).match(/-?\d+(?:\.\d+)?/g)
  return matches ? matches.map(Number).filter(Number.isFinite) : []
}

function firstNumber(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return String(parsed)
    const fromText = parseNumberList(value)[0]
    if (fromText !== undefined) return String(fromText)
  }
  return ''
}

// Read the machine setup from the user's equipment rows. Settings saved by
// older versions of the app (free-text temperature, '1.8 — 3.2' ranges, ...)
// and by the old separate grinder card are mapped onto the new shape, so
// existing users keep their setup and only fill in what did not exist yet.
export function parseEquipmentSetup(rows: EquipmentRow[] | null): MachineSetup | null {
  const machineRow = rows?.find((row) => row.type === 'machine')
  if (!machineRow) return null
  const grinderRow = rows?.find((row) => row.type === 'grinder')
  // Machine settings win over legacy grinder settings when both define a key.
  const merged: Record<string, unknown> = {
    ...(grinderRow?.settings ?? {}),
    ...(machineRow.settings ?? {}),
  }

  const setup = emptyMachineSetup()
  setup.machine = `${machineRow.brand} ${machineRow.model}`.trim()
  setup.machineDetails = str(merged.machineDetails)
  setup.basketDiameter = firstNumber(merged.basketDiameter)

  // Water temperature: new shape first, then the legacy free-text value
  // ('93°C' / '199°F') or the seed's bare temp_celsius number.
  const mode = str(merged.tempMode)
  setup.tempMode =
    mode === 'C' || mode === 'F' || mode === 'steps'
      ? mode
      : /f/i.test(str(merged.temperature))
        ? 'F'
        : 'C'
  setup.defaultTemp =
    firstNumber(merged.defaultTemp) ||
    (setup.tempMode === 'steps' ? '' : firstNumber(merged.temperature, merged.temp_celsius))
  setup.tempStepMin = firstNumber(merged.tempStepMin, setup.tempStepMin) || '1'
  setup.tempStepMax = firstNumber(merged.tempStepMax, setup.tempStepMax) || '5'
  setup.tempStepMinLabel = str(merged.tempStepMinLabel) || setup.tempStepMinLabel
  setup.tempStepMaxLabel = str(merged.tempStepMaxLabel) || setup.tempStepMaxLabel

  // Pre-infusion
  const preinfusionSeconds = firstNumber(merged.preinfusionSeconds, merged.preinfusion)
  if (typeof merged.preinfusionEnabled === 'boolean') {
    setup.preinfusionEnabled = merged.preinfusionEnabled
  } else {
    setup.preinfusionEnabled = preinfusionSeconds !== '' && Number(preinfusionSeconds) > 0
  }
  if (preinfusionSeconds !== '') setup.preinfusionSeconds = preinfusionSeconds

  // Grinding (legacy values lived on the separate grinder row)
  const range = parseNumberList(merged.grindRange)
  setup.grindMin = firstNumber(merged.grindMin, range[0])
  setup.grindMax = firstNumber(merged.grindMax, range[1])
  const direction = str(merged.dialDirection)
  setup.dialDirection =
    direction === 'cw' || direction === 'ccw'
      ? direction
      : /counter/i.test(direction)
        ? 'ccw'
        : 'cw'
  setup.grinder = str(merged.grinder)
  if (!setup.grinder && grinderRow) {
    setup.grinder = `${grinderRow.brand} ${grinderRow.model}`.trim()
  }
  setup.grinderDetails = str(merged.grinderDetails)

  return setup
}

// The grind range the shot log validates against, or null when incomplete.
export function grindRangeOf(setup: MachineSetup | null): { min: number; max: number } | null {
  if (!setup) return null
  const min = Number(setup.grindMin)
  const max = Number(setup.grindMax)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  return { min, max }
}

// The valid temperature bounds for the shot log, or null when unknown.
export function tempBoundsOf(setup: MachineSetup | null): { min: number; max: number } | null {
  if (!setup) return { min: 0, max: 100 }
  if (setup.tempMode === 'C') return { min: 0, max: 100 }
  if (setup.tempMode === 'F') return { min: 32, max: 212 }
  const min = Number(setup.tempStepMin)
  const max = Number(setup.tempStepMax)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  return { min, max }
}

export function tempUnitSuffix(mode: TempMode): string {
  return mode === 'C' ? '°C' : mode === 'F' ? '°F' : 'step'
}

// Setup-page summary, e.g. "93 °C", "199 °F" or "Step 3 · 1–5".
export function formatTempDisplay(setup: MachineSetup): string {
  if (!setup.defaultTemp) return '—'
  if (setup.tempMode === 'steps') {
    return `Step ${setup.defaultTemp} · ${setup.tempStepMin}–${setup.tempStepMax}`
  }
  return `${setup.defaultTemp} ${tempUnitSuffix(setup.tempMode)}`
}

// Shot detail summary, e.g. "93 °C", "199 °F" or "Step 3".
export function formatShotTemp(temperature: ShotTemperature): string {
  if (temperature.unit === 'step') return `Step ${temperature.value}`
  return `${temperature.value} ${temperature.unit === 'F' ? '°F' : '°C'}`
}

// Map a row from public.shots onto the display shape, keeping shots logged
// before the unit-aware columns existed readable as Celsius.
export function shotTemperatureFromRow(item: Record<string, unknown>): ShotTemperature | null {
  const value = item.temp_value
  const unit = item.temp_unit
  if (value !== null && value !== undefined && (unit === 'C' || unit === 'F' || unit === 'step')) {
    return { value: Number(value), unit }
  }
  const celsius = item.temp_celsius
  if (celsius !== null && celsius !== undefined && Number.isFinite(Number(celsius))) {
    return { value: Number(celsius), unit: 'C' }
  }
  return null
}

export type MachineSetupStep = 'machine' | 'basket' | 'grinding' | 'temperature' | 'preinfusion'

// Returns an error message for the step, or null when it is complete.
export function validateMachineSetupStep(
  setup: MachineSetup,
  step: MachineSetupStep
): string | null {
  if (step === 'machine') {
    if (!setup.machine.trim()) return 'Enter your machine, e.g. “La Marzocco Linea Mini”.'
    return null
  }
  if (step === 'basket') {
    const diameter = Number(setup.basketDiameter)
    if (!setup.basketDiameter || !Number.isFinite(diameter) || diameter < 30 || diameter > 100) {
      return 'Enter the basket diameter in mm, e.g. 54.'
    }
    return null
  }
  if (step === 'grinding') {
    const min = Number(setup.grindMin)
    const max = Number(setup.grindMax)
    if (setup.grindMin === '' || !Number.isFinite(min)) return 'Enter the lowest grind setting.'
    if (setup.grindMax === '' || !Number.isFinite(max)) return 'Enter the highest grind setting.'
    if (max <= min) return 'The highest setting must be larger than the lowest.'
    return null
  }
  if (step === 'temperature') {
    if (setup.tempMode === 'steps') {
      const min = Number(setup.tempStepMin)
      const max = Number(setup.tempStepMax)
      const current = Number(setup.defaultTemp)
      if (setup.tempStepMin === '' || !Number.isFinite(min)) return 'Enter the first step, e.g. 1.'
      if (setup.tempStepMax === '' || !Number.isFinite(max)) return 'Enter the last step, e.g. 5.'
      if (max <= min) return 'The last step must be larger than the first.'
      if (setup.defaultTemp === '' || !Number.isFinite(current)) return 'Enter the default step.'
      if (current < min || current > max) return `Default step must be between ${min} and ${max}.`
      return null
    }
    const value = Number(setup.defaultTemp)
    const bounds = setup.tempMode === 'F' ? { min: 32, max: 212 } : { min: 0, max: 100 }
    if (setup.defaultTemp === '' || !Number.isFinite(value)) {
      return `Enter the default temperature in ${setup.tempMode === 'F' ? 'Fahrenheit' : 'Celsius'}.`
    }
    if (value < bounds.min || value > bounds.max) {
      return `Temperature must be between ${bounds.min} and ${bounds.max} °${setup.tempMode}.`
    }
    return null
  }
  // preinfusion
  if (setup.preinfusionEnabled) {
    const seconds = Number(setup.preinfusionSeconds)
    if (setup.preinfusionSeconds === '' || !Number.isFinite(seconds) || seconds < 0 || seconds > 60) {
      return 'Enter the pre-infusion time in seconds (0–60).'
    }
  }
  return null
}

// Persist the machine setup. Updates the existing (user_id, type) row when
// present so repeated saves never create duplicates.
export async function saveMachineSetup(
  userId: string,
  setup: MachineSetup
): Promise<MachineSetup> {
  const payload = {
    brand: setup.machine.trim().split(' ')[0] || 'Espresso',
    model: setup.machine.trim().split(' ').slice(1).join(' ') || 'Machine',
    settings: {
      machineDetails: setup.machineDetails.trim(),
      basketDiameter: setup.basketDiameter,
      tempMode: setup.tempMode,
      defaultTemp: setup.defaultTemp,
      tempStepMin: setup.tempStepMin,
      tempStepMax: setup.tempStepMax,
      tempStepMinLabel: setup.tempStepMinLabel.trim(),
      tempStepMaxLabel: setup.tempStepMaxLabel.trim(),
      preinfusionEnabled: setup.preinfusionEnabled,
      preinfusionSeconds: setup.preinfusionSeconds,
      grinder: setup.grinder.trim(),
      grinderDetails: setup.grinderDetails.trim(),
      grindMin: setup.grindMin,
      grindMax: setup.grindMax,
      dialDirection: setup.dialDirection,
    },
  }

  const { data: existing, error: selectError } = await supabase
    .from('equipment')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'machine')
    .order('created_at', { ascending: false })
    .limit(1)
  if (selectError) throw selectError

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('equipment')
      .update(payload)
      .eq('id', existing[0].id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('equipment')
      .insert({ user_id: userId, type: 'machine', ...payload })
    if (error) throw error
  }

  return {
    ...setup,
    machine: `${payload.brand} ${payload.model}`,
    machineDetails: payload.settings.machineDetails,
    grinder: payload.settings.grinder,
    grinderDetails: payload.settings.grinderDetails,
  }
}
