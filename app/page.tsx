'use client'

import { useEffect, useMemo, useState } from 'react'
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
  User as UserIcon,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthModal } from '@/components/auth-modal'
import type { User } from '@supabase/supabase-js'

type Shot = {
  id: number
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
}

const initialShots: Shot[] = [
  { id: 1, bean: 'Ethiopia Guji', roaster: 'April Coffee', date: 'Today, 9:42 AM', dose: 18.2, yield: 39, grind: 2.4, time: 29, rating: 5, flavors: ['Blueberry', 'Jasmine', 'Honey'], acidity: 3, bitterness: 1, notes: 'Sweet, floral, and beautifully balanced. Best one yet.' },
  { id: 2, bean: 'Ethiopia Guji', roaster: 'April Coffee', date: 'Today, 8:16 AM', dose: 18, yield: 42, grind: 2.6, time: 24, rating: 3, flavors: ['Citrus', 'Tea'], acidity: 4, bitterness: 1, notes: 'A little too quick. Bright lemon, thin finish.' },
  { id: 3, bean: 'House Blend No. 4', roaster: 'Dayglow', date: 'Yesterday, 10:03 AM', dose: 18.5, yield: 37, grind: 2.2, time: 32, rating: 4, flavors: ['Chocolate', 'Almond', 'Caramel'], acidity: 2, bitterness: 2, notes: 'Rich and syrupy. Could open up the grind a touch.' },
  { id: 4, bean: 'Colombia El Paraiso', roaster: 'Sey Coffee', date: 'Oct 12, 9:24 AM', dose: 18, yield: 40, grind: 2.5, time: 27, rating: 4, flavors: ['Peach', 'Vanilla'], acidity: 3, bitterness: 2, notes: 'Stone fruit sweetness with a silky texture.' },
]

const navItems = [
  { name: 'Overview', icon: Activity },
  { name: 'My shots', icon: Coffee },
  { name: 'Coffee shelf', icon: Bean },
]

function AppLogo() {
  return <div className="brand-mark" aria-hidden="true"><Coffee size={19} strokeWidth={1.8} /></div>
}

function StatCard({ label, value, detail, icon: Icon, trend }: { label: string; value: string; detail: string; icon: typeof Activity; trend?: 'up' | 'down' }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={16} /></span></div><div className="stat-value">{value}</div><div className="stat-detail">{trend && <span className="trend"><ArrowUpRight size={13} /></span>}{detail}</div></article>
}

