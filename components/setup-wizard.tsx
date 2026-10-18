'use client'

import { useState } from 'react'
import { Check, ChevronLeft, Coffee, Loader2, X } from 'lucide-react'
import {
  DIAL_DIRECTION_LABELS,
  TEMP_MODE_LABELS,
  emptyMachineSetup,
  saveMachineSetup,
  validateMachineSetupStep,
  type DialDirection,
  type MachineSetup,
  type MachineSetupStep,
  type TempMode,
} from '@/components/machine-setup'

const STEPS: Array<{ key: MachineSetupStep; label: string; title: string; description: string }> = [
  {
    key: 'machine',
    label: 'YOUR MACHINE',
    title: 'Which machine do you brew on?',
    description: 'Start with the heart of your setup. You can change everything later.',
  },
  {
    key: 'basket',
    label: 'BASKET',
    title: 'Filter basket diameter',
    description: 'Baskets are sized by diameter — grams are a per-shot choice in the shot log.',
  },
  {
    key: 'grinding',
    label: 'GRINDING',
    title: 'Grinding settings',
    description:
      'Grinding belongs to the machine setup — built-in or external, the settings live here.',
  },
  {
    key: 'temperature',
    label: 'WATER TEMPERATURE',
    title: 'Default water temperature',
    description: 'How does your machine indicate temperature? Every shot can still override it.',
  },
  {
    key: 'preinfusion',
    label: 'PRE-INFUSION',
    title: 'Pre-infusion',
    description: 'Does your machine pre-infuse, and for how many seconds?',
  },
]

function NumberField({
  label,
  small,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
  placeholder,
}: {
  label: string
  small?: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  min?: number
  max?: number
  step?: number | string
  placeholder?: string
}) {
  return (
    <label className="form-field">
      <span>
        {label} {small && <small>{small}</small>}
      </span>
      <div className="number-field">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required
        />
        {suffix && <span>{suffix}</span>}
      </div>
    </label>
  )
}

