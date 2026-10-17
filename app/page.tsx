'use client'

import { useEffect, useMemo, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bean,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Trash2,
  User as UserIcon,
  X,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthModal } from '@/components/auth-modal'
import { SetupWizard } from '@/components/setup-wizard'
import {
  DIAL_DIRECTION_LABELS,
  TEMP_MODE_LABELS,
  formatShotTemp,
  formatTempDisplay,
  grindRangeOf,
  parseEquipmentSetup,
  saveMachineSetup,
  shotTemperatureFromRow,
  tempBoundsOf,
  tempUnitSuffix,
  validateMachineSetupStep,
  type DialDirection,
  type MachineSetup,
  type ShotTemperature,
  type TempMode,
} from '@/components/machine-setup'
import type { User } from '@supabase/supabase-js'

export type Shot = {
  id: string
  bean: string
  roaster: string
  date: string
  dose: number
  yield: number
  grind: number
  time: number
  rating: number
  flavors: string[]
  acidity: number
  bitterness: number
  notes: string
  temp: ShotTemperature | null
  created_at: string
}

// One unique coffee on the shelf, aggregated from its (date-desc) shots.
// Pre-entered beans without any shots yet have shots === 0 and latestShot null.
export type BeanSummary = {
  key: string
  name: string
  roaster: string
  shots: number
  avgRating: string
  avgGrind: string
  lastDate: string
  latestShot: Shot | null
}

// A bean pre-entered in the bean section (public.beans row), reusable when
// logging new shots.
export type BeanRecord = {
  id: string
  name: string
  roaster: string
  created_at: string
}

// Sentinel option value of the "create new bean" entry in the shot dialog.
const NEW_BEAN_CHOICE = '__new__'

const navItems = [
  { name: 'Overview', icon: Activity },
  { name: 'My shots', icon: Coffee },
  { name: 'Coffee shelf', icon: Bean },
]

const FORM_DEFAULTS = {
  dose: '18.0',
  yieldAmount: '38',
  grind: '2.4',
  time: '28',
  bean: '',
  roaster: '',
  notes: '',
  selectedFlavors: ['Chocolate'],
  acidity: 3,
  bitterness: 2,
  rating: 4,
}

// Hydration-safe "is mounted" flag: the server snapshot (and thus the first
// client render) is false, so prerendered HTML and hydration agree; after
// hydration React re-reads the store and re-renders with the real value.
const subscribeNoop = () => () => {}

function AppLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <Coffee size={19} strokeWidth={1.8} />
    </div>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Activity
  trend?: 'up' | 'down'
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={16} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">
        {trend && (
          <span className="trend">
            <ArrowUpRight size={13} />
          </span>
        )}
        {detail}
      </div>
    </article>
  )
}

