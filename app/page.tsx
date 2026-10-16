'use client'

import { useEffect, useMemo, useState, useCallback, useSyncExternalStore } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bean,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Droplets,
  Gauge,
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
  created_at: string
}

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        fetchShots(data.user.id)
      } else {
        setShots([])
        setLoadingShots(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchShots(currentUser.id)
      } else {
        setShots([])
        setLoadingShots(false)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [fetchShots])

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

  async function saveShot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    setSaving(true)
    try {
      const beanName = bean.trim() || 'House Espresso'
      const roasterName = roaster.trim() || 'My roaster'
      const doseNum = Number(dose) || 18
      const yieldNum = Number(yieldAmount) || 36
      const grindNum = Number(grind) || 2.5
      const timeNum = Number(time) || 28

      const { data, error } = await supabase
        .from('shots')
        .insert({
          user_id: user.id,
          bean_name: beanName,
          roaster: roasterName,
          dose_grams: doseNum,
          yield_grams: yieldNum,
          grind_setting: grindNum,
          duration_seconds: timeNum,
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
        setBean(FORM_DEFAULTS.bean)
        setRoaster(FORM_DEFAULTS.roaster)
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

  function toggleFlavor(flavor: string) {
    setSelectedFlavors((current) =>
      current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor]
    )
  }

  const displayedShots =
    activeNav === 'Coffee shelf'
      ? filteredShots.filter(
          (shot, index, list) => list.findIndex((item) => item.bean === shot.bean) === index
        )
      : filteredShots

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
            <small>{user ? 'Custom equipment' : 'Set your gear'}</small>
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
            <SetupPanel user={user} onOpenAuth={() => setAuthModalOpen(true)} />
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
                <button
                  className="primary-button"
                  onClick={() => {
                    if (!user) {
                      setAuthModalOpen(true)
                    } else {
                      setShowLog(true)
                      setSaved(false)
                    }
                  }}
                >
                  <Plus size={17} /> Log a shot
                </button>
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
                              setBean(stats.favoriteShot!.bean)
                              setRoaster(stats.favoriteShot!.roaster)
                              setDose(String(stats.favoriteShot!.dose))
                              setYieldAmount(String(stats.favoriteShot!.yield))
                              setGrind(String(stats.favoriteShot!.grind))
                              setTime(String(stats.favoriteShot!.time))
                              setShowLog(true)
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
                        : 'Your real espresso extractions.'}
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
                    <span>RECIPE</span>
                    <span>TIME</span>
                    <span>RATING</span>
                    <span>BREWED</span>
                    <span />
                  </div>

                  {loadingShots ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#88857d' }}>
                      <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      <p>Loading your extractions...</p>
                    </div>
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
                          else setShowLog(true)
                        }}
                      >
                        <Plus size={16} /> {user ? 'Log your first shot' : 'Sign in to get started'}
                      </button>
                    </div>
                  )}
                </div>

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
                <label className="form-field">
                  <span>Coffee bean</span>
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
                  <span>Grind setting</span>
                  <div className="number-field">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={grind}
                      onChange={(event) => setGrind(event.target.value)}
                      required
                    />
                    <Settings2 size={14} />
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
              </div>

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
            <div className="detail-recipe">
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
                  setBean(selectedShot.bean)
                  setRoaster(selectedShot.roaster)
                  setDose(String(selectedShot.dose))
                  setYieldAmount(String(selectedShot.yield))
                  setGrind(String(selectedShot.grind))
                  setTime(String(selectedShot.time))
                  setSelectedShot(null)
                  setShowLog(true)
                }}
              >
                Use recipe
              </button>
            </div>
          </section>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
            if (data.user) fetchShots(data.user.id)
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
  onOpenAuth,
}: {
  user: User | null
  onOpenAuth: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [setup, setSetup] = useState({
    machine: 'La Marzocco Linea Mini',
    machineDetails: 'Dual boiler · 58mm portafilter',
    basketSize: '18g precision',
    temperature: '93°C',
    preinfusion: '5 seconds',
    grinder: 'Niche Zero',
    grinderDetails: 'Single dose · 63mm conical burrs',
    grindRange: '1.8 — 3.2',
    dialDirection: 'Clockwise = finer',
    doseRange: '18.0 — 18.5g',
    water: 'Third Wave Water',
    basket: 'VST 18g ridgeless',
  })

  // Load user equipment if authenticated
  useEffect(() => {
    if (!user) return
    supabase
      .from('equipment')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching equipment:', error)
          return
        }
        if (data && data.length > 0) {
          const machineItem = data.find((e: any) => e.type === 'machine')
          const grinderItem = data.find((e: any) => e.type === 'grinder')
          setSetup((prev) => ({
            ...prev,
            machine: machineItem ? `${machineItem.brand} ${machineItem.model}` : prev.machine,
            grinder: grinderItem ? `${grinderItem.brand} ${grinderItem.model}` : prev.grinder,
            ...(machineItem?.settings || {}),
            ...(grinderItem?.settings || {}),
          }))
        }
      })
  }, [user])

  async function handleSave() {
    if (!user) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      const payloads = [
        {
          type: 'machine',
          brand: setup.machine.split(' ')[0] || 'Espresso',
          model: setup.machine.split(' ').slice(1).join(' ') || 'Machine',
          settings: {
            machineDetails: setup.machineDetails,
            basketSize: setup.basketSize,
            temperature: setup.temperature,
            preinfusion: setup.preinfusion,
            water: setup.water,
            basket: setup.basket,
          },
        },
        {
          type: 'grinder',
          brand: setup.grinder.split(' ')[0] || 'Coffee',
          model: setup.grinder.split(' ').slice(1).join(' ') || 'Grinder',
          settings: {
            grinderDetails: setup.grinderDetails,
            grindRange: setup.grindRange,
            dialDirection: setup.dialDirection,
            doseRange: setup.doseRange,
          },
        },
      ]

      for (const payload of payloads) {
        // Update the existing row instead of inserting a new one — upsert without
        // a unique constraint on (user_id, type) used to create duplicates.
        const { data: existing, error: selectError } = await supabase
          .from('equipment')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', payload.type)
          .order('created_at', { ascending: false })
          .limit(1)
        if (selectError) throw selectError

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from('equipment')
            .update({
              brand: payload.brand,
              model: payload.model,
              settings: payload.settings,
            })
            .eq('id', existing[0].id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('equipment').insert({
            user_id: user.id,
            ...payload,
          })
          if (error) throw error
        }
      }
      setIsEditing(false)
    } catch (err: any) {
      alert(`Could not save equipment: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function field(key: keyof typeof setup, label: string) {
    return (
      <div key={key}>
        <span>{label}</span>
        {isEditing ? (
          <input
            className="setup-edit-input"
            aria-label={label}
            value={setup[key]}
            onChange={(event) =>
              setSetup((current) => ({ ...current, [key]: event.target.value }))
            }
          />
        ) : (
          <strong>{setup[key]}</strong>
        )}
      </div>
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
              ? 'Customize and sync your machines, grinders, and presets.'
              : 'Sign in to customize and save your personal equipment.'}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            if (!user) {
              onOpenAuth()
              return
            }
            if (isEditing) handleSave()
            else setIsEditing(true)
          }}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
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
        <article className="setup-detail-card">
          <span className="setup-detail-icon">
            <Coffee size={22} />
          </span>
          <div className="card-eyebrow">ESPRESSO MACHINE</div>
          {isEditing ? (
            <input
              className="setup-title-input"
              aria-label="Espresso machine"
              value={setup.machine}
              onChange={(event) =>
                setSetup((current) => ({ ...current, machine: event.target.value }))
              }
            />
          ) : (
            <h2>{setup.machine}</h2>
          )}
          {isEditing ? (
            <input
              className="setup-subtitle-input"
              aria-label="Machine details"
              value={setup.machineDetails}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  machineDetails: event.target.value,
                }))
              }
            />
          ) : (
            <p>{setup.machineDetails}</p>
          )}
          <div className="setup-specs">
            {field('basketSize', 'Basket size')}
            {field('temperature', 'Water temperature')}
            {field('preinfusion', 'Pre-infusion')}
          </div>
        </article>

        <article className="setup-detail-card">
          <span className="setup-detail-icon">
            <Gauge size={22} />
          </span>
          <div className="card-eyebrow">COFFEE GRINDER</div>
          {isEditing ? (
            <input
              className="setup-title-input"
              aria-label="Coffee grinder"
              value={setup.grinder}
              onChange={(event) =>
                setSetup((current) => ({ ...current, grinder: event.target.value }))
              }
            />
          ) : (
            <h2>{setup.grinder}</h2>
          )}
          {isEditing ? (
            <input
              className="setup-subtitle-input"
              aria-label="Grinder details"
              value={setup.grinderDetails}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  grinderDetails: event.target.value,
                }))
              }
            />
          ) : (
            <p>{setup.grinderDetails}</p>
          )}
          <div className="setup-specs">
            {field('grindRange', 'Your espresso range')}
            {field('dialDirection', 'Dial direction')}
            {field('doseRange', 'Typical dose')}
          </div>
        </article>

        <article className="setup-detail-card water-card">
          <span className="setup-detail-icon">
            <Droplets size={22} />
          </span>
          <div className="card-eyebrow">WATER & BASKET</div>
          <h2>Dialed-in details</h2>
          <p>A few more things that shape your shot.</p>
          <div className="setup-specs">
            {field('water', 'Water')}
            {field('basket', 'Basket')}
          </div>
        </article>
      </section>
    </>
  )
}