export function SetupWizard({
  userId,
  initial,
  onClose,
  onSaved,
}: {
  userId: string
  initial: MachineSetup | null
  onClose: () => void
  onSaved: (setup: MachineSetup) => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [setup, setSetup] = useState<MachineSetup>(initial ?? emptyMachineSetup())
  const [saving, setSaving] = useState(false)

  const step = STEPS[stepIndex]
  const error = validateMachineSetupStep(setup, step.key)
  const isLast = stepIndex === STEPS.length - 1

  function update(patch: Partial<MachineSetup>) {
    setSetup((current) => ({ ...current, ...patch }))
  }

  async function finish() {
    setSaving(true)
    try {
      const saved = await saveMachineSetup(userId, setup)
      onSaved(saved)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please check your connection'
      alert(`Could not save your setup: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  function body() {
    switch (step.key) {
      case 'machine':
        return (
          <>
            <label className="form-field">
              <span>Espresso machine</span>
              <input
                value={setup.machine}
                onChange={(event) => update({ machine: event.target.value })}
                placeholder="e.g. La Marzocco Linea Mini"
                required
              />
            </label>
            <label className="form-field">
              <span>
                Details <small>optional</small>
              </span>
              <input
                value={setup.machineDetails}
                onChange={(event) => update({ machineDetails: event.target.value })}
                placeholder="e.g. Dual boiler · 58 mm portafilter"
              />
            </label>
          </>
        )
      case 'basket':
        return (
          <>
            <NumberField
              label="Basket diameter"
              value={setup.basketDiameter}
              onChange={(basketDiameter) => update({ basketDiameter })}
              suffix="mm"
              min={30}
              max={100}
              placeholder="e.g. 54"
            />
            <p className="wizard-hint">
              Your basket is described by its diameter — 54 mm, 58 mm and so on. How many grams
              you dose depends on the shot you pull, so the grams are entered in the shot log
              instead of here.
            </p>
          </>
        )
      case 'grinding':
        return (
          <>
            <NumberField
              label="Lowest grind setting"
              value={setup.grindMin}
              onChange={(grindMin) => update({ grindMin })}
              step="any"
              placeholder="e.g. 1"
            />
            <NumberField
              label="Highest grind setting"
              value={setup.grindMax}
              onChange={(grindMax) => update({ grindMax })}
              step="any"
              placeholder="e.g. 5"
            />
            <label className="form-field">
              <span>Dial direction</span>
              <select
                value={setup.dialDirection}
                onChange={(event) => update({ dialDirection: event.target.value as DialDirection })}
              >
                {(Object.keys(DIAL_DIRECTION_LABELS) as DialDirection[]).map((direction) => (
                  <option key={direction} value={direction}>
                    {DIAL_DIRECTION_LABELS[direction]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>
                Grinder <small>optional</small>
              </span>
              <input
                value={setup.grinder}
                onChange={(event) => update({ grinder: event.target.value })}
                placeholder="e.g. Niche Zero — leave empty if built into the machine"
              />
            </label>
            <label className="form-field">
              <span>
                Grinder details <small>optional</small>
              </span>
              <input
                value={setup.grinderDetails}
                onChange={(event) => update({ grinderDetails: event.target.value })}
                placeholder="e.g. Single dose · 63 mm conical burrs"
              />
            </label>
            <p className="wizard-hint">
              The shot log will let you pick grind settings only between these two numbers.
            </p>
          </>
        )
      case 'temperature':
        return (
          <>
            <label className="form-field">
              <span>How does your machine indicate temperature?</span>
              <select
                value={setup.tempMode}
                onChange={(event) => update({ tempMode: event.target.value as TempMode })}
              >
                {(Object.keys(TEMP_MODE_LABELS) as TempMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {TEMP_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            {setup.tempMode !== 'steps' ? (
              <NumberField
                label="Default water temperature"
                value={setup.defaultTemp}
                onChange={(defaultTemp) => update({ defaultTemp })}
                suffix={setup.tempMode === 'C' ? '°C' : '°F'}
                min={setup.tempMode === 'C' ? 0 : 32}
                max={setup.tempMode === 'C' ? 100 : 212}
                placeholder={setup.tempMode === 'C' ? 'e.g. 93' : 'e.g. 199'}
              />
            ) : (
              <>
                <div className="wizard-pair">
                  <NumberField
                    label="First step"
                    value={setup.tempStepMin}
                    onChange={(tempStepMin) => update({ tempStepMin })}
                    step="any"
                    placeholder="1"
                  />
                  <NumberField
                    label="Last step"
                    value={setup.tempStepMax}
                    onChange={(tempStepMax) => update({ tempStepMax })}
                    step="any"
                    placeholder="5"
                  />
                </div>
                <div className="wizard-pair">
                  <label className="form-field">
                    <span>
                      First step label <small>optional</small>
                    </span>
                    <input
                      value={setup.tempStepMinLabel}
                      onChange={(event) => update({ tempStepMinLabel: event.target.value })}
                      placeholder="cold"
                    />
                  </label>
                  <label className="form-field">
                    <span>
                      Last step label <small>optional</small>
                    </span>
                    <input
                      value={setup.tempStepMaxLabel}
                      onChange={(event) => update({ tempStepMaxLabel: event.target.value })}
                      placeholder="hot"
                    />
                  </label>
                </div>
                <NumberField
                  label="Default step"
                  value={setup.defaultTemp}
                  onChange={(defaultTemp) => update({ defaultTemp })}
                  step="any"
                  placeholder="e.g. 3"
                />
                <p className="wizard-hint">
                  Your scale runs from {setup.tempStepMin || '?'} ({setup.tempStepMinLabel || 'min'}){' '}
                  to {setup.tempStepMax || '?'} ({setup.tempStepMaxLabel || 'max'}).
                </p>
              </>
            )}
            <p className="wizard-hint">
              This becomes the default of every new shot — adjust it per shot when needed.
            </p>
          </>
        )
      case 'preinfusion':
        return (
          <>
            <div className="choice-row" role="radiogroup" aria-label="Pre-infusion">
              <button
                type="button"
                className={`choice-card ${!setup.preinfusionEnabled ? 'selected' : ''}`}
                onClick={() => update({ preinfusionEnabled: false })}
              >
                No pre-infusion
              </button>
              <button
                type="button"
                className={`choice-card ${setup.preinfusionEnabled ? 'selected' : ''}`}
                onClick={() => update({ preinfusionEnabled: true })}
              >
                Pre-infusion
              </button>
            </div>
            {setup.preinfusionEnabled && (
              <NumberField
                label="Pre-infusion time"
                value={setup.preinfusionSeconds}
                onChange={(preinfusionSeconds) => update({ preinfusionSeconds })}
                suffix="s"
                min={0}
                max={60}
                step={1}
                placeholder="e.g. 5"
              />
            )}
          </>
        )
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="log-modal setup-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        <div className="modal-header">
          <div>
            <div className="card-eyebrow">
              <Coffee size={13} /> SET UP YOUR MACHINE
            </div>
            <h2 id="wizard-title">{step.title}</h2>
            <p>{step.description}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close setup">
            <X size={19} />
          </button>
        </div>

        <div className="wizard-progress" aria-hidden="true">
          <span>
            STEP {stepIndex + 1} OF {STEPS.length} · {step.label}
          </span>
          <div className="wizard-bars">
            {STEPS.map((entry, index) => (
              <i key={entry.key} className={index <= stepIndex ? 'done' : ''} />
            ))}
          </div>
        </div>

        <div className="wizard-body">{body()}</div>

        <div className="modal-actions wizard-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => (stepIndex === 0 ? onClose() : setStepIndex(stepIndex - 1))}
            disabled={saving}
          >
            {stepIndex === 0 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft size={13} /> Back
              </>
            )}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={Boolean(error) || saving}
            onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : isLast ? (
              <>
                <Check size={16} /> Save setup
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
        {error && (
          <p className="wizard-step-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