function ShotCard({ shot, onClick }: { shot: Shot; onClick: () => void }) {
  return (
    <button type="button" className="shot-row" onClick={onClick}>
      <span className="shot-bean-icon"><Bean size={17} /></span>
      <span className="shot-main"><span className="shot-name">{shot.bean}</span><span className="shot-roaster">{shot.roaster}</span></span>
      <span className="shot-recipe"><strong>{shot.dose}g</strong><span>in</span><strong>{shot.yield}g</strong><span>out</span></span>
      <span className="shot-time"><Clock3 size={13} /> {shot.time}s</span>
      <span className="shot-rating" aria-label={`${shot.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < shot.rating ? 'currentColor' : 'none'} />)}</span>
      <span className="shot-date">{shot.date}</span>
      <ChevronRight className="shot-chevron" size={16} />
    </button>
  )
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [shots, setShots] = useState(initialShots)
  const [activeNav, setActiveNav] = useState('Overview')
  const [showLog, setShowLog] = useState(false)
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null)
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [dose, setDose] = useState('18.0')
  const [yieldAmount, setYieldAmount] = useState('40')
  const [grind, setGrind] = useState('2.4')
  const [time, setTime] = useState('28')
  const [bean, setBean] = useState('Ethiopia Guji')
  const [notes, setNotes] = useState('')
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(['Chocolate'])
  const [acidity, setAcidity] = useState(2)
  const [bitterness, setBitterness] = useState(2)
  const [rating, setRating] = useState(4)
  const [saved, setSaved] = useState(false)
  const today = new Date()
  const longDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const shortDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Jamie Parker'
  const userInitial = username.charAt(0).toUpperCase()

  const filteredShots = useMemo(() => shots.filter((shot) => `${shot.bean} ${shot.roaster} ${shot.flavors.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [shots, search])

  function saveShot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const newShot: Shot = {
      id: Date.now(), bean: bean.trim() || 'Untitled coffee', roaster: 'My coffee setup', date: 'Just now',
      dose: Number(dose), yield: Number(yieldAmount), grind: Number(grind), time: Number(time), rating,
      flavors: selectedFlavors, acidity, bitterness, notes: notes.trim(),
    }
    setShots((current) => [newShot, ...current])
    setSaved(true)
    setTimeout(() => { setSaved(false); setShowLog(false) }, 700)
  }

  function toggleFlavor(flavor: string) {
    setSelectedFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])
  }

  const displayedShots = activeNav === 'Coffee shelf' ? filteredShots.filter((shot, index, list) => list.findIndex((item) => item.bean === shot.bean) === index) : filteredShots

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand"><AppLogo /><span>portafilter</span><button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <div className="workspace-label">YOUR COFFEE JOURNAL</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-link ${activeNav === name ? 'active' : ''}`} onClick={() => { setActiveNav(name); setMobileMenu(false) }}><Icon size={17} strokeWidth={1.8} /><span>{name}</span>{name === 'My shots' && <span className="nav-count">{shots.length}</span>}</button>)}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label setup-label">YOUR SETUP</div>
        <button className="setup-card" onClick={() => setActiveNav('Setup')}><span className="setup-icon"><Settings2 size={16} /></span><span className="setup-copy"><strong>Espresso setup</strong><small>La Marzocco Linea Mini</small></span><ChevronRight size={15} /></button>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip"><span className="tip-sparkle"><Sparkles size={15} /></span><p><strong>A little tip</strong><br />A 1:2 ratio is a lovely place to start. Adjust to taste.</p></div>
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
      {mobileMenu && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <section className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumb">Your journal <ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-right">
            <span className="today-label">{shortDate}</span>
            <button className="icon-button" aria-label="Search shots" onClick={() => document.getElementById('shot-search')?.focus()}><Search size={17} /></button>
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
          {activeNav === 'Setup' ? <SetupPanel /> : <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">{longDate.toUpperCase()} <span className="eyebrow-dot" /> DAY 12 OF YOUR JOURNAL</div>
                <h1>{activeNav === 'Coffee shelf' ? 'Your coffee shelf' : activeNav === 'My shots' ? 'Your shot history' : `Good morning, ${username.split(' ')[0]}`}<span className="heading-period">.</span></h1>
                <p className="page-subtitle">{activeNav === 'Coffee shelf' ? 'A little collection of the coffees you’ve been brewing.' : activeNav === 'My shots' ? 'Every shot is a little more know-how for next time.' : 'A fresh day, a warm cup, and plenty to explore.'}</p>
              </div>
              <button className="primary-button" onClick={() => { setShowLog(true); setSaved(false) }}><Plus size={17} /> Log a shot</button>
            </div>

            {activeNav === 'Overview' && <>
              <section className="stats-grid" aria-label="Journal stats">
                <StatCard label="SHOTS PULLED" value={String(shots.length + 27)} detail="+ 6 this week" icon={Coffee} trend="up" />
                <StatCard label="CURRENT STREAK" value="6 days" detail="You’re on a roll" icon={Activity} />
                <StatCard label="FAVORITE RATIO" value="1 : 2.1" detail="18g in · 38g out" icon={Target} />
                <StatCard label="TOP RATED BEAN" value="Ethiopia Guji" detail="4.8 average rating" icon={Star} />
              </section>

              <section className="feature-grid">
                <article className="recipe-card">
                  <div className="recipe-card-top"><div><div className="card-eyebrow"><Sparkles size={13} /> YOUR CURRENT FAVORITE</div><h2>That just-right shot</h2><p>From your best Ethiopia Guji pull</p></div><div className="recipe-bean-illustration" aria-hidden="true"><Bean size={56} strokeWidth={1} /></div></div>
                  <div className="recipe-values"><div><span>DOSE</span><strong>18.2<small>g</small></strong></div><div className="recipe-separator" /><div><span>YIELD</span><strong>39<small>g</small></strong></div><div className="recipe-separator" /><div><span>TIME</span><strong>29<small>s</small></strong></div><div className="recipe-separator" /><div><span>GRIND</span><strong>2.4</strong></div></div>
                  <div className="recipe-footer"><span><span className="recipe-star"><Star size={13} fill="currentColor" /></span> Your highest rated recipe</span><button onClick={() => { setBean('Ethiopia Guji'); setDose('18.2'); setYieldAmount('39'); setGrind('2.4'); setTime('29'); setShowLog(true) }}>Brew this again <ArrowUpRight size={14} /></button></div>
                </article>
                <article className="insight-card"><div className="insight-heading"><span className="insight-icon"><Activity size={16} /></span><span className="insight-label">A THING YOU’RE LEARNING</span><button aria-label="More insights"><MoreHorizontal size={18} /></button></div><h3>A finer grind is<br />bringing out the fruit.</h3><p>Your Guji shots under 2.5 are tasting sweeter, with less sharp acidity. Worth exploring?</p><div className="insight-chart"><div className="chart-labels"><span>SWEETNESS</span><span>ACIDITY</span></div><div className="chart-row"><span>2.4 grind</span><div className="chart-track"><span className="chart-fill sweet-fill" /></div><strong>4.8</strong></div><div className="chart-row"><span>2.6 grind</span><div className="chart-track"><span className="chart-fill acid-fill" /></div><strong>3.2</strong></div></div><div className="insight-foot"><span>Based on 8 shots with this bean</span><ArrowUpRight size={14} /></div></article>
              </section>
            </>}

            <section className="recent-section"><div className="section-heading"><div><h2>{activeNav === 'Coffee shelf' ? 'Recent brews' : activeNav === 'My shots' ? 'All your shots' : 'Recent shots'}</h2><p>{activeNav === 'Coffee shelf' ? 'Your coffees, one cup at a time.' : 'Small experiments, delicious discoveries.'}</p></div><div className="list-actions"><label className="search-box" htmlFor="shot-search"><Search size={15} /><input id="shot-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a shot..." /></label><button className="filter-button" onClick={() => setSearch('')}><SlidersHorizontal size={15} /><span>Filter</span></button><button className="view-all" onClick={() => setActiveNav('My shots')}>View all <ArrowUpRight size={14} /></button></div></div>
              <div className="shots-card"><div className="shots-header"><span>COFFEE</span><span>RECIPE</span><span>TIME</span><span>RATING</span><span>BREWED</span><span /></div>{displayedShots.length ? displayedShots.slice(0, activeNav === 'Overview' ? 4 : undefined).map((shot) => <ShotCard key={shot.id} shot={shot} onClick={() => setSelectedShot(shot)} />) : <div className="no-results">No shots match that search. Try another bean or flavor.</div>}</div>
              <div className="list-footer"><span>Showing {displayedShots.length} of {activeNav === 'Overview' ? shots.length + 27 : shots.length} shots</span><button onClick={() => setActiveNav('My shots')}>See your full journal <ArrowUpRight size={14} /></button></div>
            </section>
            <footer className="page-footer"><span>Made for the love of a good shot.</span><span>Keep experimenting <span className="footer-dot">·</span> Keep tasting <span className="footer-dot">·</span> Keep notes</span></footer>
          </>}
        </div>
      </section>

      {showLog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLog(false) }}><section className="log-modal" role="dialog" aria-modal="true" aria-labelledby="log-title"><div className="modal-header"><div><div className="card-eyebrow"><Coffee size={13} /> YOUR BREW JOURNAL</div><h2 id="log-title">Log a new shot</h2><p>Every little detail helps you find your perfect cup.</p></div><button className="modal-close" onClick={() => setShowLog(false)} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={saveShot}><div className="form-section-title"><span>01</span> THE RECIPE</div><label className="form-field full-field"><span>Coffee bean</span><input value={bean} onChange={(event) => setBean(event.target.value)} placeholder="e.g. Ethiopia Guji" required /></label><div className="recipe-input-grid"><label className="form-field"><span>Dose <small>grams in</small></span><div className="number-field"><input type="number" step="0.1" min="1" value={dose} onChange={(event) => setDose(event.target.value)} required /><span>g</span></div></label><label className="form-field"><span>Yield <small>grams out</small></span><div className="number-field"><input type="number" step="1" min="1" value={yieldAmount} onChange={(event) => setYieldAmount(event.target.value)} required /><span>g</span></div></label><label className="form-field"><span>Grind setting</span><div className="number-field"><input type="number" step="0.1" min="0" value={grind} onChange={(event) => setGrind(event.target.value)} required /><Settings2 size={14} /></div></label><label className="form-field"><span>Pull time</span><div className="number-field"><input type="number" step="1" min="1" value={time} onChange={(event) => setTime(event.target.value)} required /><span>s</span></div></label></div><div className="form-section-title tasting-title"><span>02</span> THE TASTING NOTES</div><fieldset className="flavor-field"><legend>What flavors came through?</legend><div className="flavor-chips">{['Chocolate', 'Caramel', 'Citrus', 'Berry', 'Floral', 'Nutty', 'Stone fruit', 'Spice'].map((flavor) => <button type="button" key={flavor} className={`flavor-chip ${selectedFlavors.includes(flavor) ? 'selected' : ''}`} onClick={() => toggleFlavor(flavor)}>{selectedFlavors.includes(flavor) && <Check size={12} />}{flavor}</button>)}</div></fieldset><div className="taste-sliders"><TasteSlider label="Sourness" value={acidity} onChange={setAcidity} low="Low" high="Bright" tint="sour" /><TasteSlider label="Bitterness" value={bitterness} onChange={setBitterness} low="Soft" high="Bold" tint="bitter" /></div><label className="form-field notes-field"><span>A few words about this shot <small>optional</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it taste? Anything you’d change next time?" rows={2} /></label><div className="rating-line"><span>Overall, how was it?</span><div className="rating-picker" aria-label="Rate this shot">{Array.from({ length: 5 }, (_, index) => <button type="button" key={index} onClick={() => setRating(index + 1)} aria-label={`Rate ${index + 1} stars`}><Star size={19} fill={index < rating ? 'currentColor' : 'none'} /></button>)}</div></div><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setShowLog(false)}>Cancel</button><button className="primary-button" type="submit">{saved ? <><Check size={16} /> Shot saved</> : <><Plus size={16} /> Save this shot</>}</button></div></form></section></div>}

      {selectedShot && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedShot(null) }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="modal-close detail-close" onClick={() => setSelectedShot(null)} aria-label="Close details"><X size={19} /></button><span className="detail-bean"><Bean size={20} /></span><div className="eyebrow">{selectedShot.date.toUpperCase()}</div><h2 id="detail-title">{selectedShot.bean}</h2><p className="detail-roaster">{selectedShot.roaster}</p><div className="detail-recipe"><div><span>DOSE</span><strong>{selectedShot.dose}g</strong></div><div><span>YIELD</span><strong>{selectedShot.yield}g</strong></div><div><span>GRIND</span><strong>{selectedShot.grind}</strong></div><div><span>TIME</span><strong>{selectedShot.time}s</strong></div></div><div className="detail-rating">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < selectedShot.rating ? 'currentColor' : 'none'} />)}<span>{selectedShot.rating}.0</span></div><div className="detail-flavors">{selectedShot.flavors.map((flavor) => <span key={flavor}>{flavor}</span>)}</div>{selectedShot.notes && <p className="detail-notes">“{selectedShot.notes}”</p>}<div className="detail-tastes"><TasteMeter label="Sourness" value={selectedShot.acidity} tint="sour" /><TasteMeter label="Bitterness" value={selectedShot.bitterness} tint="bitter" /></div></section></div>}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {}}
      />
    </main>
  )
}

