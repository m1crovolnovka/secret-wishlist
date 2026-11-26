import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'taino-onboarding-v3'

const STEPS = [
  {
    title: 'Обмен подарками без спойлеров',
    text:
      'Собери друзей в комнате — создай свою или войди по коду. Плюс внизу создаёт комнату, лупа находит. Имя получателя останется секретом.',
    art: 'cards',
  },
  {
    title: 'Составь список желаний',
    text: 'Добавь подарки со ссылками и фото. Один вишлист можно использовать в разных комнатах.',
    art: 'wish',
  },
  {
    title: 'Получи тайную цветовую карточку',
    text: 'После жеребьёвки откроется цвет получателя и его вишлист — без имени. У каждого секрета свой цвет.',
    art: 'color',
  },
]

function StepArt({ kind }) {
  if (kind === 'cards') {
    return (
      <svg className="onboard-art" viewBox="0 0 180 80" aria-hidden="true">
        <rect x="28" y="18" width="40" height="52" rx="8" fill="#FBCDDD" transform="rotate(-8 48 44)" />
        <rect x="70" y="12" width="40" height="52" rx="8" fill="#E5D7F6" />
        <rect x="112" y="18" width="40" height="52" rx="8" fill="#D3E3EE" transform="rotate(8 132 44)" />
        <rect x="60" y="36" width="60" height="10" rx="3" fill="#DC6487" opacity="0.85" />
      </svg>
    )
  }
  if (kind === 'room') {
    return (
      <svg className="onboard-art" viewBox="0 0 180 80" aria-hidden="true">
        <rect x="24" y="20" width="60" height="44" rx="12" fill="#FBCDDD" />
        <rect x="96" y="20" width="60" height="44" rx="12" fill="#E5D7F6" />
        <circle cx="54" cy="42" r="8" fill="#32131D" opacity="0.2" />
        <circle cx="126" cy="42" r="8" fill="#32131D" opacity="0.2" />
      </svg>
    )
  }
  if (kind === 'wish') {
    return (
      <svg className="onboard-art" viewBox="0 0 180 80" aria-hidden="true">
        <rect x="50" y="10" width="80" height="58" rx="10" fill="#FFE8AE" />
        <rect x="64" y="24" width="52" height="6" rx="2" fill="#32131D" opacity="0.35" />
        <rect x="64" y="36" width="40" height="5" rx="2" fill="#32131D" opacity="0.22" />
        <rect x="64" y="46" width="46" height="5" rx="2" fill="#32131D" opacity="0.22" />
      </svg>
    )
  }
  return (
    <svg className="onboard-art" viewBox="0 0 180 80" aria-hidden="true">
      <rect x="62" y="10" width="56" height="60" rx="12" fill="#E5D7F6" />
      <rect x="70" y="36" width="40" height="10" rx="3" fill="#DC6487" />
      <circle cx="90" cy="28" r="8" fill="#FBCDDD" />
    </svg>
  )
}

export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

export function openOnboardingAgain() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(false)
  const touchRef = useRef({ x: 0, y: 0, active: false, pointer: false })
  const current = STEPS[step]
  const last = step === STEPS.length - 1
  const first = step === 0

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function finish() {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    onDone?.()
  }

  function goNext() {
    if (last) finish()
    else setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  function goPrev() {
    setStep((s) => Math.max(0, s - 1))
  }

  function swipeFrom(dx, dy) {
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) goNext()
    else if (!first) goPrev()
  }

  function onTouchStart(event) {
    const t = event.changedTouches?.[0]
    if (!t) return
    touchRef.current = { x: t.clientX, y: t.clientY, active: true, pointer: false }
  }

  function onTouchEnd(event) {
    if (!touchRef.current.active || touchRef.current.pointer) return
    const t = event.changedTouches?.[0]
    touchRef.current.active = false
    if (!t) return
    swipeFrom(t.clientX - touchRef.current.x, t.clientY - touchRef.current.y)
  }

  function onPointerDown(event) {
    if (event.pointerType === 'touch') return
    if (event.button != null && event.button !== 0) return
    touchRef.current = { x: event.clientX, y: event.clientY, active: true, pointer: true }
  }

  function onPointerUp(event) {
    if (!touchRef.current.active || !touchRef.current.pointer) return
    touchRef.current.active = false
    swipeFrom(event.clientX - touchRef.current.x, event.clientY - touchRef.current.y)
  }

  return (
    <div className="onboard-backdrop onboard-v3" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div
        className="onboard-card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          touchRef.current.active = false
        }}
      >
        <button className="onboard-close" type="button" aria-label="закрыть" onClick={finish}>
          ×
        </button>
        <StepArt kind={current.art} />
        <p className="crumb">
          шаг {step + 1} из {STEPS.length}
        </p>
        <h2 id="onboard-title">{current.title}</h2>
        <p className="note">{current.text}</p>
        <div className="onboard-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <label className="onboard-check">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          <span>больше не показывать</span>
        </label>
        <div className="row-actions onboard-actions">
          {!first && (
            <button className="text-btn" type="button" onClick={goPrev}>
              Назад
            </button>
          )}
          <button className="btn-primary" type="button" onClick={goNext} style={{ width: 'auto', minWidth: 120 }}>
            {last ? 'Понятно' : 'Дальше'}
          </button>
        </div>
      </div>
    </div>
  )
}