function ShotCard({ shot, onClick }: { shot: Shot; onClick: () => void }) {
  return (
    <button type="button" className="shot-row" onClick={onClick}>
      <span className="shot-bean-icon">
        <Bean size={17} />
      </span>
      <span className="shot-main">
        <span className="shot-name">{shot.bean}</span>
        <span className="shot-roaster">{shot.roaster}</span>
      </span>
      <span className="shot-recipe">
        <strong>{shot.dose}g</strong>
        <span>in</span>
        <strong>{shot.yield}g</strong>
        <span>out</span>
      </span>
      <span className="shot-time">
        <Clock3 size={13} /> {shot.time}s
      </span>
      <span className="shot-rating" aria-label={`${shot.rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={12}
            fill={i < shot.rating ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span className="shot-date">{shot.date}</span>
      <ChevronRight className="shot-chevron" size={16} />
    </button>
  )
}

function BeanCard({ bean, onClick }: { bean: BeanSummary; onClick: () => void }) {
  return (
    <button type="button" className="shot-row" onClick={onClick}>
      <span className="shot-bean-icon">
        <Bean size={17} />
      </span>
      <span className="shot-main">
        <span className="shot-name">{bean.name}</span>
        <span className="shot-roaster">{bean.roaster}</span>
      </span>
      <span className="shot-recipe">
        <strong>{bean.shots}</strong>
        <span>{bean.shots === 1 ? 'shot' : 'shots'}</span>
      </span>
      <span className="shot-time">
        <Settings2 size={13} /> {bean.avgGrind || '—'}
      </span>
      {bean.shots > 0 ? (
        <span
          className="shot-rating"
          aria-label={`Average ${bean.avgRating} out of 5 stars`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={12}
              fill={i < Math.round(Number(bean.avgRating)) ? 'currentColor' : 'none'}
            />
          ))}
        </span>
      ) : (
        <span className="shot-rating" aria-label="No ratings yet">
          —
        </span>
      )}
      <span className="shot-date">{bean.lastDate || 'Not yet brewed'}</span>
      <ChevronRight className="shot-chevron" size={16} />
    </button>
  )
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [shots, setShots] = useState<Shot[]>([])
  const [loadingShots, setLoadingShots] = useState(true)
  const [activeNav, setActiveNav] = useState('Overview')
  const [showLog, setShowLog] = useState(false)
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null)
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)

  // Log form state
  const [dose, setDose] = useState(FORM_DEFAULTS.dose)
  const [yieldAmount, setYieldAmount] = useState(FORM_DEFAULTS.yieldAmount)
  const [grind, setGrind] = useState(FORM_DEFAULTS.grind)
  const [time, setTime] = useState(FORM_DEFAULTS.time)
  const [temp, setTemp] = useState('')
  const [bean, setBean] = useState(FORM_DEFAULTS.bean)
  const [roaster, setRoaster] = useState(FORM_DEFAULTS.roaster)
  const [notes, setNotes] = useState(FORM_DEFAULTS.notes)
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([...FORM_DEFAULTS.selectedFlavors])
  const [acidity, setAcidity] = useState(FORM_DEFAULTS.acidity)
  const [bitterness, setBitterness] = useState(FORM_DEFAULTS.bitterness)
  const [rating, setRating] = useState(FORM_DEFAULTS.rating)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Bean section: pre-entered beans + the "Add bean" dialog
  const [beanCatalog, setBeanCatalog] = useState<BeanRecord[]>([])
  const [showAddBean, setShowAddBean] = useState(false)
  const [newBeanName, setNewBeanName] = useState('')
  const [newBeanRoaster, setNewBeanRoaster] = useState('')
  const [savingBean, setSavingBean] = useState(false)

  // Shot dialog bean selection: '' (unset) | NEW_BEAN_CHOICE | `${name}|${roaster}`
  const [beanChoice, setBeanChoice] = useState('')

  // Machine setup from the equipment table. null = no machine set up yet,
  // which guides the user through the setup wizard on login.
  const [machineSetup, setMachineSetup] = useState<MachineSetup | null>(null)
  const [setupLoaded, setSetupLoaded] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  // User that dismissed the wizard this session — session refreshes must not
  // nag them again, but a different login should still be guided.
  const wizardDismissedByRef = useRef<string | null>(null)

  // `new Date()` differs between the build-time prerender and the time the
  // page is viewed, which caused React hydration error #418 on every load.
  // Render the date only after hydration instead.
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const today = isMounted ? new Date() : null
  const longDate = today
    ? today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
  const shortDate = today
    ? today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  // Format timestamp helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const isYesterday = d.toDateString() === yesterday.toDateString()

      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      if (isToday) return `Today, ${timeStr}`
      if (isYesterday) return `Yesterday, ${timeStr}`
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`
    } catch {
      return dateStr
    }
  }

  // Fetch shots from Supabase
  const fetchShots = useCallback(async (userId?: string) => {
    setLoadingShots(true)
    try {
      if (!userId) {
        setShots([])
        return
      }

      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const mapped: Shot[] = data.map((item: any) => ({
          id: item.id,
          bean: item.bean_name || 'Espresso Roast',
          roaster: item.roaster || 'Specialty Roaster',
          date: formatDate(item.created_at),
          dose: Number(item.dose_grams) || 18,
          yield: Number(item.yield_grams) || 36,
          grind: Number(item.grind_setting) || 2.5,
          time: Number(item.duration_seconds) || 28,
          rating: Number(item.rating) || 4,
          flavors: Array.isArray(item.flavors) ? item.flavors : [],
          acidity: Number(item.acidity) || 3,
          bitterness: Number(item.bitterness) || 2,
          notes: item.notes || '',
          temp: shotTemperatureFromRow(item),
          created_at: item.created_at,
        }))
        setShots(mapped)
      }
    } catch (err) {
      console.error('Error fetching shots:', err)
    } finally {
      setLoadingShots(false)
    }
  }, [])

  // Fetch pre-entered beans from Supabase
  const fetchBeans = useCallback(async (userId?: string) => {
    if (!userId) {
      setBeanCatalog([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('beans')
        .select('id, name, roaster, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      if (data) setBeanCatalog(data)
    } catch (err) {
      console.error('Error fetching beans:', err)
    }
  }, [])

  // Fetch the machine setup; a signed-in user without one gets the wizard.
  const fetchMachineSetup = useCallback(async (userId?: string) => {
    if (!userId) {
      wizardDismissedByRef.current = null
      setMachineSetup(null)
      setSetupLoaded(false)
      setWizardOpen(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const parsed = parseEquipmentSetup(data)
      setMachineSetup(parsed)
      setSetupLoaded(true)
      if (!parsed && wizardDismissedByRef.current !== userId) setWizardOpen(true)
    } catch (err) {
      console.error('Error fetching machine setup:', err)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        fetchShots(data.user.id)
        fetchBeans(data.user.id)
        fetchMachineSetup(data.user.id)
      } else {
        setShots([])
        fetchBeans()
        fetchMachineSetup()
        setLoadingShots(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchShots(currentUser.id)
        fetchBeans(currentUser.id)
        fetchMachineSetup(currentUser.id)
      } else {
        setShots([])
        fetchBeans()
        fetchMachineSetup()
        setLoadingShots(false)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [fetchShots, fetchBeans, fetchMachineSetup])

  const username =
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'Guest Barista'
  const userInitial = username.charAt(0).toUpperCase()

  const filteredShots = useMemo(
    () =>
      shots.filter((shot) =>
        `${shot.bean} ${shot.roaster} ${shot.flavors.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [shots, search]
  )

  // Derived user statistics
  const stats = useMemo(() => {
    if (!shots.length) {
      return {
        total: 0,
        thisWeek: 0,
        favoriteRatio: '1 : 2.0',
        avgDoseYield: '18g in · 36g out',
        topBean: 'No beans logged yet',
        avgRating: '0.0',
        favoriteShot: null,
      }
    }

    const total = shots.length
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = shots.filter((s) => new Date(s.created_at) >= oneWeekAgo).length

    const totalDose = shots.reduce((acc, s) => acc + s.dose, 0)
    const totalYield = shots.reduce((acc, s) => acc + s.yield, 0)
    const avgDose = (totalDose / total).toFixed(1)
    const avgYield = Math.round(totalYield / total)
    const ratio = (Number(avgYield) / (Number(avgDose) || 1)).toFixed(1)

    // Top rated bean
    const beanRatings: Record<string, { totalRating: number; count: number }> = {}
    shots.forEach((s) => {
      if (!beanRatings[s.bean]) beanRatings[s.bean] = { totalRating: 0, count: 0 }
      beanRatings[s.bean].totalRating += s.rating
      beanRatings[s.bean].count += 1
    })

    let topBean = shots[0].bean
    let maxAvg = 0
    Object.entries(beanRatings).forEach(([name, data]) => {
      const avg = data.totalRating / data.count
      if (avg > maxAvg) {
        maxAvg = avg
        topBean = name
      }
    })

    const favoriteShot = [...shots].sort((a, b) => b.rating - a.rating)[0]

    return {
      total,
      thisWeek,
      favoriteRatio: `1 : ${ratio}`,
      avgDoseYield: `${avgDose}g in · ${avgYield}g out`,
      topBean,
      avgRating: maxAvg > 0 ? maxAvg.toFixed(1) : '5.0',
      favoriteShot,
    }
  }, [shots])

  // Derived validation for the machine-dependent shot fields: the grind must
  // stay inside the range defined in the machine setup, the temperature
  // follows the machine's unit (or step scale).
  const grindRange = grindRangeOf(machineSetup)
  const grindValue = grind.trim() === '' ? NaN : Number(grind)
  const grindError =
    !Number.isFinite(grindValue)
      ? 'Enter a grind setting.'
      : grindRange && (grindValue < grindRange.min || grindValue > grindRange.max)
        ? `Grind must be between ${grindRange.min} and ${grindRange.max} — your machine's range.`
        : null

  const shotTempMode: ShotTemperature['unit'] =
    machineSetup ? (machineSetup.tempMode === 'steps' ? 'step' : machineSetup.tempMode) : 'C'
  const tempBounds = tempBoundsOf(machineSetup)
  const tempValue = temp.trim() === '' ? NaN : Number(temp)
  const tempError =
    temp.trim() === ''
      ? null
      : !Number.isFinite(tempValue)
        ? 'Enter a temperature.'
        : tempBounds && (tempValue < tempBounds.min || tempValue > tempBounds.max)
          ? `Temperature must be between ${tempBounds.min} and ${tempBounds.max}${
              shotTempMode === 'step' ? ' (steps)' : ` °${shotTempMode}`
            }.`
          : null

  async function saveShot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (grindError || tempError) return

    setSaving(true)
    try {
      const beanName = bean.trim() || 'House Espresso'
      const roasterName = roaster.trim() || 'My roaster'
      const doseNum = Number(dose) || 18
      const yieldNum = Number(yieldAmount) || 36
      const grindNum = Number(grind) || 2.5
      const timeNum = Number(time) || 28
      const hasTemp = temp.trim() !== '' && Number.isFinite(Number(temp))
      const tempNum = hasTemp ? Number(temp) : null

      // Ensure the bean exists in the catalog so it can be reused from the
      // dropdown the next time a shot is logged.
      const { data: beanRows, error: beanLookupError } = await supabase
        .from('beans')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', beanName)
        .eq('roaster', roasterName)
        .limit(1)
      if (beanLookupError) throw beanLookupError

      let beanId: string | null = beanRows?.[0]?.id ?? null
      if (!beanId) {
        const { data: createdBean, error: beanInsertError } = await supabase
          .from('beans')
          .insert({ user_id: user.id, name: beanName, roaster: roasterName })
          .select('id, name, roaster, created_at')
          .single()
        if (beanInsertError) throw beanInsertError
        beanId = createdBean.id
        setBeanCatalog((prev) => [...prev, createdBean])
      }

      const { data, error } = await supabase
        .from('shots')
        .insert({
          user_id: user.id,
          bean_id: beanId,
          bean_name: beanName,
          roaster: roasterName,
          dose_grams: doseNum,
          yield_grams: yieldNum,
          grind_setting: grindNum,
          duration_seconds: timeNum,
          // Store the temperature exactly as entered; temp_celsius keeps the
          // canonical Celsius value for C/F so older readers keep working.
          temp_value: tempNum,
          temp_unit: tempNum !== null ? shotTempMode : null,
          temp_celsius:
            tempNum === null
              ? null
              : shotTempMode === 'C'
                ? tempNum
                : shotTempMode === 'F'
                  ? Math.round(((tempNum - 32) * 5) / 9 * 10) / 10
                  : null,
          rating,
          flavors: selectedFlavors,
          acidity,
          bitterness,
          notes: notes.trim(),
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        const created: Shot = {
          id: data.id,
          bean: data.bean_name,
          roaster: data.roaster,
          date: 'Just now',
          dose: Number(data.dose_grams),
          yield: Number(data.yield_grams),
          grind: Number(data.grind_setting),
          time: Number(data.duration_seconds),
          rating: Number(data.rating),
          flavors: Array.isArray(data.flavors) ? data.flavors : [],
          acidity: Number(data.acidity),
          bitterness: Number(data.bitterness),
          notes: data.notes || '',
          temp: shotTemperatureFromRow(data),
          created_at: data.created_at,
        }
        setShots((prev) => [created, ...prev])
      }

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setShowLog(false)
        // Reset the whole form so the next shot doesn't inherit flavors,
        // rating, sliders or recipe values from this one.
        setDose(FORM_DEFAULTS.dose)
        setYieldAmount(FORM_DEFAULTS.yieldAmount)
        setGrind(FORM_DEFAULTS.grind)
        setTime(FORM_DEFAULTS.time)
        setTemp(machineSetup?.defaultTemp ?? '')
        setBean(FORM_DEFAULTS.bean)
        setRoaster(FORM_DEFAULTS.roaster)
        setBeanChoice('')
        setNotes(FORM_DEFAULTS.notes)
        setSelectedFlavors([...FORM_DEFAULTS.selectedFlavors])
        setAcidity(FORM_DEFAULTS.acidity)
        setBitterness(FORM_DEFAULTS.bitterness)
        setRating(FORM_DEFAULTS.rating)
      }, 700)
    } catch (err: any) {
      alert(`Could not save shot: ${err.message || 'Please check your connection'}`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteShot(id: string) {
    if (!confirm('Are you sure you want to delete this shot?')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('shots').delete().eq('id', id)
      if (error) throw error
      setShots((prev) => prev.filter((s) => s.id !== id))
      setSelectedShot(null)
    } catch (err: any) {
      alert(`Error deleting shot: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Pre-enter a bean in the bean section so it can be reused in the shot dialog.
  async function addBean(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    const name = newBeanName.trim()
    const roasterName = newBeanRoaster.trim() || 'My roaster'
    if (!name) return
    if (beanCatalog.some((b) => b.name === name && b.roaster === roasterName)) {
      alert('This bean is already on your shelf.')
      return
    }
    setSavingBean(true)
    try {
      const { data, error } = await supabase
        .from('beans')
        .insert({ user_id: user.id, name, roaster: roasterName })
        .select('id, name, roaster, created_at')
        .single()
      if (error) throw error
      if (data) setBeanCatalog((prev) => [...prev, data])
      setNewBeanName('')
      setNewBeanRoaster('')
      setShowAddBean(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please check your connection'
      alert(`Could not add bean: ${message}`)
    } finally {
      setSavingBean(false)
    }
  }

  function toggleFlavor(flavor: string) {
    setSelectedFlavors((current) =>
      current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor]
    )
  }

  // Open the shot dialog seeded from the machine setup: the grind is clamped
  // into the machine's range (also for recipes logged before the range
  // existed) and the temperature starts at the machine's default.
  function openLogDialog() {
    const range = grindRangeOf(machineSetup)
    if (range) {
      setGrind((current) => {
        if (current.trim() === '') return current
        const value = Number(current)
        if (!Number.isFinite(value)) return current
        return String(Math.min(Math.max(value, range.min), range.max))
      })
    }
    setTemp(machineSetup?.defaultTemp ?? '')
    setShowLog(true)
  }

  // Preselect a bean in the shot dialog: match it against the known beans and
  // fall back to the "create new" inputs (keeping the values) when unknown.
  function chooseBean(name: string, roasterName: string) {
    const match = beanOptions.find((b) => b.name === name && b.roaster === roasterName)
    setBean(name)
    setRoaster(roasterName)
    setBeanChoice(match ? match.key : NEW_BEAN_CHOICE)
  }

  // Every bean known to the journal for the shot dialog dropdown: pre-entered
  // catalog entries plus beans that only exist on older shots. Deliberately not
  // wrapped in useMemo — the derivation is tiny, and manual memoization of this
  // shape trips react-hooks/preserve-manual-memoization (lint error on main's
  // toolchain), so keep it as plain code.
  const allBeans: Array<BeanRecord & { key: string }> = [
    ...beanCatalog.map((b) => ({ ...b, key: `${b.name}|${b.roaster}` })),
    ...shots.map((s) => ({
      key: `${s.bean}|${s.roaster}`,
      id: '',
      name: s.bean,
      roaster: s.roaster,
      created_at: '',
    })),
  ]
  const beanOptions = allBeans
    .filter(
      (option, index) =>
        allBeans.findIndex(
          (other) => other.name === option.name && other.roaster === option.roaster
        ) === index
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.roaster.localeCompare(b.roaster))

  // Without any known beans the dialog starts directly in "create new" mode.
  const isCreatingNewBean =
    beanChoice === NEW_BEAN_CHOICE || (beanChoice === '' && beanOptions.length === 0)
  const selectedBeanLocked = beanChoice !== '' && !isCreatingNewBean

  // Unique coffees for the shelf, aggregated from shots (newest-first order),
  // so the first shot seen per bean is its most recent one. Pre-entered beans
  // without shots are listed first.
  const beans = useMemo(() => {
    const map = new Map<string, BeanSummary>()
    beanCatalog
      .filter((b) =>
        `${b.name} ${b.roaster}`.toLowerCase().includes(search.toLowerCase())
      )
      .forEach((b) => {
        map.set(`${b.name}|${b.roaster}`, {
          key: `${b.name}|${b.roaster}`,
          name: b.name,
          roaster: b.roaster,
          shots: 0,
          avgRating: '',
          avgGrind: '',
          lastDate: '',
          latestShot: null,
        })
      })
    filteredShots.forEach((shot) => {
      const key = `${shot.bean}|${shot.roaster}`
      const existing = map.get(key)
      if (existing) {
        existing.shots += 1
        if (existing.latestShot) {
          existing.avgRating = (
            ((Number(existing.avgRating) * (existing.shots - 1)) + shot.rating) /
            existing.shots
          ).toFixed(1)
        } else {
          // First shot for a pre-entered bean fills in its stats.
          existing.avgRating = shot.rating.toFixed(1)
          existing.avgGrind = String(shot.grind)
          existing.lastDate = shot.date
          existing.latestShot = shot
        }
      } else {
        map.set(key, {
          key,
          name: shot.bean,
          roaster: shot.roaster,
          shots: 1,
          avgRating: shot.rating.toFixed(1),
          avgGrind: String(shot.grind),
          lastDate: shot.date,
          latestShot: shot,
        })
      }
    })
    return Array.from(map.values())
  }, [filteredShots, beanCatalog, search])

  const isShelf = activeNav === 'Coffee shelf'
  const displayedShots = isShelf ? [] : filteredShots
  const displayedBeans = isShelf ? beans : []

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <AppLogo />
          <span>portafilter</span>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-label">YOUR COFFEE JOURNAL</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${activeNav === name ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(name)
                setMobileMenu(false)
              }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{name}</span>
              {name === 'My shots' && (
                <span className="nav-count">{shots.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label setup-label">YOUR SETUP</div>
        <button className="setup-card" onClick={() => setActiveNav('Setup')}>
          <span className="setup-icon">
            <Settings2 size={16} />
          </span>
          <span className="setup-copy">
            <strong>Espresso setup</strong>
            <small>
              {!user
                ? 'Set your gear'
                : setupLoaded && !machineSetup
                  ? 'Setup needed'
                  : 'Custom equipment'}
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <span className="tip-sparkle">
            <Sparkles size={15} />
          </span>
          <p>
            <strong>A little tip</strong>
            <br />
            A 1:2 ratio is a lovely place to start. Adjust to taste.
          </p>
        </div>
        {user ? (
          <div style={{ borderTop: '1px solid #e4e1da', paddingTop: '10px' }}>
            <button
              className="profile-button"
              style={{ borderTop: 'none', padding: '4px', width: '100%' }}
              onClick={() => {}}
            >
              <span className="avatar">{userInitial}</span>
              <span className="profile-copy">
                <strong>{username}</strong>
                <small>{user.email}</small>
              </span>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                color: '#88857d',
                fontSize: '11px',
                cursor: 'pointer',
                borderRadius: '6px',
                width: '100%',
              }}
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <button
            className="profile-button"
            onClick={() => setAuthModalOpen(true)}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <span className="avatar" style={{ background: '#52634b', color: '#fff' }}>
              <LogIn size={15} />
            </span>
            <span className="profile-copy">
              <strong>Sign in / Register</strong>
              <small>Sync your coffee data</small>
            </span>
          </button>
        )}
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <section className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            Your journal <ChevronRight size={14} />
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-label">{shortDate}</span>
            <button
              className="icon-button"
              aria-label="Search shots"
              onClick={() => document.getElementById('shot-search')?.focus()}
            >
              <Search size={17} />
            </button>
            <button
              className="user-avatar"
              aria-label={username}
              onClick={() => {
                if (!user) setAuthModalOpen(true)
              }}
            >
              {userInitial}
            </button>
          </div>
        </header>

        <div className="page-content">
          {activeNav === 'Setup' ? (
            <SetupPanel
              user={user}
              setup={machineSetup}
              setupLoaded={setupLoaded}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenWizard={() => setWizardOpen(true)}
              onSaved={(saved) => setMachineSetup(saved)}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {longDate.toUpperCase()} <span className="eyebrow-dot" />
                    {user ? 'YOUR LIVE ESPRESSO WORKSPACE' : 'GUEST MODE'}
                  </div>
                  <h1>
                    {activeNav === 'Coffee shelf'
                      ? 'Your coffee shelf'
                      : activeNav === 'My shots'
                      ? 'Your shot history'
                      : `Good day, ${username.split(' ')[0]}`}
                    <span className="heading-period">.</span>
                  </h1>
                  <p className="page-subtitle">
                    {activeNav === 'Coffee shelf'
                      ? 'A collection of coffees you’ve dialed in.'
                      : activeNav === 'My shots'
                      ? 'Every extraction brings you closer to your favorite cup.'
                      : user
                      ? 'Your private coffee log is synced across all devices.'
                      : 'Sign in to sync your shots and equipment to the cloud.'}
                  </p>
                </div>
                <div className="heading-actions">
                  {isShelf && (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        if (!user) setAuthModalOpen(true)
                        else setShowAddBean(true)
                      }}
                    >
                      <Bean size={16} /> Add bean
                    </button>
                  )}
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (!user) {
                        setAuthModalOpen(true)
                      } else {
                        openLogDialog()
                        setSaved(false)
                      }
                    }}
                  >
                    <Plus size={17} /> Log a shot
                  </button>
                </div>
              </div>

              {activeNav === 'Overview' && (
                <>
                  <section className="stats-grid" aria-label="Journal stats">
                    <StatCard
                      label="SHOTS PULLED"
                      value={String(stats.total)}
                      detail={stats.total > 0 ? `+ ${stats.thisWeek} this week` : 'Start dialing in'}
                      icon={Coffee}
                      trend={stats.thisWeek > 0 ? 'up' : undefined}
                    />
                    <StatCard
                      label="WORKSPACE STATUS"
                      value={user ? 'Synced' : 'Local'}
                      detail={user ? 'Saved to Supabase' : 'Sign in to save'}
                      icon={Activity}
                    />
                    <StatCard
                      label="AVERAGE RATIO"
                      value={stats.favoriteRatio}
                      detail={stats.avgDoseYield}
                      icon={Target}
                    />
                    <StatCard
                      label="TOP RATED BEAN"
                      value={stats.topBean}
                      detail={stats.total > 0 ? `${stats.avgRating} average rating` : 'Add your first bean'}
                      icon={Star}
                    />
                  </section>

                  {stats.favoriteShot && (
                    <section className="feature-grid">
                      <article className="recipe-card">
                        <div className="recipe-card-top">
                          <div>
                            <div className="card-eyebrow">
                              <Sparkles size={13} /> YOUR TOP RATED EXTRACTION
                            </div>
                            <h2>{stats.favoriteShot.bean}</h2>
                            <p>{stats.favoriteShot.roaster}</p>
                          </div>
                          <div className="recipe-bean-illustration" aria-hidden="true">
                            <Bean size={56} strokeWidth={1} />
                          </div>
                        </div>
                        <div className="recipe-values">
                          <div>
                            <span>DOSE</span>
                            <strong>
                              {stats.favoriteShot.dose}
                              <small>g</small>
                            </strong>
                          </div>
                          <div className="recipe-separator" />
                          <div>
                            <span>YIELD</span>
                            <strong>
                              {stats.favoriteShot.yield}
                              <small>g</small>
                            </strong>
                          </div>
                          <div className="recipe-separator" />
                          <div>
                            <span>TIME</span>
                            <strong>
                              {stats.favoriteShot.time}
                              <small>s</small>
                            </strong>
                          </div>
                          <div className="recipe-separator" />
                          <div>
                            <span>GRIND</span>
                            <strong>{stats.favoriteShot.grind}</strong>
                          </div>
                        </div>
                        <div className="recipe-footer">
                          <span>
                            <span className="recipe-star">
                              <Star size={13} fill="currentColor" />
                            </span>{' '}
                            {stats.favoriteShot.rating}.0 out of 5 stars
                          </span>
                          <button
                            onClick={() => {
                              chooseBean(stats.favoriteShot!.bean, stats.favoriteShot!.roaster)
                              setDose(String(stats.favoriteShot!.dose))
                              setYieldAmount(String(stats.favoriteShot!.yield))
                              setGrind(String(stats.favoriteShot!.grind))
                              setTime(String(stats.favoriteShot!.time))
                              openLogDialog()
                            }}
                          >
                            Brew this again <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </article>
                    </section>
                  )}
                </>
              )}

              <section className="recent-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      {activeNav === 'Coffee shelf'
                        ? 'Your Beans'
                        : activeNav === 'My shots'
                        ? 'All Extractions'
                        : 'Recent Extractions'}
                    </h2>
                    <p>
                      {activeNav === 'Coffee shelf'
                        ? 'Unique coffees logged in your history.'
                        : activeNav === 'My shots'
                        ? 'Your real espresso extractions.'
                        : 'The latest pulls from your journal.'}
                    </p>
                  </div>
                  <div className="list-actions">
                    <label className="search-box" htmlFor="shot-search">
                      <Search size={15} />
                      <input
                        id="shot-search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Find a bean or note..."
                      />
                    </label>
                    <button
                      className="filter-button"
                      onClick={() => setSearch('')}
                    >
                      <SlidersHorizontal size={15} />
                      <span>Clear</span>
                    </button>
                    <button
                      className="view-all"
                      onClick={() => setActiveNav('My shots')}
                    >
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="shots-card">
                  <div className="shots-header">
                    <span>COFFEE</span>
                    {isShelf ? (
                      <>
                        <span>SHOTS</span>
                        <span>GRIND</span>
                        <span>RATING</span>
                        <span>BREWED</span>
                      </>
                    ) : (
                      <>
                        <span>RECIPE</span>
                        <span>TIME</span>
                        <span>RATING</span>
                        <span>BREWED</span>
                      </>
                    )}
                    <span />
                  </div>

                  {loadingShots ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#88857d' }}>
                      <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      <p>Loading your extractions...</p>
                    </div>
                  ) : isShelf ? (
                    displayedBeans.length ? (
                      displayedBeans.map((bean) => (
                        <BeanCard
                          key={bean.key}
                          bean={bean}
                          onClick={() => {
                            if (bean.latestShot) {
                              setSelectedShot(bean.latestShot)
                            } else if (!user) {
                              setAuthModalOpen(true)
                            } else {
                              // Pre-entered bean without shots: start a shot with it.
                              chooseBean(bean.name, bean.roaster)
                              setSaved(false)
                              openLogDialog()
                            }
                          }}
                        />
                      ))
                    ) : beans.length > 0 ? (
                      <div className="no-results" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ fontWeight: 600, color: '#322f28', marginBottom: '4px' }}>
                          No beans match your search
                        </p>
                        <p style={{ fontSize: '13px', color: '#88857d', marginBottom: '16px' }}>
                          Try another bean or flavor.
                        </p>
                        <button
                          className="primary-button"
                          style={{ margin: '0 auto' }}
                          onClick={() => setSearch('')}
                        >
                          <X size={16} /> Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="no-results" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <Bean size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ fontWeight: 600, color: '#322f28', marginBottom: '4px' }}>
                          {user ? 'No beans on your shelf yet' : 'Welcome to your Espresso Studio'}
                        </p>
                        <p style={{ fontSize: '13px', color: '#88857d', marginBottom: '16px' }}>
                          {user
                            ? 'Every coffee you log will land here, dial-in history included.'
                            : 'Sign in to start recording your coffee dial-in notes to your personal database.'}
                        </p>
                        <button
                          className="primary-button"
                          style={{ margin: '0 auto' }}
                          onClick={() => {
                            if (!user) setAuthModalOpen(true)
                            else openLogDialog()
                          }}
                        >
                          <Plus size={16} /> {user ? 'Log your first shot' : 'Sign in to get started'}
                        </button>
                      </div>
                    )
                  ) : displayedShots.length ? (
                    displayedShots
                      .slice(0, activeNav === 'Overview' ? 5 : undefined)
                      .map((shot) => (
                        <ShotCard
                          key={shot.id}
                          shot={shot}
                          onClick={() => setSelectedShot(shot)}
                        />
                      ))
                  ) : shots.length > 0 ? (
                    <div className="no-results" style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <p style={{ fontWeight: 600, color: '#322f28', marginBottom: '4px' }}>
                        No shots match your search
                      </p>
                      <p style={{ fontSize: '13px', color: '#88857d', marginBottom: '16px' }}>
                        Try another bean or flavor.
                      </p>
                      <button
                        className="primary-button"
                        style={{ margin: '0 auto' }}
                        onClick={() => setSearch('')}
                      >
                        <X size={16} /> Clear search
                      </button>
                    </div>
                  ) : (
                    <div className="no-results" style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <Coffee size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <p style={{ fontWeight: 600, color: '#322f28', marginBottom: '4px' }}>
                        {user ? 'No shots logged yet' : 'Welcome to your Espresso Studio'}
                      </p>
                      <p style={{ fontSize: '13px', color: '#88857d', marginBottom: '16px' }}>
                        {user
                          ? 'Pull your first shot and record the dose, yield, and tasting notes.'
                          : 'Sign in to start recording your coffee dial-in notes to your personal database.'}
                      </p>
                      <button
                        className="primary-button"
                        style={{ margin: '0 auto' }}
                        onClick={() => {
                          if (!user) setAuthModalOpen(true)
                          else openLogDialog()
                        }}
                      >
                        <Plus size={16} /> {user ? 'Log your first shot' : 'Sign in to get started'}
                      </button>
                    </div>
                  )}
                </div>

                {displayedBeans.length > 0 && (
                  <div className="list-footer">
                    <span>
                      Showing {displayedBeans.length} of {beans.length} beans on your shelf
                    </span>
                    <button onClick={() => setActiveNav('My shots')}>
                      See all shots <ArrowUpRight size={14} />
                    </button>
                  </div>
                )}
                {displayedShots.length > 0 && (
                  <div className="list-footer">
                    <span>
                      Showing {displayedShots.length} of {shots.length} shots
                    </span>
                    <button onClick={() => setActiveNav('My shots')}>
                      See full list <ArrowUpRight size={14} />
                    </button>
                  </div>
                )}
              </section>

              <footer className="page-footer">
                <span>Made for the love of a good shot.</span>
                <span>
                  Keep experimenting <span className="footer-dot">·</span> Keep tasting{' '}
                  <span className="footer-dot">·</span> Keep notes
                </span>
              </footer>
            </>
          )}
        </div>
      </section>

      {/* Log a Shot Modal */}
      {showLog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLog(false)
          }}
        >
          <section
            className="log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-title"
          >
            <div className="modal-header">
              <div>
                <div className="card-eyebrow">
                  <Coffee size={13} /> YOUR BREW JOURNAL
                </div>
                <h2 id="log-title">Log a new shot</h2>
                <p>Every little detail helps you dial in your perfect cup.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowLog(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveShot}>
              <div className="form-section-title">
                <span>01</span> THE RECIPE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {isCreatingNewBean ? (
                  <>
                    <label className="form-field">
                      <span>Bean name</span>
                      <input
                        value={bean}
                        onChange={(event) => setBean(event.target.value)}
                        placeholder="e.g. Ethiopia Guji"
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Roaster</span>
                      <input
                        value={roaster}
                        onChange={(event) => setRoaster(event.target.value)}
                        placeholder="e.g. April Coffee"
                      />
                    </label>
                    {beanOptions.length > 0 && (
                      <button
                        type="button"
                        className="pick-existing-bean"
                        onClick={() => {
                          setBean('')
                          setRoaster('')
                          setBeanChoice('')
                        }}
                      >
                        ← Choose an existing bean
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label className="form-field">
                      <span>Coffee bean</span>
                      <select
                        value={beanChoice}
                        onChange={(event) => {
                          const value = event.target.value
                          if (value === NEW_BEAN_CHOICE) {
                            setBean('')
                            setRoaster('')
                          } else if (value) {
                            const option = beanOptions.find((b) => b.key === value)
                            if (option) {
                              setBean(option.name)
                              setRoaster(option.roaster)
                            }
                          }
                          setBeanChoice(value)
                        }}
                        required
                      >
                        <option value="" disabled>
                          Select a bean…
                        </option>
                        {beanOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.name} — {option.roaster}
                          </option>
                        ))}
                        <option value={NEW_BEAN_CHOICE}>＋ Create new bean…</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>
                        Roaster{' '}
                        {selectedBeanLocked && <small>from selected bean</small>}
                      </span>
                      <input
                        value={roaster}
                        onChange={(event) => setRoaster(event.target.value)}
                        placeholder={selectedBeanLocked ? '' : 'e.g. April Coffee'}
                        readOnly={selectedBeanLocked}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="recipe-input-grid">
                <label className="form-field">
                  <span>
                    Dose <small>grams in</small>
                  </span>
                  <div className="number-field">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={dose}
                      onChange={(event) => setDose(event.target.value)}
                      required
                    />
                    <span>g</span>
                  </div>
                </label>
                <label className="form-field">
                  <span>
                    Yield <small>grams out</small>
                  </span>
                  <div className="number-field">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={yieldAmount}
                      onChange={(event) => setYieldAmount(event.target.value)}
                      required
                    />
                    <span>g</span>
                  </div>
                </label>
                <label className="form-field">
                  <span>Pull time</span>
                  <div className="number-field">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      required
                    />
                    <span>s</span>
                  </div>
                </label>
                <label className="form-field">
                  <span>
                    Water temperature <small>optional</small>
                  </span>
                  <div className="number-field">
                    <input
                      type="number"
                      step={shotTempMode === 'step' ? '1' : '0.5'}
                      min={tempBounds?.min}
                      max={tempBounds?.max}
                      value={temp}
                      onChange={(event) => setTemp(event.target.value)}
                      aria-label="Water temperature"
                    />
                    <span>{tempUnitSuffix(machineSetup?.tempMode ?? 'C')}</span>
                  </div>
                  {shotTempMode === 'step' && machineSetup && (
                    <span className="field-hint">
                      {machineSetup.tempStepMin} ({machineSetup.tempStepMinLabel || 'min'}) –{' '}
                      {machineSetup.tempStepMax} ({machineSetup.tempStepMaxLabel || 'max'})
                    </span>
                  )}
                  {tempError && <span className="field-error">{tempError}</span>}
                </label>
              </div>

              <label className="form-field grind-block">
                <span>
                  Grind setting{' '}
                  {grindRange && (
                    <small>
                      your machine: {grindRange.min} – {grindRange.max}
                    </small>
                  )}
                </span>
                <div className="grind-control-row">
                  {grindRange && (
                    <input
                      className="grind-slider"
                      type="range"
                      min={grindRange.min}
                      max={grindRange.max}
                      step="0.1"
                      value={
                        Number.isFinite(grindValue)
                          ? Math.min(Math.max(grindValue, grindRange.min), grindRange.max)
                          : grindRange.min
                      }
                      onChange={(event) => setGrind(event.target.value)}
                      aria-label="Grind setting slider"
                    />
                  )}
                  <div className="number-field grind-number">
                    <input
                      type="number"
                      step="0.1"
                      min={grindRange ? grindRange.min : 0}
                      max={grindRange ? grindRange.max : undefined}
                      value={grind}
                      onChange={(event) => setGrind(event.target.value)}
                      required
                    />
                    <Settings2 size={14} />
                  </div>
                </div>
                {grindRange && (
                  <div className="range-caption">
                    <span>{grindRange.min}</span>
                    <span>{grindRange.max}</span>
                  </div>
                )}
                {grindError && <span className="field-error">{grindError}</span>}
              </label>

              <div className="form-section-title tasting-title">
                <span>02</span> THE TASTING NOTES
              </div>
              <fieldset className="flavor-field">
                <legend>What flavors came through?</legend>
                <div className="flavor-chips">
                  {[
                    'Chocolate',
                    'Caramel',
                    'Citrus',
                    'Berry',
                    'Floral',
                    'Nutty',
                    'Stone fruit',
                    'Spice',
                  ].map((flavor) => (
                    <button
                      type="button"
                      key={flavor}
                      className={`flavor-chip ${
                        selectedFlavors.includes(flavor) ? 'selected' : ''
                      }`}
                      onClick={() => toggleFlavor(flavor)}
                    >
                      {selectedFlavors.includes(flavor) && <Check size={12} />}
                      {flavor}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="taste-sliders">
                <TasteSlider
                  label="Sourness"
                  value={acidity}
                  onChange={setAcidity}
                  low="Low"
                  high="Bright"
                  tint="sour"
                />
                <TasteSlider
                  label="Bitterness"
                  value={bitterness}
                  onChange={setBitterness}
                  low="Soft"
                  high="Bold"
                  tint="bitter"
                />
              </div>

              <label className="form-field notes-field">
                <span>
                  A few words about this shot <small>optional</small>
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="How did it taste? Sweetness, body, crema..."
                  rows={2}
                />
              </label>

              <div className="rating-line">
                <span>Overall rating</span>
                <div className="rating-picker" aria-label="Rate this shot">
                  {Array.from({ length: 5 }, (_, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setRating(index + 1)}
                      aria-label={`Rate ${index + 1} stars`}
                    >
                      <Star
                        size={19}
                        fill={index < rating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowLog(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saved ? (
                    <>
                      <Check size={16} /> Shot saved
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Save to Journal
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Add Bean Modal */}
      {showAddBean && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddBean(false)
          }}
        >
          <section
            className="log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bean-title"
          >
            <div className="modal-header">
              <div>
                <div className="card-eyebrow">
                  <Bean size={13} /> YOUR BEAN SHELF
                </div>
                <h2 id="add-bean-title">Add a bean</h2>
                <p>Pre-enter a coffee so you can reuse it when logging shots.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowAddBean(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={addBean}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="form-field">
                  <span>Coffee bean</span>
                  <input
                    value={newBeanName}
                    onChange={(event) => setNewBeanName(event.target.value)}
                    placeholder="e.g. Ethiopia Guji"
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field">
                  <span>
                    Roaster <small>optional</small>
                  </span>
                  <input
                    value={newBeanRoaster}
                    onChange={(event) => setNewBeanRoaster(event.target.value)}
                    placeholder="e.g. April Coffee"
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowAddBean(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={savingBean}>
                  {savingBean ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Add bean
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* View Shot Details Modal */}
      {selectedShot && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedShot(null)
          }}
        >
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <button
              className="modal-close detail-close"
              onClick={() => setSelectedShot(null)}
              aria-label="Close details"
            >
              <X size={19} />
            </button>
            <span className="detail-bean">
              <Bean size={20} />
            </span>
            <div className="eyebrow">{selectedShot.date.toUpperCase()}</div>
            <h2 id="detail-title">{selectedShot.bean}</h2>
            <p className="detail-roaster">{selectedShot.roaster}</p>
            <div
              className="detail-recipe"
              style={{
                gridTemplateColumns: `repeat(${selectedShot.temp ? 5 : 4}, 1fr)`,
              }}
            >
              <div>
                <span>DOSE</span>
                <strong>{selectedShot.dose}g</strong>
              </div>
              <div>
                <span>YIELD</span>
                <strong>{selectedShot.yield}g</strong>
              </div>
              <div>
                <span>GRIND</span>
                <strong>{selectedShot.grind}</strong>
              </div>
              <div>
                <span>TIME</span>
                <strong>{selectedShot.time}s</strong>
              </div>
              {selectedShot.temp && (
                <div>
                  <span>TEMP</span>
                  <strong>{formatShotTemp(selectedShot.temp)}</strong>
                </div>
              )}
            </div>
            <div className="detail-rating">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={15}
                  fill={index < selectedShot.rating ? 'currentColor' : 'none'}
                />
              ))}
              <span>{selectedShot.rating}.0</span>
            </div>
            {selectedShot.flavors.length > 0 && (
              <div className="detail-flavors">
                {selectedShot.flavors.map((flavor) => (
                  <span key={flavor}>{flavor}</span>
                ))}
              </div>
            )}
            {selectedShot.notes && (
              <p className="detail-notes">“{selectedShot.notes}”</p>
            )}
            <div className="detail-tastes">
              <TasteMeter
                label="Sourness"
                value={selectedShot.acidity}
                tint="sour"
              />
              <TasteMeter
                label="Bitterness"
                value={selectedShot.bitterness}
                tint="bitter"
              />
            </div>

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e4e1da',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => deleteShot(selectedShot.id)}
                disabled={deletingId === selectedShot.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: '1px solid #f2dede',
                  color: '#a94442',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                <span>{deletingId === selectedShot.id ? 'Deleting...' : 'Delete shot'}</span>
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  chooseBean(selectedShot.bean, selectedShot.roaster)
                  setDose(String(selectedShot.dose))
                  setYieldAmount(String(selectedShot.yield))
                  setGrind(String(selectedShot.grind))
                  setTime(String(selectedShot.time))
                  setSelectedShot(null)
                  openLogDialog()
                }}
              >
                Use recipe
              </button>
            </div>
          </section>
        </div>
      )}

      {user && wizardOpen && (
        <SetupWizard
          userId={user.id}
          initial={machineSetup}
          onClose={() => {
            wizardDismissedByRef.current = user.id
            setWizardOpen(false)
          }}
          onSaved={(saved) => {
            setMachineSetup(saved)
            setWizardOpen(false)
            setActiveNav('Setup')
          }}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
            if (data.user) {
              fetchShots(data.user.id)
              fetchBeans(data.user.id)
              fetchMachineSetup(data.user.id)
            }
          })
        }}
      />
    </main>
  )
}

function TasteSlider({
  label,
  value,
  onChange,
  low,
  high,
  tint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  low: string
  high: string
  tint: string
}) {
  return (
    <div className={`taste-slider ${tint}`}>
      <div className="taste-slider-head">
        <span>{label}</span>
        <strong>
          {value}
          <small> / 5</small>
        </strong>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      <div className="range-caption">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

function TasteMeter({
  label,
  value,
  tint,
}: {
  label: string
  value: number
  tint: string
}) {
  return (
    <div className={`taste-meter ${tint}`}>
      <span>{label}</span>
      <div>
        {Array.from({ length: 5 }, (_, index) => (
          <i className={index < value ? 'filled' : ''} key={index} />
        ))}
      </div>
      <strong>{value}/5</strong>
    </div>
  )
}

function SetupPanel({
  user,
  setup,
  setupLoaded,
  onOpenAuth,
  onOpenWizard,
  onSaved,
}: {
  user: User | null
  setup: MachineSetup | null
  setupLoaded: boolean
  onOpenAuth: () => void
  onOpenWizard: () => void
  onSaved: (saved: MachineSetup) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<MachineSetup | null>(null)

  const editing = isEditing && draft !== null

  function startEditing() {
    if (!setup) return
    setDraft({ ...setup })
    setIsEditing(true)
  }

  function edit(patch: Partial<MachineSetup>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  async function handleSave() {
    if (!user || !draft) return
    const problems = [
      validateMachineSetupStep(draft, 'machine'),
      validateMachineSetupStep(draft, 'basket'),
      validateMachineSetupStep(draft, 'grinding'),
      validateMachineSetupStep(draft, 'temperature'),
      validateMachineSetupStep(draft, 'preinfusion'),
    ].filter(Boolean)
    if (problems.length > 0) {
      alert(`Please fix your setup: ${problems[0]}`)
      return
    }
    setSaving(true)
    try {
      const saved = await saveMachineSetup(user.id, draft)
      onSaved(saved)
      setIsEditing(false)
      setDraft(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please check your connection'
      alert(`Could not save setup: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  function row(key: string, label: string, display: React.ReactNode, control?: React.ReactNode) {
    return (
      <div key={key}>
        <span>{label}</span>
        {editing ? control : <strong>{display}</strong>}
      </div>
    )
  }

  const grindRange = setup ? grindRangeOf(setup) : null
  const mode = draft?.tempMode ?? setup?.tempMode ?? 'C'

  const basketControl = (
    <span className="setup-input-pair">
      <input
        className="setup-edit-input"
        type="number"
        inputMode="decimal"
        min={30}
        max={100}
        aria-label="Basket diameter"
        placeholder="54"
        value={draft?.basketDiameter ?? ''}
        onChange={(event) => edit({ basketDiameter: event.target.value })}
      />
      <small>mm</small>
    </span>
  )

  const tempModeControl = (
    <select
      className="setup-edit-input"
      aria-label="Temperature mode"
      value={draft?.tempMode ?? 'C'}
      onChange={(event) => edit({ tempMode: event.target.value as TempMode })}
    >
      {(Object.keys(TEMP_MODE_LABELS) as TempMode[]).map((tempMode) => (
        <option key={tempMode} value={tempMode}>
          {TEMP_MODE_LABELS[tempMode]}
        </option>
      ))}
    </select>
  )

  const tempValueControl = (
    <span className="setup-input-pair">
      <input
        className="setup-edit-input"
        type="number"
        inputMode="decimal"
        step={mode === 'steps' ? '1' : '0.5'}
        aria-label="Default water temperature"
        placeholder={mode === 'C' ? '93' : mode === 'F' ? '199' : '3'}
        value={draft?.defaultTemp ?? ''}
        onChange={(event) => edit({ defaultTemp: event.target.value })}
      />
      <small>{tempUnitSuffix(mode)}</small>
    </span>
  )

  const preinfusionControl = (
    <span className="setup-input-pair">
      <input
        type="checkbox"
        aria-label="Pre-infusion enabled"
        checked={draft?.preinfusionEnabled ?? false}
        onChange={(event) => edit({ preinfusionEnabled: event.target.checked })}
      />
      {(draft?.preinfusionEnabled ?? false) && (
        <>
          <input
            className="setup-edit-input"
            type="number"
            min={0}
            max={60}
            step={1}
            aria-label="Pre-infusion seconds"
            value={draft?.preinfusionSeconds ?? ''}
            onChange={(event) => edit({ preinfusionSeconds: event.target.value })}
          />
          <small>s</small>
        </>
      )}
    </span>
  )

  const grindRangeControl = (
    <span className="setup-input-pair">
      <input
        className="setup-edit-input"
        type="number"
        inputMode="decimal"
        step="any"
        aria-label="Lowest grind setting"
        placeholder="1"
        value={draft?.grindMin ?? ''}
        onChange={(event) => edit({ grindMin: event.target.value })}
      />
      <small>—</small>
      <input
        className="setup-edit-input"
        type="number"
        inputMode="decimal"
        step="any"
        aria-label="Highest grind setting"
        placeholder="5"
        value={draft?.grindMax ?? ''}
        onChange={(event) => edit({ grindMax: event.target.value })}
      />
    </span>
  )

  const dialControl = (
    <select
      className="setup-edit-input"
      aria-label="Dial direction"
      value={draft?.dialDirection ?? 'cw'}
      onChange={(event) => edit({ dialDirection: event.target.value as DialDirection })}
    >
      {(Object.keys(DIAL_DIRECTION_LABELS) as DialDirection[]).map((direction) => (
        <option key={direction} value={direction}>
          {DIAL_DIRECTION_LABELS[direction]}
        </option>
      ))}
    </select>
  )

  function textControl(
    field: 'machine' | 'machineDetails' | 'grinder' | 'grinderDetails',
    label: string,
    placeholder = ''
  ) {
    return (
      <input
        className="setup-edit-input"
        aria-label={label}
        placeholder={placeholder}
        value={draft?.[field] ?? ''}
        onChange={(event) => edit({ [field]: event.target.value })}
      />
    )
  }

  const specs = setup ? (
    <div className="setup-specs">
      {row(
        'basket',
        'Basket diameter',
        setup.basketDiameter ? `${setup.basketDiameter} mm` : '—',
        basketControl
      )}
      {row('tempMode', 'Water temperature mode', TEMP_MODE_LABELS[setup.tempMode], tempModeControl)}
      {setup.tempMode === 'steps' ? (
        <>
          {row(
            'tempSteps',
            'Temperature steps',
            `${setup.tempStepMin} (${setup.tempStepMinLabel || 'min'}) – ${setup.tempStepMax} (${
              setup.tempStepMaxLabel || 'max'
            })`,
            <span className="setup-input-pair">
              <input
                className="setup-edit-input"
                type="number"
                step="any"
                aria-label="First temperature step"
                value={draft?.tempStepMin ?? ''}
                onChange={(event) => edit({ tempStepMin: event.target.value })}
              />
              <small>—</small>
              <input
                className="setup-edit-input"
                type="number"
                step="any"
                aria-label="Last temperature step"
                value={draft?.tempStepMax ?? ''}
                onChange={(event) => edit({ tempStepMax: event.target.value })}
              />
            </span>
          )}
          {row(
            'tempStepLabels',
            'Step labels',
            `${setup.tempStepMinLabel || '—'} / ${setup.tempStepMaxLabel || '—'}`,
            <span className="setup-input-pair">
              <input
                className="setup-edit-input"
                aria-label="First step label"
                placeholder="cold"
                value={draft?.tempStepMinLabel ?? ''}
                onChange={(event) => edit({ tempStepMinLabel: event.target.value })}
              />
              <input
                className="setup-edit-input"
                aria-label="Last step label"
                placeholder="hot"
                value={draft?.tempStepMaxLabel ?? ''}
                onChange={(event) => edit({ tempStepMaxLabel: event.target.value })}
              />
            </span>
          )}
        </>
      ) : null}
      {row('defaultTemp', 'Default temperature', formatTempDisplay(setup), tempValueControl)}
      {row(
        'preinfusion',
        'Pre-infusion',
        setup.preinfusionEnabled ? `${setup.preinfusionSeconds} s` : 'Off',
        preinfusionControl
      )}
      {row(
        'grindRange',
        'Grind range',
        grindRange ? `${grindRange.min} — ${grindRange.max}` : '—',
        grindRangeControl
      )}
      {row('dialDirection', 'Dial direction', DIAL_DIRECTION_LABELS[setup.dialDirection], dialControl)}
      {row('grinder', 'Grinder', setup.grinder || 'Integrated', textControl('grinder', 'Grinder'))}
      {row(
        'grinderDetails',
        'Grinder details',
        setup.grinderDetails || '—',
        textControl('grinderDetails', 'Grinder details')
      )}
    </div>
  ) : null

  let bodyContent: React.ReactNode
  if (!user) {
    bodyContent = (
      <>
        <h2>Set up your espresso machine</h2>
        <p>Sign in to record your machine, basket, grinding and temperature defaults.</p>
        <button className="primary-button" onClick={onOpenAuth}>
          <LogIn size={16} /> Sign in to set up
        </button>
      </>
    )
  } else if (!setupLoaded) {
    bodyContent = (
      <>
        <h2>Loading your setup…</h2>
        <p>Fetching your saved machine from the cloud.</p>
      </>
    )
  } else if (!setup) {
    bodyContent = (
      <>
        <h2>No machine set up yet</h2>
        <p>
          Answer a few questions about your machine once — basket, grinding, temperature and
          pre-infusion — and every shot log will adapt to it.
        </p>
        <button className="primary-button" onClick={onOpenWizard}>
          <Settings2 size={16} /> Set up your machine
        </button>
      </>
    )
  } else if (editing && draft) {
    bodyContent = (
      <>
        <input
          className="setup-title-input"
          aria-label="Espresso machine"
          placeholder="e.g. La Marzocco Linea Mini"
          value={draft.machine}
          onChange={(event) => edit({ machine: event.target.value })}
        />
        <input
          className="setup-subtitle-input"
          aria-label="Machine details"
          placeholder="e.g. Dual boiler · 58 mm portafilter"
          value={draft.machineDetails}
          onChange={(event) => edit({ machineDetails: event.target.value })}
        />
        {specs}
      </>
    )
  } else {
    bodyContent = (
      <>
        <h2>{setup.machine}</h2>
        <p>{setup.machineDetails || 'No additional details.'}</p>
        {specs}
      </>
    )
  }

  return (
    <>
      <div className="page-heading setup-heading">
        <div>
          <div className="eyebrow">YOUR BREWING CORNER</div>
          <h1>
            Your setup<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            {user
              ? 'Your machine defaults — the shot log builds on them.'
              : 'Sign in to set up your espresso machine.'}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            if (!user) {
              onOpenAuth()
              return
            }
            if (!setup) {
              onOpenWizard()
              return
            }
            if (isEditing) handleSave()
            else startEditing()
          }}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : !user ? (
            <>
              <LogIn size={16} /> Sign in
            </>
          ) : !setup ? (
            <>
              <Settings2 size={16} /> Set up machine
            </>
          ) : isEditing ? (
            <>
              <Check size={16} /> Save setup
            </>
          ) : (
            <>
              <Settings2 size={16} /> Edit setup
            </>
          )}
        </button>
      </div>
      <section className="setup-page-grid">
        <article className="setup-detail-card setup-machine-card">
          <span className="setup-detail-icon">
            <Coffee size={22} />
          </span>
          <div className="card-eyebrow">ESPRESSO MACHINE</div>
          {bodyContent}
        </article>
      </section>
    </>
  )
}
