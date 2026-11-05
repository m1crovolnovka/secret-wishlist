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

  if (!room) return null

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

  const count = room.people.length

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
          {isAdmin ? (
            <>
              {drawn ? (
                <button className="text-btn" type="button" onClick={undraw}>
                  закрыть раздачу
                </button>
              ) : (
                <button className="text-btn" type="button" onClick={drawNow}>
                  разыграть сейчас
                </button>
              )}
              <p className="demo-hint">Кнопка админа. Роль, срок и сумма — в настройках.</p>
              <button className="text-btn" type="button" onClick={() => go('/admin')}>
                настройки комнаты
              </button>
            </>
          ) : isGlobalAdmin ? (
            <>
              <p className="demo-hint">Сейчас ты как участник: вишлисты закрыты. Роль можно сменить в настройках.</p>
              <button className="text-btn" type="button" onClick={() => go('/admin')}>
                настройки комнаты
              </button>
            </>
          ) : (
            <>
              <p className="demo-hint">Раздачу откроет админ комнаты.</p>
              <button className="text-btn" type="button" onClick={() => go('/rooms')}>
                другие комнаты
              </button>
            </>
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
      <footer className="foot">демо · комнаты и желания живут в этом браузере</footer>
    </>
  )
}

export function Colors() {
  const { room, theme, isAdmin, patchPerson, addPersonGift, removePersonGift } = useStore()
  const [pid, setPid] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [photo, setPhoto] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  useTitle('вишлисты')

  useEffect(() => {
    setPid('')
    setTitle('')
    setUrl('')
    setPhoto('')
    setErr('')
  }, [room?.id])

  if (!room) return null
  if (!isAdmin) return <Navigate to="/" replace />

  const person = room.people.find((item) => item.pid === pid) || null

  async function onFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(await fileToDataUrl(file))
  }

  function addWish(event) {
    event.preventDefault()
    if (!person) return
    if (!title.trim()) {
      setErr('нужно название')
      return
    }
    if (person.gifts.length >= 12) {
      setErr('в демо хватит двенадцати желаний')
      return
    }
    addPersonGift(person.pid, { title: title.trim(), url: normalizeUrl(url), photo })
    setTitle('')
    setUrl('')
    setPhoto('')
    setErr('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <section className="page-intro">
        <Weather type={theme.particle} color={theme.ink} />
        <div className="blob blob-a" />
        <p className="crumb">{room.title} · только админ</p>
        <h1>Вишлисты</h1>
        <p className="note">
          {peopleCount(room.people.length)}. Здесь видно, чья форма. Её можно поправить. Участникам имя не показывается.
        </p>
      </section>
      <section className="sheet forms">
        <ul className="roster">
          {room.people.map((item) => (
            <li key={item.pid}>
              <PersonRow
                person={item}
                themeId={room.theme}
                active={item.pid === pid}
                onClick={() => setPid(item.pid === pid ? '' : item.pid)}
              />
            </li>
          ))}
        </ul>
        {person && (
          <div className="person-editor">
            <div className="label">
              <Squiggle />
              <span>форма · {person.name}</span>
            </div>
            <label className="line">
              <span>заметка для того, кому выпадет</span>
              <textarea
                rows={3}
                maxLength={160}
                value={person.note}
                onChange={(event) => patchPerson(person.pid, { note: event.target.value })}
              />
            </label>
            {person.gifts.length === 0 ? (
              <p className="note">Пока пусто.</p>
            ) : (
              <ul className="mine">
                {person.gifts.map((gift) => (
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
                        <button className="text-btn" type="button" onClick={() => removePersonGift(person.pid, gift.id)}>
                          убрать
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addWish}>
              <label className="line">
                <span>новое желание</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="line">
                <span>ссылка</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" inputMode="url" />
              </label>
              <div className="photo-row">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                <button className="text-btn" type="button" onClick={() => fileRef.current?.click()}>
                  {photo ? 'фото выбрано' : 'загрузить фото'}
                </button>
              </div>
              <div className="samples">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.src}
                    type="button"
                    className={photo === sample.src ? 'on' : ''}
                    onClick={() => setPhoto(sample.src)}
                  >
                    <img src={sample.src} alt={sample.title} />
                  </button>
                ))}
              </div>
              {err && <p className="err">{err}</p>}
              <button className="fill" type="submit">
                добавить в форму
              </button>
            </form>
          </div>
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
    return b.createdAt - a.createdAt
  })

  return (
    <>
      <section className="page-intro">
        <div className="blob blob-a" />
        <p className="crumb">твои круги</p>
        <h1>Комнаты</h1>
        <p className="note">Учёба, работа, свой круг — у каждого своя комната, свой срок и своя тема.</p>
        {isGlobalAdmin && (
          <button className="fill room-new" type="button" onClick={() => go('/rooms/new')}>
            новая комната
          </button>
        )}
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
                  {theme.label} · {roomMark(item, data.user)}
                  {item.id === room?.id ? ' · сейчас' : ''}
                </p>
                <h2>{item.title}</h2>
                <span className="band-more">
                  {peopleCount(item.people.length)} · {drawn ? 'список выпал' : 'ждём раздачу'}
                  {item.budget ? ` · ${money(item.budget, item.currency)}` : ''}
                </span>
              </button>
              {isGlobalAdmin && (
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
  const { createRoom, isGlobalAdmin } = useStore()
  const go = useGo()
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('newyear')
  const [count, setCount] = useState(6)
  const [presence, setPresence] = useState('in')
  const [budget, setBudget] = useState('100')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [drawAt, setDrawAt] = useState(() => toInput(Date.now() + 14 * 86400000))
  const [giftBy, setGiftBy] = useState(() => toInput(Date.now() + 24 * 86400000))
  const [err, setErr] = useState('')
  const look = themeOf(theme)
  const cash = currencyOf(currency)
  useTitle('новая комната')

  if (!isGlobalAdmin) return <Navigate to="/rooms" replace />

  function submit(event) {
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
    createRoom({
      title: title.trim(),
      theme,
      count,
      presence,
      budget: readBudget(budget),
      currency,
      drawAt: draw,
      giftBy: gift,
    })
  }

  return (
    <section className="sheet">
      <Weather type={look.particle} color={look.ink} />
      <div className="blob blob-a" />
      <div className="enter-copy">
        <p className="crumb">ты создаёшь комнату</p>
        <h1>Новая</h1>
        <p className="note">Срок, сумма и твоя роль в этой комнате. Чужие формы потом лежат во вкладке вишлистов.</p>
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
        <div className="label space">
          <Squiggle />
          <span>участники</span>
        </div>
        <Stepper value={count} min={MIN_PEOPLE} onChange={setCount} />
        <p className="demo-hint">
          {presence === 'out' ? 'Тебя в этом числе нет: только ведёшь.' : 'Ты входишь в это число. Остальные в демо уже на местах.'}
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
          <input type="datetime-local" value={drawAt} onChange={(event) => setDrawAt(event.target.value)} />
        </label>
        <label className="line">
          <span>подарить до</span>
          <input type="datetime-local" value={giftBy} onChange={(event) => setGiftBy(event.target.value)} />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="fill" type="submit">
          создать комнату
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
        <p className="note">Настройки и чужие формы только у админа. Для входа: имя qqq, почта qqq@qqq.</p>
        <button className="text-btn" type="button" onClick={() => go('/')}>
          на главную
        </button>
      </section>
    )
  }

  const count = room.people.length
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
          <Stepper
            value={count}
            min={MIN_PEOPLE}
            disabled={isRevealed || room.forceDrawn || now >= room.drawAt}
            onChange={(next) => updateRoom({ count: next })}
          />
          <p className="demo-hint">
            {isRevealed ? 'После раздачи состав зафиксирован.' : 'Потолка нет. Цвета участников на главной не показываем.'}
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
            <input
              type="datetime-local"
              value={toInput(room.drawAt)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ drawAt: ts })
              }}
            />
          </label>
          <p className="demo-hint">Сейчас в календаре: {formatWhen(room.drawAt)}. Если сдвинуть вперёд, выпавший список снова закроется.</p>
          <label className="line">
            <span>подарить до</span>
            <input
              type="datetime-local"
              value={toInput(room.giftBy)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ giftBy: ts })
              }}
            />
          </label>
          <p className="demo-hint">{formatWhen(room.giftBy)}</p>
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
            <>
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
            </>
          ) : (
            <p className="demo-hint">Раздача и формы снова откроются, если выбрать «Админ участвует» или «Админ не участвует».</p>
          )}
        </form>
      </div>
    </section>
  )
}

