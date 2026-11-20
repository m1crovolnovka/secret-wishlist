import { useEffect, useState } from 'react'

const STORAGE_KEY = 'taino-onboarding-v1'

const STEPS = [
  {
    title: 'Мои комнаты',
    text: 'Здесь комнаты, куда ты уже вошёл. Вкладки «Участник» и «Админ» разделяют раздачи и те, что ты ведёшь.',
    art: 'rooms',
  },
  {
    title: 'Создать и найти',
    text: 'Плюс внизу — новая комната. Лупа — поиск публичных и вход по коду.',
    art: 'nav',
  },
  {
    title: 'Вишлист',
    text: 'В профиле собирай списки желаний. Их можно прикрепить к комнате и открыть как «блокнот» с позициями.',
    art: 'wish',
  },
  {
    title: 'Раздача',
    text: 'После жеребьёвки тебе выпадает чужой список без имени — только цвет. В режиме «Нетайно» даритель видит заметку и контакты.',
    art: 'draw',
  },
]

function StepArt({ kind }) {
  if (kind === 'rooms') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 88" aria-hidden="true">
        <rect x="12" y="18" width="60" height="52" rx="8" fill="currentColor" opacity="0.18" />
        <rect x="88" y="18" width="60" height="52" rx="8" fill="currentColor" opacity="0.28" />
        <circle cx="42" cy="40" r="8" fill="currentColor" opacity="0.45" />
        <circle cx="118" cy="40" r="8" fill="currentColor" opacity="0.55" />
      </svg>
    )
  }
  if (kind === 'nav') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 88" aria-hidden="true">
        <rect x="20" y="58" width="120" height="18" rx="9" fill="currentColor" opacity="0.14" />
        <circle cx="48" cy="67" r="5" fill="currentColor" opacity="0.5" />
        <path d="M80 62v10M75 67h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <circle cx="112" cy="67" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
        <path d="M115.5 70.5l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    )
  }
  if (kind === 'wish') {
    return (
      <svg className="onboard-art" viewBox="0 0 160 88" aria-hidden="true">
        <rect x="36" y="10" width="88" height="68" rx="6" fill="currentColor" opacity="0.12" />
        <rect x="48" y="24" width="64" height="8" rx="3" fill="currentColor" opacity="0.35" />
        <rect x="48" y="40" width="52" height="6" rx="2" fill="currentColor" opacity="0.22" />
        <rect x="48" y="52" width="44" height="6" rx="2" fill="currentColor" opacity="0.22" />
      </svg>
    )
  }
  return (
    <svg className="onboard-art" viewBox="0 0 160 88" aria-hidden="true">
      <circle cx="48" cy="44" r="22" fill="currentColor" opacity="0.16" />
      <circle cx="112" cy="44" r="22" fill="currentColor" opacity="0.28" />
      <path d="M70 44h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
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
  const current = STEPS[step]
  const last = step === STEPS.length - 1

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

  return (
    <div className="onboard-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-card">
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
          {last ? (
            <button className="fill" type="button" onClick={finish}>
              Понятно
            </button>
          ) : (
            <button className="fill" type="button" onClick={() => setStep((s) => s + 1)}>
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
