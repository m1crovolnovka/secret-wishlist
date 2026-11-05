import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MIN_PEOPLE, THEMES, peopleCount, themeToken } from './data'
import { useGo, useStore } from './store'

const LIPS = [
  'M0,100 C240,20 480,170 720,96 C960,22 1200,168 1440,90 L1440,800 C1200,880 960,730 720,804 C480,878 240,724 0,810 Z',
  'M0,70 C240,150 480,10 720,78 C960,146 1200,16 1440,84 L1440,830 C1200,750 960,890 720,822 C480,754 240,888 0,820 Z',
  'M0,120 C220,40 460,180 720,110 C980,40 1220,170 1440,108 L1440,790 C1220,870 980,720 720,792 C460,864 220,730 0,800 Z',
]

const CONFETTI = ['#ff5d8f', '#ffd23f', '#7ec8f0', '#8ee08a', '#d4a5ff', '#ffffff']

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Тайно` : 'Тайно — вишлисты без имён'
  }, [title])
}

export function Squiggle({ color = 'currentColor' }) {
  return (
    <svg width="48" height="12" viewBox="0 0 48 12" fill="none" aria-hidden="true">
      <path
        d="M1 7c3-5 6-5 9 0s6 5 9 0 6-5 9 0 6 5 9 0 6-5 10 0"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SnowMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M7 1v12M1 7h12M2.8 2.8l8.4 8.4M11.2 2.8 2.8 11.2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function Lip({ color }) {
  return (
    <svg className="lip" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill={color}
        d="M0,70 C180,120 340,20 520,64 C740,116 900,16 1100,68 C1260,104 1360,36 1440,72 L1440,120 L0,120 Z"
      />
    </svg>
  )
}

export function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="ph" role="img" aria-label={alt}>
        <span>{alt}</span>
      </div>
    )
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} decoding="async" loading="lazy" />
}

export function Timer({ to, now }) {
  const left = Math.max(0, to - now)
  const total = Math.floor(left / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  const cells = [
    [String(days), 'дни'],
    [pad(hours), 'часы'],
    [pad(mins), 'минуты'],
    [pad(secs), 'секунды'],
  ]
  return (
    <div className="timer" role="timer">
      {cells.map(([value, label]) => (
        <div key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export function Weather({ type = 'snow', color = 'currentColor', count = 16 }) {
  const bits = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      left: `${(index * 37 + type.length * 13) % 100}%`,
      delay: `${-((index * 0.73) % 10)}s`,
      duration: `${(type === 'rain' ? 3.4 : 9) + (index % 5) * 0.8}s`,
      drift: `${(index % 2 === 0 ? -1 : 1) * (10 + (index % 7) * 6)}px`,
      size: 6 + (index % 4) * 3,
      tint: CONFETTI[index % CONFETTI.length],
      spin: `${(index * 47) % 180}deg`,
    }))
  }, [type, count])

  return (
    <div className="weather" aria-hidden="true" style={{ color }}>
      {bits.map((bit, index) => (
        <span
          key={`${type}-${index}`}
          className={`bit bit-${type}`}
          style={{
            left: bit.left,
            animationDelay: bit.delay,
            animationDuration: bit.duration,
            '--drift': bit.drift,
            ...(type === 'confetti'
              ? { background: bit.tint, width: bit.size, height: bit.size * 1.7, rotate: bit.spin }
              : null),
          }}
        />
      ))}
    </div>
  )
}

export function Pour() {
  const { fx } = useStore()
  if (!fx) return null
  const layers = [fx.soft, fx.base, fx.deep]
  return (
    <div className="pour" aria-hidden="true">
      {layers.map((color, index) => (
        <svg
          key={`${fx.id}-${index}`}
          className="pour-svg"
          style={{ animationDelay: `${index * 0.09}s` }}
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <path fill={color} d={LIPS[index]} />
        </svg>
      ))}
    </div>
  )
}

function Lines() {
  return (
    <div className="lines" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function Burger({ open }) {
  return <span className="burger" data-open={open ? 'true' : 'false'} />
}

function Person() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 13.2c.7-2.1 2.4-3.2 4.8-3.2s4.1 1.1 4.8 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Header() {
  const { data, room, isRevealed, isAdmin, reset } = useStore()
  const go = useGo()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const user = data.user
  const token = themeToken(room?.theme)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function travel(to) {
    setOpen(false)
    go(to, token)
  }

  function onColors() {
    setOpen(false)
    const node = document.getElementById('colors')
    if (node && (location.pathname === '/' || location.pathname === '/colors')) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    go('/colors', token)
  }

  function onAccount() {
    setOpen(false)
    travel(user ? '/cabinet' : '/enter')
  }

  return (
    <>
      <Lines />
      <header className="top">
        <button className="circle menu-btn" type="button" aria-label={open ? 'закрыть меню' : 'меню'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Burger open={open} />
        </button>
        <button className="brand blend" type="button" onClick={() => travel('/')}>
          <span className="brand-name">ТАЙНО</span>
          <span className="brand-rule" />
          <span className="brand-sub">
            без
            <br />
            имён
          </span>
        </button>
        <div className="top-actions">
          {isAdmin && (
            <button className="quiet blend" type="button" onClick={onColors}>
              <span className="full">вишлисты</span>
              <span className="short">цвета</span>
            </button>
          )}
          <button className="quiet blend" type="button" onClick={() => travel('/rooms')}>
            <span className="full">комнаты</span>
            <span className="short">мои</span>
          </button>
          <button className="circle letter" type="button" aria-label="личный кабинет" onClick={onAccount}>
            {user ? user.name.slice(0, 1).toUpperCase() : <Person />}
          </button>
        </div>
      </header>
      {open && (
        <nav className="menu">
          <div className="blob blob-menu" />
          <div className="menu-links">
            <button type="button" className="menu-link" onClick={() => travel('/')}>
              Главная
            </button>
            {isAdmin && (
              <button type="button" className="menu-link" onClick={onColors}>
                Вишлисты
              </button>
            )}
            <button type="button" className="menu-link" onClick={() => travel('/rooms')}>
              Комнаты
            </button>
            <button type="button" className="menu-link" onClick={onAccount}>
              Кабинет
            </button>
            {isAdmin && (
              <button type="button" className="menu-link" onClick={() => travel('/admin')}>
                Настройки
              </button>
            )}
          </div>
          <div className="menu-foot">
            <span>{room ? `${room.title} · ${isRevealed ? 'список открыт' : 'ждём срок'}` : 'демо'}</span>
            <button
              type="button"
              className="text-btn light"
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              сбросить демо
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

export function ThemePicker({ value, onChange }) {
  return (
    <div className="themes" role="listbox" aria-label="тема комнаты">
      {Object.values(THEMES).map((theme) => (
        <button
          key={theme.id}
          type="button"
          role="option"
          aria-selected={value === theme.id}
          className={value === theme.id ? 'theme-card on' : 'theme-card'}
          style={{ background: theme.band, color: theme.ink }}
          onClick={() => onChange(theme.id)}
        >
          <Weather type={theme.particle} color={theme.ink} count={8} />
          <span className="theme-copy">
            <span className="crumb">{theme.particleLabel}</span>
            <strong>{theme.label}</strong>
          </span>
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, min = MIN_PEOPLE, onChange, label, disabled }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(next) {
    const number = Math.round(Number(next))
    if (!Number.isFinite(number)) {
      setDraft(String(value))
      return
    }
    const size = Math.max(min, number)
    setDraft(String(size))
    if (size !== value) onChange(size)
  }

  return (
    <div className="stepper">
      <button type="button" aria-label="меньше" disabled={disabled || value <= min} onClick={() => commit(value - 1)}>
        −
      </button>
      <label>
        <input
          type="number"
          min={min}
          inputMode="numeric"
          aria-label="число участников"
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value)
            const number = Number(event.target.value)
            if (event.target.value !== '' && Number.isInteger(number) && number >= min) onChange(number)
          }}
          onBlur={() => commit(draft)}
        />
        <span>{label || peopleCount(value).replace(/^\d+\s/, '')}</span>
      </label>
      <button type="button" aria-label="больше" disabled={disabled} onClick={() => commit(value + 1)}>
        +
      </button>
    </div>
  )
}

export function Mosaic() {
  const { mosaic } = useStore()
  const [seal, setSeal] = useState(false)

  useEffect(() => {
    if (!seal) return undefined
    const id = setTimeout(() => setSeal(false), 3400)
    return () => clearTimeout(id)
  }, [seal])

  return (
    <>
      {seal && (
        <p className="toast" role="status">
          Список закрыт. После раздачи откроется один — тому, кому он выпал. Сейчас видны только цвета.
        </p>
      )}
      <div id="colors">
        {mosaic.map((band) => (
          <button
            key={band.key}
            className="ribbon"
            type="button"
            style={{ background: band.base, color: band.ink }}
            onClick={() => setSeal(true)}
          >
            <Lip color={band.base} />
            <p className="crumb">
              <SnowMark /> список закрыт
            </p>
            <p className="ribbon-index">{band.name}</p>
            <span className="band-more">до раздачи</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function Collection({ wl, kicker, side, particle = 'snow' }) {
  return (
    <article className="field" style={{ background: wl.base, color: wl.ink }}>
      <Weather type={particle} color={wl.ink} />
      <div className="blob blob-a" style={{ background: wl.soft }} />
      <div className="field-top">
        <p className="crumb">
          <SnowMark /> {kicker}
        </p>
        <div className="field-head">
          <h1>{wl.name}</h1>
          <div className="field-side">
            <div className="label">
              <Squiggle />
              <span>желания</span>
            </div>
            <p className="note">{wl.note}</p>
            {side}
          </div>
        </div>
      </div>
      {wl.gifts?.length ? (
        <ol className="gift-grid">
          {wl.gifts.map((gift) => (
            <li className="gift" key={gift.id}>
              <div className="frame">
                <Photo src={gift.photo} alt={gift.title} />
              </div>
              <h3>{gift.title}</h3>
              {gift.url ? (
                <a className="buy" href={gift.url} target="_blank" rel="noreferrer">
                  к покупке
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="note empty-note">В этом списке пока пусто.</p>
      )}
    </article>
  )
}

export function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