export function Enter() {
  const { data, enter } = useStore()
  const go = useGo()
  const [name, setName] = useState(data.user?.name || '')
  const [email, setEmail] = useState(data.user?.email || '')
  const [err, setErr] = useState('')
  useTitle('войти')

  function submit(event) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setErr('как к тебе обращаться?')
      return
    }
    if (!email.includes('@')) {
      setErr('нужна почта, хотя бы для вида')
      return
    }
    enter(name, email)
    go('/cabinet')
  }

  return (
    <section className="sheet enter">
      <div className="blob blob-a" />
      <div className="enter-copy">
        <p className="crumb">кабинет</p>
        <h1>Войти</h1>
        <p className="note">Имя и почта остаются в этом браузере. В комнате тебя не подписывают.</p>
        <p className="demo-hint">Админ: имя qqq, почта qqq@qqq. Любой другой вход — участник.</p>
      </div>
      <form className="enter-form" onSubmit={submit}>
        <label className="line">
          <span>имя</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
        </label>
        <label className="line">
          <span>почта</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="fill" type="submit">
          войти
        </button>
      </form>
    </section>
  )
}

export function Cabinet() {
  const { data, room, rooms, seat, isGlobalAdmin, focusRoom, setNote, addGift, removeGift, logout, reset, saveError } = useStore()
  const go = useGo()
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [photo, setPhoto] = useState('')
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  useTitle('кабинет')

  if (!data.user) return <Navigate to="/enter" replace />
  if (!room) return null

  const hosting = isGlobalAdmin && room.presence === 'out'
  const gifts = seat?.gifts || []

  async function onFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const next = await fileToDataUrl(file)
    setPhoto(next)
    setFileName(file.name)
  }

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) {
      setErr('нужно название')
      return
    }
    if (gifts.length >= 12) {
      setErr('в демо хватит двенадцати желаний')
      return
    }
    addGift({ title: title.trim(), url: normalizeUrl(url), photo })
    setTitle('')
    setUrl('')
    setPhoto('')
    setFileName('')
    setErr('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section className="sheet cabinet">
      <div className="cab-head">
        <div>
          <p className="crumb">личный кабинет · {room.title}</p>
          <h1>{data.user.name}</h1>
          <p className="note">{data.user.email}</p>
          <div className="cab-actions">
            <button className="text-btn" type="button" onClick={logout}>
              выйти
            </button>
            <button className="text-btn" type="button" onClick={reset}>
              сбросить демо
            </button>
            <button className="text-btn" type="button" onClick={() => go('/rooms')}>
              все комнаты
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
            {photo && <span className="demo-hint">фото выбрано</span>}
          </div>
          <div className="samples">
            {SAMPLES.map((sample) => (
              <button
                key={sample.src}
                type="button"
                className={photo === sample.src ? 'on' : ''}
                onClick={() => {
                  setPhoto(sample.src)
                  setFileName('')
                }}
              >
                <img src={sample.src} alt={sample.title} />
              </button>
            ))}
          </div>
          {err && <p className="err">{err}</p>}
          {saveError && <p className="err">Хранилище браузера переполнено — фото лучше поменьше.</p>}
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
      </>
      )}
    </section>
  )
}
