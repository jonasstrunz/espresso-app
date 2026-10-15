'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bean,
  BookOpen,
  Check,
  ChevronDown,
  Coffee,
  Gauge,
  Clock3,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'

type Shot = {
  id: number
  bean: string
  date: string
  dose: number
  yield: number
  time: number
  grind: number
  score: number
  flavors: string[]
  note: string
}

const initialShots: Shot[] = [
  { id: 1, bean: 'Ethiopia · Halo Beriti', date: 'Today, 9:42 AM', dose: 18, yield: 38, time: 29, grind: 12, score: 4.8, flavors: ['Blueberry', 'Jasmine'], note: 'Sweet, syrupy finish. Best shot so far.' },
  { id: 2, bean: 'Ethiopia · Halo Beriti', date: 'Today, 8:16 AM', dose: 18, yield: 40, time: 24, grind: 13, score: 3.6, flavors: ['Citrus', 'Honey'], note: 'A little quick, leaning bright.' },
  { id: 3, bean: 'Colombia · El Paraiso', date: 'Yesterday, 4:28 PM', dose: 18.5, yield: 38, time: 32, grind: 11, score: 4.2, flavors: ['Caramel', 'Red apple'], note: 'Rounded and smooth, could use more clarity.' },
]

const navItems = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'shots', label: 'Shot journal', icon: BookOpen },
  { id: 'beans', label: 'My beans', icon: Bean },
  { id: 'machine', label: 'Machine setup', icon: Settings2 },
]

const flavorOptions = ['Chocolate', 'Caramel', 'Citrus', 'Berry', 'Nutty', 'Floral', 'Stone fruit', 'Spice']

function ShotModal({ onClose, onSave, currentBean, currentGrind }: {
  onClose: () => void
  onSave: (shot: Omit<Shot, 'id' | 'date'>) => void
  currentBean: string
  currentGrind: number
}) {
  const [bean, setBean] = useState(currentBean)
  const [dose, setDose] = useState('18')
  const [yieldGrams, setYieldGrams] = useState('38')
  const [time, setTime] = useState('29')
  const [grind, setGrind] = useState(String(currentGrind))
  const [score, setScore] = useState(4)
  const [flavors, setFlavors] = useState<string[]>(['Caramel'])
  const [note, setNote] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ bean, dose: Number(dose), yield: Number(yieldGrams), time: Number(time), grind: Number(grind), score, flavors, note })
  }

  function toggleFlavor(flavor: string) {
    setFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="shot-modal" role="dialog" aria-modal="true" aria-labelledby="shot-modal-title">
        <header className="modal-header">
          <div><span className="eyebrow">YOUR NEXT EXPERIMENT</span><h2 id="shot-modal-title">Log a shot</h2><p>Small tweaks make a big difference. Capture what you learn.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close shot form"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="shot-form">
          <label className="form-field form-field-wide"><span>Bean</span><input value={bean} onChange={(event) => setBean(event.target.value)} required /></label>
          <div className="form-grid">
            <label className="form-field"><span>Dose <small>g</small></span><input type="number" step="0.1" min="1" max="40" value={dose} onChange={(event) => setDose(event.target.value)} required /></label>
            <label className="form-field"><span>Yield <small>g</small></span><input type="number" step="0.1" min="1" max="120" value={yieldGrams} onChange={(event) => setYieldGrams(event.target.value)} required /></label>
            <label className="form-field"><span>Time <small>sec</small></span><input type="number" min="1" max="120" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
            <label className="form-field"><span>Grind setting</span><input type="number" step="0.5" min="0" max="100" value={grind} onChange={(event) => setGrind(event.target.value)} required /></label>
          </div>
          <div className="form-field"><span>What did you taste?</span><div className="flavor-picker">{flavorOptions.map((flavor) => <button type="button" key={flavor} className={`flavor-chip ${flavors.includes(flavor) ? 'selected' : ''}`} onClick={() => toggleFlavor(flavor)}>{flavors.includes(flavor) && <Check size={12} />}{flavor}</button>)}</div></div>
          <div className="rating-row"><label htmlFor="shot-score">How was the balance?</label><div className="rating-control"><input id="shot-score" type="range" min="1" max="5" step="0.1" value={score} onChange={(event) => setScore(Number(event.target.value))} /><strong>{score.toFixed(1)}<span> / 5</span></strong></div><div className="range-captions"><span>Needs work</span><span>Dialed in</span></div></div>
          <label className="form-field"><span>Tasting note <small>optional</small></span><textarea placeholder="What stood out in this cup?" value={note} onChange={(event) => setNote(event.target.value)} rows={2} /></label>
          <footer className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button-primary"><Check size={15} /> Save shot</button></footer>
        </form>
      </section>
    </div>
  )
}