function TasteSlider({ label, value, onChange, low, high, tint }: { label: string; value: number; onChange: (value: number) => void; low: string; high: string; tint: string }) {
  return <div className={`taste-slider ${tint}`}><div className="taste-slider-head"><span>{label}</span><strong>{value}<small> / 5</small></strong></div><input type="range" min="1" max="5" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /><div className="range-caption"><span>{low}</span><span>{high}</span></div></div>
}

function TasteMeter({ label, value, tint }: { label: string; value: number; tint: string }) {
  return <div className={`taste-meter ${tint}`}><span>{label}</span><div>{Array.from({ length: 5 }, (_, index) => <i className={index < value ? 'filled' : ''} key={index} />)}</div><strong>{value}/5</strong></div>
}

function SetupPanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [setup, setSetup] = useState({
    machine: 'La Marzocco Linea Mini', machineDetails: 'Dual boiler · 58mm portafilter', basketSize: '18g precision', temperature: '93°C', preinfusion: '5 seconds',
    grinder: 'Niche Zero', grinderDetails: 'Single dose · 63mm conical burrs', grindRange: '1.8 — 3.2', dialDirection: 'Clockwise = finer', doseRange: '18.0 — 18.5g', water: 'Third Wave Water', basket: 'VST 18g ridgeless',
  })

  function field(key: keyof typeof setup, label: string) {
    return <div key={key}><span>{label}</span>{isEditing ? <input className="setup-edit-input" aria-label={label} value={setup[key]} onChange={(event) => setSetup((current) => ({ ...current, [key]: event.target.value }))} /> : <strong>{setup[key]}</strong>}</div>
  }

  return <><div className="page-heading setup-heading"><div><div className="eyebrow">YOUR BREWING CORNER</div><h1>Your setup<span className="heading-period">.</span></h1><p className="page-subtitle">The tools behind all those delicious experiments.</p></div><button className="primary-button" onClick={() => setIsEditing((current) => !current)}>{isEditing ? <><Check size={16} /> Done</> : <><Settings2 size={16} /> Edit setup</>}</button></div><section className="setup-page-grid"><article className="setup-detail-card"><span className="setup-detail-icon"><Coffee size={22} /></span><div className="card-eyebrow">ESPRESSO MACHINE</div>{isEditing ? <input className="setup-title-input" aria-label="Espresso machine" value={setup.machine} onChange={(event) => setSetup((current) => ({ ...current, machine: event.target.value }))} /> : <h2>{setup.machine}</h2>}{isEditing ? <input className="setup-subtitle-input" aria-label="Machine details" value={setup.machineDetails} onChange={(event) => setSetup((current) => ({ ...current, machineDetails: event.target.value }))} /> : <p>{setup.machineDetails}</p>}<div className="setup-specs">{field('basketSize', 'Basket size')}{field('temperature', 'Water temperature')}{field('preinfusion', 'Pre-infusion')}</div></article><article className="setup-detail-card"><span className="setup-detail-icon"><Gauge size={22} /></span><div className="card-eyebrow">COFFEE GRINDER</div>{isEditing ? <input className="setup-title-input" aria-label="Coffee grinder" value={setup.grinder} onChange={(event) => setSetup((current) => ({ ...current, grinder: event.target.value }))} /> : <h2>{setup.grinder}</h2>}{isEditing ? <input className="setup-subtitle-input" aria-label="Grinder details" value={setup.grinderDetails} onChange={(event) => setSetup((current) => ({ ...current, grinderDetails: event.target.value }))} /> : <p>{setup.grinderDetails}</p>}<div className="setup-specs">{field('grindRange', 'Your espresso range')}{field('dialDirection', 'Dial direction')}{field('doseRange', 'Typical dose')}</div></article><article className="setup-detail-card water-card"><span className="setup-detail-icon"><Droplets size={22} /></span><div className="card-eyebrow">WATER & BASKET</div><h2>Dialed-in details</h2><p>A few more things that shape your shot.</p><div className="setup-specs">{field('water', 'Water')}{field('basket', 'Basket')}</div></article></section></>
}
