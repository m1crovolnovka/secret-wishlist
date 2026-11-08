import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Collection,
  Photo,
  Squiggle,
  Stepper,
  ThemePicker,
  Timer,
  Weather,
  useTitle,
} from './components'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  MIN_PEOPLE,
  PRESENCE,
  SAMPLES,
  colorById,
  currencyOf,
  formatWhen,
  fromInput,
  isDrawnRoom,
  money,
  peopleCount,
  readBudget,
  roomMark,
  themeOf,
  toInput,
} from './data'
import { useGo, useStore } from './store'

function RuDateTimeInput({ value, onChange }) {
  const ts = value ? fromInput(value) || (typeof value === 'number' ? value : null) : null
  const local = typeof value === 'string' ? value : value ? toInput(value) : ''
  return (
    <div className="ru-dt">
      <span className="ru-dt-value">{ts ? formatWhen(ts) : 'выбери дату и время'}</span>
      <input type="datetime-local" lang="ru" value={local} onChange={onChange} />
    </div>
  )
}

function colorLabel(themeId, colorCode) {
  return colorById(themeId, colorCode)?.name || colorCode || '—'
}

function normalizeUrl(raw) {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  }).then(async (dataUrl) => {
    const img = await new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = dataUrl
    })
    if (!img) return dataUrl
    const max = 800
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  })
}

export function Home() {
  const { data, room, theme, now, isRevealed, isAdmin, isGlobalAdmin, assignment, drawNow, undraw } = useStore()
  const go = useGo()
  useTitle(isRevealed ? 'тебе выпало' : room?.title || 'Тайно')

  if (!room) {
    return (
      <section className="hero">
        <div className="hero-copy">
          <p className="crumb">Тайно</p>
          <h1>Нет активной комнаты</h1>
          <p className="note">Создай комнату или войди по коду — и раздача пойдёт сама.</p>
          <div className="row-actions">
            <button className="fill" type="button" onClick={() => go('/rooms/new')}>
              создать комнату
            </button>
            <button className="text-btn" type="button" onClick={() => go('/enter')}>
              есть код
            </button>
          </div>
        </div>
      </section>
    )
  }

  const budget = money(room.budget, room.currency)
  const drawn = isDrawnRoom(room, now)
  const hosting = isGlobalAdmin && room.presence === 'out'

  if (isRevealed && assignment) {
    return (
      <Collection
        wl={assignment}
        particle={theme.particle}
        kicker={`${theme.label} · тебе выпал этот список`}
        side={
          <>
            <p className="note aside">Собери это тихо. Кто загадал — не сказано.</p>
            {budget && (
              <p className="budget">
                <span>сумма подарка</span>
                <b>{budget}</b>
              </p>
            )}
            <Timer to={room.giftBy} now={now} />
            <p className="timer-date">подарить до {formatWhen(room.giftBy)}</p>
          </>
        }
      />
    )
  }

  const count = room.memberCount || room.people?.length || 0

  return (
    <>
      <section className="hero">
        <Weather type={theme.particle} color={theme.particle === 'snow' ? '#6d8ca4' : theme.ink} count={22} />
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="hero-copy">
          <p className="crumb">
            {theme.label} · {peopleCount(count)}
          </p>
          <h1>{room.title}</h1>
          {budget && (
            <p className="budget">
              <span>сумма подарка</span>
              <b>{budget}</b>
            </p>
          )}
          <Timer to={drawn ? room.giftBy : room.drawAt} now={now} />
          <p className="timer-date">
            {drawn ? `вручить до ${formatWhen(room.giftBy)}` : `раздача ${formatWhen(room.drawAt)}`}
          </p>
        </div>
        <div className="hero-side">
          <div className="label">
            <Squiggle color={theme.ink} />
            <span>как это</span>
          </div>
          <p className="note">
            В комнате {peopleCount(count)}. До срока списки закрыты. В раздачу откроется один чужой список, без имени.
            {hosting ? ' Ты ведёшь комнату и в раздаче не участвуешь.' : ''}
            {drawn && !data.user ? ' Раздача уже была — войди, чтобы увидеть свой список.' : ''}
          </p>
          <div className="row-actions">
            <button className="fill" type="button" onClick={() => go('/cabinet')}>
              мой вишлист
            </button>
            {isAdmin ? (
              drawn ? (
                <button className="text-btn" type="button" onClick={undraw}>
                  закрыть раздачу
                </button>
              ) : (
                <button className="text-btn" type="button" onClick={drawNow}>
                  разыграть сейчас
                </button>
              )
            ) : null}
          </div>
          {isAdmin ? (
            <div className="row-actions">
              <button className="text-btn" type="button" onClick={() => go('/admin')}>
                настройки комнаты
              </button>
              <button className="text-btn" type="button" onClick={() => go('/colors')}>
                формы участников
              </button>
            </div>
          ) : isGlobalAdmin ? (
            <button className="text-btn" type="button" onClick={() => go('/admin')}>
              настройки комнаты
            </button>
          ) : (
            <button className="text-btn" type="button" onClick={() => go('/rooms')}>
              другие комнаты
            </button>
          )}
        </div>
      </section>
      <section className="rules" id="rules">
        <div className="label">
          <Squiggle />
          <span>правила</span>
        </div>
        <ol>
          <li>
            <b>01</b>
            <h2>Пишешь желания</h2>
            <p>Название, ссылка и фото. Имени рядом нет, и своего цвета ты не видишь.</p>
          </li>
          <li>
            <b>02</b>
            <h2>Ждёшь общий срок</h2>
            <p>Пока таймер не дошёл, чужие списки закрыты. Новый человек не выдаёт себя цветом.</p>
          </li>
          <li>
            <b>03</b>
            <h2>Тебе выпадает один</h2>
            <p>Открывается чужой список. Кто его загадал — не сказано. Собираешь тихо.</p>
          </li>
          <li>
            <b>04</b>
            <h2>Даришь в срок</h2>
            <p>К дате вручения. Твой список так же уйдёт кому-то одному, без твоего имени.</p>
          </li>
        </ol>
      </section>
    </>
  )
}