function SetupModal({ grinder, machine, onClose, onSave }: { grinder: string; machine: string; onClose: () => void; onSave: (machine: string, grinder: string) => void }) {
  const [machineName, setMachineName] = useState(machine)
  const [grinderName, setGrinderName] = useState(grinder)
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="shot-modal setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-modal-title"><header className="modal-header"><div><span className="eyebrow">YOUR HOME BAR</span><h2 id="setup-modal-title">Machine setup</h2><p>Keep your gear and grinder range close at hand.</p></div><button className="icon-button" onClick={onClose} aria-label="Close setup"><X size={19} /></button></header><form className="shot-form" onSubmit={(event) => { event.preventDefault(); onSave(machineName, grinderName) }}><label className="form-field"><span>Espresso machine</span><input value={machineName} onChange={(event) => setMachineName(event.target.value)} required /></label><label className="form-field"><span>Grinder</span><input value={grinderName} onChange={(event) => setGrinderName(event.target.value)} required /></label><label className="form-field"><span>Grinder adjustment range</span><div className="range-readout"><span>Fine</span><div className="range-track"><i /></div><span>Coarse</span></div><small className="field-hint">Your current dial-in range is around settings 11–14.</small></label><footer className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button-primary"><Check size={15} /> Save setup</button></footer></form></section></div>
}

function ShotRows({ shots }: { shots: Shot[] }) {
  return <div className="shot-list">{shots.map((shot) => <article className="shot-row" key={shot.id}><div className="shot-row-bean"><span className="bean-avatar"><Coffee size={17} /></span><div><strong>{shot.bean}</strong><span>{shot.date}</span></div></div><div className="shot-recipe"><strong>{shot.dose} <small>in</small> <span className="recipe-arrow">→</span> {shot.yield} <small>out</small></strong><span>Grind {shot.grind} · {shot.time}s</span></div><div className="shot-tastes">{shot.flavors.length ? shot.flavors.map((flavor) => <span className="tasting-chip" key={flavor}>{flavor}</span>) : <span className="tasting-chip muted-chip">No flavors yet</span>}</div><div className="shot-score"><span className="score-dot" />{shot.score.toFixed(1)}</div></article>)}</div>
}

