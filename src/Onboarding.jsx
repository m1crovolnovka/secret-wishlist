import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'taino-onboarding-v2'

const STEPS = [
  {
    title: 'Что такое Тайно',
    text:
      'Это мини-приложение для тайной раздачи подарков. Друзья собираются в комнате, каждый пишет, что хочет получить. После жеребьёвки тебе выпадает чужой вишлист — без имени, только цвет. Ты даришь — и никто ничего не знает до окончания события.',
    art: 'idea',
  },
  {
    title: 'Комнаты и роли',
    text:
      'Комната — одна раздача: свои даты, бюджет и список участников. В «Мои комнаты» вкладка «Участник» — куда ты вошёл; «Админ» — комнаты, которые ты создал и ведёшь. Админ может сам участвовать, только организовывать или участвовать «вслепую» без доступа к чужим спискам.',
    art: 'rooms',
  },
  {
    title: 'Создать и найти',
    text:
      'Плюс внизу — создать новую комнату. Лупа — найти публичную или войти по коду из приглашения. При входе можно сразу указать, как тебя показывать участникам.',
    art: 'nav',
  },
  {
    title: 'Вишлисты',
    text:
      'В профиле собирай личные списки желаний (как блокнот): название, позиции со ссылкой, фото или артикулом. Список можно прикрепить к комнате или поделиться ссылкой. Один и тот же вишлист в нескольких комнатах: дарители могут отмечать «подарю», а владелец списка этих отметок не видит.',
    art: 'wish',
  },
  {
    title: 'Жеребьёвка и тайна',
    text:
      'Пока регистрация открыта — заполняй вишлист. После раздачи открывается один чужой список. Режим «Тайно» — только цвет и желания. «Нетайно» — ещё заметка, пункт WB и ссылка для связи, но имя по-прежнему не показывается. Подари до указанной даты — и никто ничего не знает до окончания события.',
    art: 'draw',
  },
]

function StepArt({ kind }) {
  if (kind === 'idea') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 72" aria-hidden="true">
        <circle cx="80" cy="34" r="22" fill="currentColor" opacity="0.12" />
        <circle cx="54" cy="38" r="14" fill="currentColor" opacity="0.2" />
        <circle cx="106" cy="38" r="14" fill="currentColor" opacity="0.28" />
        <path d="M68 38h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      </svg>
    )
  }
  if (kind === 'rooms') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 72" aria-hidden="true">
        <rect x="14" y="14" width="58" height="44" rx="8" fill="currentColor" opacity="0.16" />
        <rect x="88" y="14" width="58" height="44" rx="8" fill="currentColor" opacity="0.26" />
        <circle cx="43" cy="32" r="7" fill="currentColor" opacity="0.45" />
        <circle cx="117" cy="32" r="7" fill="currentColor" opacity="0.55" />
      </svg>
    )
  }
  if (kind === 'nav') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 72" aria-hidden="true">
        <rect x="22" y="46" width="116" height="16" rx="8" fill="currentColor" opacity="0.14" />
        <path d="M58 50v8M54 54h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <circle cx="104" cy="54" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
        <path d="M107 57l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    )
  }
  if (kind === 'wish') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 72" aria-hidden="true">
        <rect x="40" y="8" width="80" height="56" rx="6" fill="currentColor" opacity="0.12" />
        <rect x="52" y="20" width="56" height="7" rx="2" fill="currentColor" opacity="0.35" />
        <rect x="52" y="34" width="46" height="5" rx="2" fill="currentColor" opacity="0.22" />
        <rect x="52" y="44" width="40" height="5" rx="2" fill="currentColor" opacity="0.22" />
      </svg>
    )
  }
  return (
    <svg className="onboard-art" viewBox="0 0 160 72" aria-hidden="true">
      <circle cx="52" cy="36" r="18" fill="currentColor" opacity="0.16" />
      <circle cx="108" cy="36" r="18" fill="currentColor" opacity="0.28" />
      <path d="M70 36h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
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

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(false)
  const touchRef = useRef({ x: 0, y: 0, active: false })
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
    <div className="onboard-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
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
        <StepArt kind={current.art} />
        <p className="crumb">
          шаг {step + 1} из {STEPS.length}
        </p>
        <h2 id="onboard-title">{current.title}</h2>
        <p className="note">{current.text}</p>
        <p className="onboard-swipe-hint">можно свайпнуть влево или вправо</p>
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
          {last ? (
            <button className="fill" type="button" onClick={finish}>
              Понятно
            </button>
          ) : (
            <button className="fill" type="button" onClick={goNext}>
              Дальше
            </button>
          )}
          <button className="text-btn" type="button" onClick={finish}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
