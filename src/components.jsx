import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { mediaUrl } from './api'
import { MIN_PEOPLE, THEMES, peopleCount, themeToken } from './data'
import { useGo, useStore } from './store'
import { getTelegramPhotoUrl } from './telegram'

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
  const resolved = mediaUrl(src)
  if (!resolved || failed) {
    const mark = (alt || '?').trim().slice(0, 1).toUpperCase() || '?'
    return (
      <div className="ph" role="img" aria-label={alt || 'без фото'}>
        <span aria-hidden="true">{mark}</span>
      </div>
    )
  }
  return <img src={resolved} alt={alt} onError={() => setFailed(true)} decoding="async" loading="lazy" />
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

function IconHome({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
    </svg>
  )
}

function IconDoor({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 21V5.8A1.8 1.8 0 0 1 7.8 4H16v17"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
      <path d="M16 4h1.2A1.8 1.8 0 0 1 19 5.8V21H6" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <circle cx="14.2" cy="12.2" r="0.9" fill="currentColor" />
    </svg>
  )
}

function IconProfile({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M5 19.2c.9-3.4 3.4-5.1 7-5.1s6.1 1.7 7 5.1"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPlus({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSearch({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M16.2 16.2 20 20" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </svg>
  )
}

export function Hint({ text }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <span className="hint-wrap">
      <span
        className="hint-btn"
        role="button"
        tabIndex={0}
        aria-label="подсказка"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }
        }}
      >
        ?
      </span>
      {open &&
        createPortal(
          <div
            className="hint-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
          >
            <div className="hint-card" onClick={(e) => e.stopPropagation()}>
              <p className="hint-card-text">{text}</p>
              <button className="fill" type="button" onClick={() => setOpen(false)}>
                Понятно
              </button>
            </div>
          </div>,
          document.body,
        )}
    </span>
  )
}

function IconBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GiftMini({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="14" y="28" width="36" height="26" rx="4" fill="#FBCDDD" />
      <rect x="12" y="22" width="40" height="10" rx="3" fill="#E5A0B8" />
      <rect x="29" y="22" width="6" height="32" fill="#32131D" opacity="0.85" />
      <path d="M32 22c-6-8-14-6-14 0 0 4 6 6 14 8 8-2 14-4 14-8 0-6-8-8-14 0Z" fill="#DC6487" />
    </svg>
  )
}

export function Header() {
  const { data, room } = useStore()
  const go = useGo()
  const location = useLocation()
  const navigate = useNavigate()
  const user = data.user
  const photoUrl = user?.photoUrl || getTelegramPhotoUrl()
  const avatarLetter = (user?.firstName || user?.username || '?').trim().slice(0, 1).toUpperCase()
  const token = themeToken(room?.theme)
  const path = location.pathname

  const nested =
    path === '/room' ||
    path === '/admin' ||
    path === '/colors' ||
    path === '/rooms/new' ||
    path.startsWith('/cabinet') ||
    path.startsWith('/shared') ||
    path.startsWith('/legal') ||
    path === '/rules'

  const topTitle =
    path === '/room'
      ? 'Комната'
      : path === '/rooms/new'
        ? 'Создание'
        : path === '/find'
          ? 'Найти'
          : path === '/cabinet' || path.startsWith('/cabinet/')
            ? 'Профиль'
            : path === '/admin'
              ? 'Настройки'
              : path === '/colors'
                ? 'Участники'
                : ''

  function travel(to) {
    go(to, token)
  }

  const homeOn = path === '/'
  const createOn = path === '/rooms/new'
  const findOn = path === '/find' || path === '/enter'

  return (
    <>
      <header className="top-redesign">
        {nested ? (
          <button className="back-chip" type="button" aria-label="назад" onClick={() => navigate(-1)}>
            <IconBack />
          </button>
        ) : (
          <button className="brand-logo" type="button" onClick={() => travel('/')}>
            ТАЙНО<span className="dot">.</span>
          </button>
        )}
        {nested && topTitle ? <div className="top-title">{topTitle}</div> : <span style={{ flex: 1 }} />}
        <button
          className="avatar-btn"
          type="button"
          aria-label="профиль"
          onClick={() => travel(user ? '/cabinet' : '/find')}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" />
          ) : user ? (
            <span className="avatar-letter">{avatarLetter}</span>
          ) : (
            <IconProfile active />
          )}
        </button>
      </header>

      <nav className="tabbar-redesign" aria-label="основная навигация">
        <button
          type="button"
          className={homeOn ? 'tab-r on' : 'tab-r'}
          aria-current={homeOn ? 'page' : undefined}
          onClick={() => travel('/')}
        >
          <IconHome active={homeOn} />
          <span>Главная</span>
        </button>
        <button
          type="button"
          className={createOn ? 'tab-r create on' : 'tab-r create'}
          aria-current={createOn ? 'page' : undefined}
          onClick={() => travel('/rooms/new')}
        >
          <span className="create-fab" aria-hidden="true">
            <IconPlus active />
          </span>
          <span>Создать</span>
        </button>
        <button
          type="button"
          className={findOn ? 'tab-r on' : 'tab-r'}
          aria-current={findOn ? 'page' : undefined}
          onClick={() => travel('/find')}
        >
          <IconSearch active={findOn} />
          <span>Найти</span>
        </button>
      </nav>
    </>
  )
}