export function Colors() {
  const { room, theme, isAdmin, participants, kickMember, changeRequests, decideChange } = useStore()
  const [pid, setPid] = useState('')
  useTitle('вишлисты')

  useEffect(() => {
    setPid('')
  }, [room?.id])

  if (!room) return null
  if (!isAdmin) return <Navigate to="/" replace />

  const person = participants.find((item) => String(item.memberId) === String(pid)) || null

  return (
    <>
      <section className="page-intro">
        <Weather type={theme.particle} color={theme.ink} />
        <div className="blob blob-a" />
        <p className="crumb">{room.title} · только админ</p>
        <h1>Участники</h1>
        <p className="note">
          {peopleCount(participants.length)}. Цвета видны только тебе. Участникам имя и цвет не показываются.
        </p>
      </section>
      <section className="sheet forms">
        <ul className="roster">
          {participants.map((item) => (
            <li key={item.memberId}>
              <button
                type="button"
                className={String(item.memberId) === String(pid) ? 'person on' : 'person'}
                onClick={() => setPid(item.memberId === pid ? '' : item.memberId)}
              >
                <span
                  className="swatch"
                  style={{ background: colorById(room.theme, item.colorCode)?.base || '#999' }}
                />
                <span>
                  <b>{item.displayName}</b>
                  <small>
                    {item.username ? `@${item.username}` : item.firstName} · {colorLabel(room.theme, item.colorCode)}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {person && (
          <div className="person-editor">
            <div className="label">
              <Squiggle />
              <span>участник · {person.displayName}</span>
            </div>
            <p className="note">
              Цвет: {colorLabel(room.theme, person.colorCode)}. Участие: {person.participates ? 'да' : 'нет'}.
            </p>
            {person.role !== 'OWNER' && !room.forceDrawn && (
              <button className="text-btn" type="button" onClick={() => kickMember(person.memberId)}>
                исключить
              </button>
            )}
          </div>
        )}
        <div className="label">
          <Squiggle />
          <span>запросы на изменение</span>
        </div>
        {changeRequests.length === 0 ? (
          <p className="note">Очередь пуста.</p>
        ) : (
          <ul className="mine">
            {changeRequests.map((req) => (
              <li key={req.id}>
                <div>
                  <h3>{req.displayName}</h3>
                  <p className="note">{req.reason}</p>
                  <p className="demo-hint">{req.requestedChanges}</p>
                  <p className="demo-hint">{req.status}</p>
                  {req.status === 'PENDING' && (
                    <div className="item-actions">
                      <button className="text-btn" type="button" onClick={() => decideChange(req.id, true)}>
                        принять
                      </button>
                      <button className="text-btn" type="button" onClick={() => decideChange(req.id, false)}>
                        отклонить
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function PersonRow({ person, themeId, active, onClick }) {
  const color = colorById(themeId, person.colorId)
  return (
    <button type="button" className={active ? 'on' : ''} onClick={onClick}>
      <i style={{ background: color.base }} aria-hidden="true" />
      <span className="who">
        <b>{person.name}</b>
        <span>
          {person.demo ? 'демо' : person.email} · {color.name}
        </span>
      </span>
      <em>{person.gifts.length}</em>
    </button>
  )
}

export function Rooms() {
  const { data, rooms, room, focusRoom, now, isGlobalAdmin } = useStore()
  const go = useGo()
  useTitle('комнаты')
  const ordered = [...rooms].sort((a, b) => {
    if (a.id === room?.id) return -1
    if (b.id === room?.id) return 1
    return Number(b.numericId || 0) - Number(a.numericId || 0)
  })

  return (
    <>
      <section className="page-intro">
        <div className="blob blob-a" />
        <p className="crumb">твои круги</p>
        <h1>Комнаты</h1>
        <p className="note">Учёба, работа, свой круг — у каждого своя комната, свой срок и своя тема.</p>
        <div className="row-actions room-new">
          <button className="fill" type="button" onClick={() => go('/rooms/new')}>
            новая комната
          </button>
          <button className="text-btn" type="button" onClick={() => go('/enter')}>
            войти по коду
          </button>
        </div>
      </section>
      <div className="room-list">
        {ordered.map((item) => {
          const theme = themeOf(item.theme)
          const drawn = isDrawnRoom(item, now)
          return (
            <article key={item.id} className="room-row" style={{ background: theme.band, color: theme.ink }}>
              <svg className="lip" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
                <path
                  fill={theme.band}
                  d="M0,70 C180,120 340,20 520,64 C740,116 900,16 1100,68 C1260,104 1360,36 1440,72 L1440,120 L0,120 Z"
                />
              </svg>
              <button className="room-hit" type="button" onClick={() => focusRoom(item.id, '/')}>
                <p className="crumb">
                  {theme.label} · {item.myRole === 'OWNER' ? roomMark(item, { name: 'qqq', email: 'qqq@qqq' }) : 'участник'}
                  {item.id === room?.id ? ' · сейчас' : ''}
                </p>
                <h2>{item.title}</h2>
                <span className="band-more">
                  {peopleCount(item.memberCount || 0)} · {drawn ? 'список выпал' : 'ждём раздачу'}
                  {item.budget ? ` · ${money(item.budget, item.currency)}` : ''}
                  {item.code ? ` · код ${item.code}` : ''}
                </span>
              </button>
              {item.canTune && (
                <button className="text-btn" type="button" onClick={() => focusRoom(item.id, '/admin')}>
                  настройки
                </button>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

export function NewRoom() {
  const { createRoom } = useStore()
  const go = useGo()
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('newyear')
  const [presence, setPresence] = useState('in')
  const [budget, setBudget] = useState('100')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [drawAt, setDrawAt] = useState(() => toInput(Date.now() + 14 * 86400000))
  const [giftBy, setGiftBy] = useState(() => toInput(Date.now() + 24 * 86400000))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const look = themeOf(theme)
  const cash = currencyOf(currency)
  useTitle('новая комната')

  async function submit(event) {
    event.preventDefault()
    if (title.trim().length < 2) {
      setErr('как назвать комнату?')
      return
    }
    const draw = fromInput(drawAt)
    const gift = fromInput(giftBy)
    if (!draw || !gift) {
      setErr('нужны обе даты')
      return
    }
    if (gift <= draw) {
      setErr('подарок позже раздачи')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await createRoom({
        title: title.trim(),
        theme,
        presence,
        budget: readBudget(budget),
        currency,
        drawAt: draw,
        giftBy: gift,
      })
    } catch (e) {
      setErr(e.message || 'не удалось создать')
      setBusy(false)
    }
  }

  return (
    <section className="sheet">
      <Weather type={look.particle} color={look.ink} />
      <div className="blob blob-a" />
      <div className="enter-copy">
        <p className="crumb">ты создаёшь комнату</p>
        <h1>Новая</h1>
        <p className="note">Срок, сумма и твоя роль в этой комнате. Минимум участников для раздачи — {MIN_PEOPLE}.</p>
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label className="line">
          <span>название</span>
          <input value={title} maxLength={42} onChange={(event) => setTitle(event.target.value)} placeholder="Офис, поток, кухня" />
        </label>
        <div className="label">
          <Squiggle />
          <span>твоя роль</span>
        </div>
        <div className="presence">
          {PRESENCE.map((item) => (
            <button
              key={item.id}
              type="button"
              className={presence === item.id ? 'on' : ''}
              onClick={() => setPresence(item.id)}
            >
              <strong>{item.title}</strong>
              <span>{item.note}</span>
            </button>
          ))}
        </div>
        <div className="label space">
          <Squiggle />
          <span>тема</span>
        </div>
        <ThemePicker value={theme} onChange={setTheme} />
        <p className="demo-hint">
          {presence === 'out' ? 'Ты только ведёшь комнату и не участвуешь в раздаче.' : 'Ты участвуешь в раздаче.'}
        </p>
        <div className="label space">
          <Squiggle />
          <span>сумма подарка</span>
        </div>
        <div className="currency">
          {CURRENCIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={currency === item.id ? 'on' : ''}
              onClick={() => setCurrency(item.id)}
            >
              <b>{item.short}</b>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <label className="line">
          <span>число · {cash.short}</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </label>
        <p className="demo-hint">{money(budget, currency) || 'сумма не задана'}</p>
        <label className="line">
          <span>раздача</span>
          <RuDateTimeInput value={drawAt} onChange={(event) => setDrawAt(event.target.value)} />
        </label>
        <label className="line">
          <span>подарить до</span>
          <RuDateTimeInput value={giftBy} onChange={(event) => setGiftBy(event.target.value)} />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="fill" type="submit" disabled={busy}>
          {busy ? 'создаю…' : 'создать комнату'}
        </button>
        <button className="text-btn" type="button" onClick={() => go('/rooms')}>
          к комнатам
        </button>
      </form>
    </section>
  )
}

export function Admin() {
  const { room, theme, isAdmin, canTune, isRevealed, updateRoom, drawNow, undraw, now } = useStore()
  const go = useGo()
  const [title, setTitle] = useState(room?.title || '')
  useTitle('настройки')

  useEffect(() => {
    setTitle(room?.title || '')
  }, [room?.id])

  if (!room) return null
  if (!canTune) {
    return (
      <section className="sheet missing">
        <p className="crumb">{room.title}</p>
        <h1>Не твоя</h1>
        <p className="note">Настройки только у владельца комнаты.</p>
        <button className="text-btn" type="button" onClick={() => go('/')}>
          на главную
        </button>
      </section>
    )
  }

  const count = room.memberCount || 0
  const guest = room.presence === 'guest'

  return (
    <section className="sheet admin">
      <Weather type={theme.particle} color={theme.ink} />
      <div className="blob blob-a" />
      <div className="admin-intro">
        <p className="crumb">админ · {room.title}</p>
        <h1>Настройки</h1>
        <p className="note">
          {guest
            ? 'Сейчас ты как участник: вишлисты закрыты. Смени роль ниже, чтобы снова видеть чужие формы.'
            : 'Срок и сумма видны всем. Чьи формы — во вкладке вишлистов, пока ты не в режиме «как участник».'}
        </p>
      </div>
      <div className="editor">
        <div>
          <div className="label">
            <Squiggle />
            <span>твоя роль</span>
          </div>
          <div className="presence">
            {PRESENCE.map((item) => (
              <button
                key={item.id}
                type="button"
                className={room.presence === item.id ? 'on' : ''}
                onClick={() => updateRoom({ presence: item.id })}
              >
                <strong>{item.title}</strong>
                <span>{item.note}</span>
              </button>
            ))}
          </div>
          <p className="demo-hint">
            {guest
              ? 'Вишлисты скрыты. Раздача и свой список работают как у участника.'
              : room.presence === 'out'
                ? 'Ты вне раздачи и не получаешь чужой список.'
                : 'Ты в раздаче и видишь чужие формы.'}
          </p>
          <div className="label space">
            <Squiggle />
            <span>тема</span>
          </div>
          <ThemePicker value={room.theme} onChange={(next) => updateRoom({ theme: next })} />
          <div className="label space">
            <Squiggle />
            <span>участники</span>
          </div>
          <p className="note">{peopleCount(count)} · код комнаты {room.code}</p>
          <p className="demo-hint">
            {isRevealed ? 'После раздачи состав зафиксирован.' : `Для авто-раздачи нужно минимум ${MIN_PEOPLE}.`}
          </p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <label className="line">
            <span>название</span>
            <input
              value={title}
              maxLength={42}
              onChange={(event) => {
                setTitle(event.target.value)
                if (event.target.value.trim().length >= 2) updateRoom({ title: event.target.value.trim() })
              }}
            />
          </label>
          <label className="line">
            <span>раздача</span>
            <RuDateTimeInput
              value={toInput(room.drawAt)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ drawAt: ts })
              }}
            />
          </label>
          <p className="demo-hint">Если сдвинуть вперёд, выпавший список снова закроется.</p>
          <label className="line">
            <span>подарить до</span>
            <RuDateTimeInput
              value={toInput(room.giftBy)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ giftBy: ts })
              }}
            />
          </label>
          <div className="label space">
            <Squiggle />
            <span>сумма подарка</span>
          </div>
          <div className="currency">
            {CURRENCIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={(room.currency || DEFAULT_CURRENCY) === item.id ? 'on' : ''}
                onClick={() => updateRoom({ currency: item.id })}
              >
                <b>{item.short}</b>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <label className="line">
            <span>число · {currencyOf(room.currency).short}</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={room.budget || ''}
              onChange={(event) => updateRoom({ budget: readBudget(event.target.value) })}
            />
          </label>
          <p className="demo-hint">{money(room.budget, room.currency) || 'сумма не задана'}</p>
          {isAdmin ? (
            <div className="row-actions">
              <button className="text-btn" type="button" onClick={() => go('/colors')}>
                формы участников
              </button>
              {isRevealed ? (
                <button className="text-btn" type="button" onClick={undraw}>
                  закрыть раздачу
                </button>
              ) : (
                <button className="fill" type="button" onClick={drawNow}>
                  разыграть сейчас
                </button>
              )}
            </div>
          ) : (
            <p className="demo-hint">Раздача и формы снова откроются, если выбрать «Админ участвует» или «Админ не участвует».</p>
          )}
        </form>
      </div>
    </section>
  )
}

export function Enter() {
  const { joinByCode } = useStore()
  const go = useGo()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle('войти в комнату')

  async function submit(event) {
    event.preventDefault()
    if (code.trim().length < 4) {
      setErr('введи код комнаты')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await joinByCode(code)
      go('/')
    } catch (e) {
      setErr(e.message || 'не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="sheet enter">
      <div className="blob blob-a" />
      <div className="enter-copy">
        <p className="crumb">приглашение</p>
        <h1>Код комнаты</h1>
        <p className="note">Вход через Telegram Mini App. Код — из ссылки бота или от админа.</p>
      </div>
      <form className="enter-form" onSubmit={submit}>
        <label className="line">
          <span>код</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABCD2345"
            autoComplete="off"
          />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="fill" type="submit" disabled={busy}>
          {busy ? 'вхожу…' : 'войти'}
        </button>
      </form>
    </section>
  )
}

export function Cabinet() {
  const {
    data,
    room,
    rooms,
    seat,
    isGlobalAdmin,
    focusRoom,
    setNote,
    addGift,
    removeGift,
    logout,
    saveError,
    requestChange,
    changeRequests,
  } = useStore()
  const go = useGo()
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [changeWhat, setChangeWhat] = useState('')
  useTitle('кабинет')

  if (!data.user) return <Navigate to="/enter" replace />
  if (!room) {
    return (
      <section className="sheet missing">
        <h1>Кабинет</h1>
        <p className="note">Сначала создай комнату или войди по коду — тогда появится вишлист.</p>
        <div className="row-actions">
          <button className="fill" type="button" onClick={() => go('/rooms/new')}>
            создать комнату
          </button>
          <button className="text-btn" type="button" onClick={() => go('/enter')}>
            есть код
          </button>
        </div>
      </section>
    )
  }

  const hosting = isGlobalAdmin && room.presence === 'out'
  const gifts = seat?.gifts || []
  const displayName = data.user.firstName || data.user.username || 'ты'

  async function onFile(event) {
    const next = event.target.files?.[0]
    if (!next) return
    setFile(next)
    setFileName(next.name)
  }

  async function submit(event) {
    event.preventDefault()
    if (!title.trim()) {
      setErr('нужно название')
      return
    }
    if (gifts.length >= 12) {
      setErr('хватит двенадцати желаний')
      return
    }
    try {
      await addGift({ title: title.trim(), url: normalizeUrl(url), file })
      setTitle('')
      setUrl('')
      setFile(null)
      setFileName('')
      setErr('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setErr(e.message || 'не удалось добавить')
    }
  }

  async function submitChange(event) {
    event.preventDefault()
    if (!changeReason.trim() || !changeWhat.trim()) {
      setErr('нужны причина и что менять')
      return
    }
    try {
      await requestChange(changeReason.trim(), changeWhat.trim())
      setChangeReason('')
      setChangeWhat('')
    } catch (e) {
      setErr(e.message || 'не удалось отправить запрос')
    }
  }

  return (
    <section className="sheet cabinet">
      <div className="cab-head">
        <div>
          <p className="crumb">личный кабинет · {room.title}</p>
          <h1>{displayName}</h1>
          <p className="note">{data.user.username ? `@${data.user.username}` : 'без username'}</p>
          <div className="cab-actions">
            <button className="text-btn" type="button" onClick={logout}>
              выйти
            </button>
            <button className="text-btn" type="button" onClick={() => go('/rooms')}>
              все комнаты
            </button>
            <button className="text-btn" type="button" onClick={() => go('/enter')}>
              код комнаты
            </button>
          </div>
        </div>
      </div>

      <div className="label">
        <Squiggle />
        <span>комната для списка</span>
      </div>
      <div className="room-pills">
        {rooms.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === room.id ? 'on' : ''}
            onClick={() => focusRoom(item.id, '/cabinet')}
          >
            {item.title}
          </button>
        ))}
      </div>

      {hosting ? (
        <p className="note">В этой комнате ты не участвуешь. Чужие формы открываются во вкладке вишлистов.</p>
      ) : (
      <>
      <div className="editor">
        <div>
          <div className="label">
            <Squiggle />
            <span>заметка</span>
          </div>
          <label className="line">
            <span>для того, кому ты выпадешь</span>
            <textarea rows={3} maxLength={160} value={seat?.note || ''} onChange={(event) => setNote(event.target.value)} />
          </label>
          <p className="demo-hint">На общем поле её не видно. Она откроется вместе со списком после раздачи.</p>
        </div>
        <form onSubmit={submit}>
          <div className="label">
            <Squiggle />
            <span>новое желание</span>
          </div>
          <label className="line">
            <span>название</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="line">
            <span>ссылка на покупку</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" inputMode="url" />
          </label>
          <div className="photo-row">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <button className="text-btn" type="button" onClick={() => fileRef.current?.click()}>
              {fileName || 'загрузить фото'}
            </button>
            {file && <span className="demo-hint">фото выбрано</span>}
          </div>
          {err && <p className="err">{err}</p>}
          {saveError && <p className="err">Ошибка сохранения. Попробуй ещё раз.</p>}
          <button className="fill" type="submit">
            добавить в список
          </button>
        </form>
      </div>

      <div className="label mine-label">
        <Squiggle />
        <span>твой список · {room.title}</span>
      </div>
      {gifts.length === 0 ? (
        <p className="note">Пока пусто. Добавь желание — его увидит только тот, кому ты выпадешь.</p>
      ) : (
        <ul className="mine">
          {gifts.map((gift) => (
            <li key={gift.id}>
              <div className="frame">
                <Photo src={gift.photo} alt={gift.title} />
              </div>
              <div>
                <h3>{gift.title}</h3>
                <div className="item-actions">
                  {gift.url ? (
                    <a className="buy" href={gift.url} target="_blank" rel="noreferrer">
                      к покупке
                    </a>
                  ) : (
                    <span className="demo-hint">без ссылки</span>
                  )}
                  <button className="text-btn" type="button" onClick={() => removeGift(gift.id)}>
                    убрать
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!room.canEdit && (
        <form className="stack-form" onSubmit={submitChange}>
          <div className="label">
            <Squiggle />
            <span>запрос на изменение</span>
          </div>
          <label className="line">
            <span>причина</span>
            <input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
          </label>
          <label className="line">
            <span>что хочешь поменять</span>
            <textarea rows={3} value={changeWhat} onChange={(e) => setChangeWhat(e.target.value)} />
          </label>
          <button className="fill" type="submit">
            отправить админу
          </button>
          {changeRequests?.length > 0 && (
            <p className="demo-hint">Последний статус: {changeRequests[0].status}</p>
          )}
        </form>
      )}
      </>
      )}
    </section>
  )
}