export function EspressoDashboard() {
  const [shots, setShots] = useState(initialShots)
  const [activeNav, setActiveNav] = useState('overview')
  const [showShotModal, setShowShotModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [search, setSearch] = useState('')
  const [machine, setMachine] = useState('Breville Bambino Plus')
  const [grinder, setGrinder] = useState('Baratza Encore ESP')
  const [notice, setNotice] = useState('')
  const [bean, setBean] = useState('Ethiopia · Halo Beriti')

  const filteredShots = useMemo(() => shots.filter((shot) => `${shot.bean} ${shot.flavors.join(' ')} ${shot.note}`.toLowerCase().includes(search.toLowerCase())), [shots, search])
  const averageScore = shots.length ? (shots.reduce((total, shot) => total + shot.score, 0) / shots.length).toFixed(1) : '—'
  const activeLabel = navItems.find((item) => item.id === activeNav)?.label ?? 'Overview'

  function saveShot(shot: Omit<Shot, 'id' | 'date'>) {
    setShots((current) => [{ ...shot, id: Date.now(), date: 'Just now' }, ...current])
    setBean(shot.bean)
    setNotice('Shot added to your journal. Nice work dialing it in.')
    setShowShotModal(false)
    window.setTimeout(() => setNotice(''), 3600)
  }

  function saveSetup(updatedMachine: string, updatedGrinder: string) {
    setMachine(updatedMachine)
    setGrinder(updatedGrinder)
    setShowSetupModal(false)
    setNotice('Your home bar setup has been updated.')
    window.setTimeout(() => setNotice(''), 3600)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a href="#overview" className="brand-lockup" onClick={() => setActiveNav('overview')}><span className="brand-mark"><Coffee size={20} strokeWidth={1.8} /></span><span> crema<span className="brand-period">.</span><small>THE ESPRESSO JOURNAL</small></span></a>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activeNav === id ? 'active' : ''}`} onClick={() => { setActiveNav(id); if (id === 'machine') setShowSetupModal(true) }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === 'shots' && <span className="nav-count">{shots.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-icon"><Sparkles size={15} /></span><strong>Good coffee takes practice.</strong><p>Every shot is a clue. Keep experimenting.</p></div><button className="profile-button" onClick={() => setShowSetupModal(true)}><span className="profile-avatar">J</span><span><strong>Jamie&apos;s home bar</strong><small>Personal workspace</small></span><ChevronDown size={15} /></button></div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeLabel}</strong></div><div className="topbar-actions"><span className="today-label">MONDAY, OCTOBER 14</span><button className="gear-button" onClick={() => setShowSetupModal(true)} aria-label="Edit machine setup"><Settings2 size={18} /></button><button className="avatar-small" aria-label="Jamie profile">J</button></div></header>
        <div className="page-content">
          {notice && <div className="notice-banner" role="status"><Check size={16} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
          <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> YOUR COFFEE, FIGURED OUT</div><h1>{activeNav === 'shots' ? 'The shot journal' : activeNav === 'beans' ? 'Your bean shelf' : 'Good morning, Jamie'}</h1><p>{activeNav === 'shots' ? 'A little record of every experiment, every breakthrough.' : activeNav === 'beans' ? "Follow the coffees you're brewing and tasting." : "A new day, a fresh dial-in. Let's make it a good one."}</p></div><button className="button-primary log-button" onClick={() => setShowShotModal(true)}><Plus size={17} /> Log a shot</button></div>

          <section className="hero-card"><div className="hero-copy"><span className="hero-overline"><span className="hero-spark"><Sparkles size={13} /></span> YOUR CURRENT DIAL-IN</span><h2>{bean}</h2><p>Washed · Heirloom · Light roast</p><div className="hero-recipe"><div><span>DOSE</span><strong>18<span>g</span></strong></div><span className="hero-recipe-divider" /><div><span>YIELD</span><strong>38<span>g</span></strong></div><span className="hero-recipe-divider" /><div><span>TIME</span><strong>29<span>sec</span></strong></div><span className="hero-recipe-divider" /><div><span>GRIND</span><strong>12</strong></div></div><button className="hero-link" onClick={() => setShowShotModal(true)}>Try this recipe <ArrowRight size={15} /></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="coffee-bean-art"><span /></div><div className="art-caption">HALO<br />BERITI</div><span className="art-number">01</span></div><div className="hero-footer"><span><span className="footer-check"><Check size={11} /></span> DIALED IN</span><span>Last updated today <span className="footer-separator">·</span> 9:42 AM</span></div></section>

          <div className="stats-grid"><article className="stat-card"><div className="stat-icon amber"><Coffee size={17} /></div><span className="stat-label">SHOTS THIS WEEK</span><strong className="stat-value">{String(shots.length + 9).padStart(2, '0')}</strong><span className="stat-foot"><ArrowUpRight size={13} /> 3 more than last week</span><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div></article><article className="stat-card"><div className="stat-icon sage"><Gauge size={17} /></div><span className="stat-label">AVERAGE BALANCE</span><strong className="stat-value">{averageScore}<small> / 5</small></strong><span className="stat-foot">Across your last {shots.length} shots</span><div className="score-progress"><i style={{ width: `${Math.min(Number(averageScore) * 20, 100)}%` }} /></div></article><article className="stat-card"><div className="stat-icon rose"><Activity size={17} /></div><span className="stat-label">YOUR SWEET SPOT</span><strong className="stat-value">1:2.1</strong><span className="stat-foot">Your most-loved brew ratio</span><div className="ratio-decoration">18g <ArrowRight size={13} /> 38g</div></article></div>

          <section className="journal-section"><div className="section-heading"><div><span className="eyebrow">A LOG OF THE LITTLE THINGS</span><h2>{activeNav === 'beans' ? 'Recent beans' : 'Recent shots'} <span className="heading-count">{shots.length}</span></h2></div><div className="section-actions"><label className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your journal" aria-label="Search shot journal" />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={13} /></button>}</label><button className="filter-button" onClick={() => setActiveNav('shots')}><SlidersHorizontal size={15} /><span>All shots</span><ChevronDown size={13} /></button></div></div><ShotRows shots={filteredShots.slice(0, 4)} />{filteredShots.length === 0 && <div className="empty-search">No shots match that search. Try a bean or flavor name.</div>}<button className="view-all-button" onClick={() => setActiveNav('shots')}>View all shots <ArrowRight size={14} /></button></section>

          <section className="setup-strip"><div className="setup-strip-icon"><Settings2 size={17} /></div><div className="setup-strip-copy"><strong>Your home bar</strong><span>{machine} <i>·</i> {grinder}</span></div><button onClick={() => setShowSetupModal(true)}>Edit setup <ArrowRight size={14} /></button></section>
          <footer className="page-footer"><span>Made for the love of a good shot.</span><span>Keep tasting, keep learning.</span></footer>
        </div>
      </section>
      {showShotModal && <ShotModal onClose={() => setShowShotModal(false)} onSave={saveShot} currentBean={bean} currentGrind={12} />}
      {showSetupModal && <SetupModal machine={machine} grinder={grinder} onClose={() => setShowSetupModal(false)} onSave={saveSetup} />}
    </main>
  )
}

export default EspressoDashboard