export { GiftMini }

export function ThemePicker({ value, onChange }) {
  return (
    <div className="theme-grid" role="listbox" aria-label="тема комнаты">
      {Object.values(THEMES).map((theme) => (
        <button
          key={theme.id}
          type="button"
          role="option"
          aria-selected={value === theme.id}
          className={value === theme.id ? 'theme-pick on' : 'theme-pick'}
          style={{ background: theme.band, color: theme.ink }}
          onClick={() => onChange(theme.id)}
        >
          <span className="check" aria-hidden="true">
            ✓
          </span>
          <Weather type={theme.particle} color={theme.ink} count={6} />
          <strong>{theme.label}</strong>
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

export function Collection({ wl, kicker, side, particle = 'snow', onClaim, onUnclaim, claimBusyId }) {
  return (
    <article className="field" style={{ background: wl.base || '#5c2d55', color: wl.ink || '#f8f0f4' }}>
      <Weather type={particle} color={wl.ink || '#f8f0f4'} />
      <div className="blob blob-a" style={{ background: wl.soft || wl.base }} />
      <div className="field-top">
        <p className="crumb">
          <SnowMark /> {kicker}
        </p>
        <div className="field-head">
          <h1>{wl.name || 'Список'}</h1>
          {wl.colorCode ? (
            <p className="color-chip field-color" style={{ background: wl.base, color: wl.ink }}>
              цвет · {wl.name}
            </p>
          ) : null}
          <div className="field-side">
            <div className="label">
              <Squiggle />
              <span>желания</span>
            </div>
            {side}
          </div>
        </div>
      </div>
      {wl.gifts?.length ? (
        <ol className="gift-grid">
          {wl.gifts.map((gift) => {
            const claimedOther = Boolean(gift.claimedByOther)
            const claimedMe = Boolean(gift.claimedByMe)
            const claimable = Boolean(gift.claimable && onClaim)
            return (
              <li
                className={
                  claimedOther ? 'gift claimed-other' : claimedMe ? 'gift claimed-me' : 'gift'
                }
                key={gift.id}
              >
                <div className="frame">
                  <Photo src={gift.photo} alt={gift.title} />
                </div>
                <h3>{gift.title}</h3>
                {claimedOther && <p className="claim-badge">уже отмечено другим дарителем</p>}
                {claimedMe && <p className="claim-badge me">твоя отметка: подарю</p>}
                <div className="gift-actions">
                  {gift.url ? (
                    <a className="btn-chip" href={gift.url} target="_blank" rel="noreferrer">
                      К покупке
                    </a>
                  ) : null}
                  {claimable && !claimedOther && (
                    <button
                      className={claimedMe ? 'btn-chip ghost' : 'btn-chip solid'}
                      type="button"
                      disabled={claimBusyId === gift.id}
                      onClick={() => (claimedMe ? onUnclaim?.(gift.id) : onClaim?.(gift.id))}
                    >
                      {claimBusyId === gift.id
                        ? '…'
                        : claimedMe
                          ? 'Снять отметку'
                          : 'Подарю'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
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
