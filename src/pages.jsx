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
import { api } from './api'
import { compressImageFile } from './imageCompress'
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

function normalizeUrl(raw) {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function InviteShare({ room }) {
  const [hint, setHint] = useState('')
  if (!room) return null
  const invite = room.inviteLink || ''
  const text = invite || `Код комнаты Тайно: ${room.code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setHint(invite ? 'Ссылка скопирована' : 'Код скопирован')
    } catch {
      setHint(text)
    }
  }

  return (
    <div className="invite-box compact">
      <div className="label">
        <Squiggle />
        <span>пригласить в комнату</span>
      </div>
      <p className="note">
        Ссылка открывает Mini App в комнате и пишет боту в чат — потом можно зайти снова из диалога. Код:{' '}
        <b>{room.code}</b>
      </p>
      <button className="text-btn" type="button" onClick={copy}>
        {invite ? 'Скопировать ссылку' : 'Скопировать код'}
      </button>
      {hint && <p className="demo-hint">{hint}</p>}
    </div>
  )
}

export function RoomLobby() {
  const {
    room,
    theme,
    now,
    isRevealed,
    isAdmin,
    isGlobalAdmin,
    assignment,
    seat,
    drawNow,
    undraw,
    leaveRoom,
    addGift,
    removeGift,
    actionError,
    saveError,
  } = useStore()
  const go = useGo()
  const wishRef = useRef(null)
  const fileRef = useRef(null)
  const [wishOpen, setWishOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle(isRevealed ? 'тебе выпало' : room?.title || 'комната')

  useEffect(() => {
    setWishOpen(false)
  }, [room?.id])

  if (!room) {
    return (
      <section className="hero">
        <div className="hero-copy">
          <p className="crumb">Тайно</p>
          <h1>Нет активной комнаты</h1>
          <p className="note">Выбери комнату на главной или войди по приглашению.</p>
          <div className="row-actions">
            <button className="fill" type="button" onClick={() => go('/')}>
              К комнатам
            </button>
            <button className="text-btn" type="button" onClick={() => go('/enter')}>
              Войти по коду
            </button>
          </div>
        </div>
      </section>
    )
  }

  const budget = money(room.budget, room.currency)
  const drawn = isDrawnRoom(room, now)
  const hosting = isGlobalAdmin && room.presence === 'out'
  const gifts = seat?.gifts || []
  const canLeave = !isRevealed && room.myRole !== 'OWNER' && room.phase === 'REGISTRATION'
  const canEditWish = Boolean(room.canEdit) && !hosting

  if (isRevealed && assignment) {
    return (
      <Collection
        wl={assignment}
        particle={theme.particle}
        kicker={`${theme.label} · тебе выпал этот цвет`}
        side={
          <>
            <p className="note aside">Собери это тихо. Имя не показывается — только цвет списка.</p>
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

  function toggleWish() {
    setWishOpen((open) => {
      const next = !open
      if (next) {
        requestAnimationFrame(() => {
          wishRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
      return next
    })
  }

  async function submitWish(event) {
    event.preventDefault()
    if (!title.trim()) {
      setErr('нужно название')
      return
    }
    if (gifts.length >= 12) {
      setErr('хватит двенадцати желаний')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await addGift({ title: title.trim(), url: normalizeUrl(url), file })
      setTitle('')
      setUrl('')
      setFile(null)
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setErr(e.message || 'не удалось добавить')
    } finally {
      setBusy(false)
    }
  }

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
            <span>что дальше</span>
          </div>
          <p className="note">
            {drawn
              ? 'Раздача уже прошла — открой выпавший список.'
              : `Составь вишлист. В комнате ${peopleCount(count)}. После раздачи откроется один чужой список — без имени, только цвет.`}
            {hosting ? ' Ты ведёшь комнату и в раздаче не участвуешь.' : ''}
          </p>
          <div className="row-actions">
            {canEditWish ? (
              <button className="fill" type="button" onClick={toggleWish} aria-expanded={wishOpen}>
                {wishOpen ? 'Свернуть вишлист' : 'Составить вишлист'}
              </button>
            ) : (
              <button className="fill" type="button" onClick={() => go('/cabinet')}>
                Открыть профиль
              </button>
            )}
            {isGlobalAdmin ? (
              drawn ? (
                <button className="text-btn" type="button" onClick={() => undraw()}>
                  Перерозыгрыш
                </button>
              ) : (
                <button className="text-btn" type="button" onClick={() => drawNow()}>
                  Разыграть сейчас
                </button>
              )
            ) : null}
          </div>
          {isGlobalAdmin && actionError && <p className="err">{actionError}</p>}

          <div
            ref={wishRef}
            className={wishOpen ? 'wish-panel open' : 'wish-panel'}
            aria-hidden={!wishOpen}
          >
            <div className="wish-panel-inner">
              <div className="wish-inline">
                <div className="label">
                  <Squiggle />
                  <span>твой вишлист · {room.title}</span>
                </div>
                <form className="stack-form wish-form" onSubmit={submitWish}>
                  <label className="line">
                    <span>название</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className="line">
                    <span>ссылка на покупку</span>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://"
                      inputMode="url"
                    />
                  </label>
                  <div className="photo-row">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const next = e.target.files?.[0]
                        setFile(next || null)
                        setFileName(next?.name || '')
                      }}
                    />
                    <button className="text-btn" type="button" onClick={() => fileRef.current?.click()}>
                      {fileName || 'Прикрепить фото'}
                    </button>
                  </div>
                  {err && <p className="err">{err}</p>}
                  {saveError && <p className="err">Ошибка сохранения. Попробуй ещё раз.</p>}
                  <button className="fill" type="submit" disabled={busy}>
                    {busy ? 'Добавляю…' : 'Добавить в вишлист'}
                  </button>
                </form>

                {gifts.length === 0 ? (
                  <p className="note">Пока пусто — добавь первое желание.</p>
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
              </div>
            </div>
          </div>

          <InviteShare room={room} />
          <div className="row-actions">
            {isGlobalAdmin && (
              <button className="text-btn" type="button" onClick={() => go('/admin')}>
                Настройки
              </button>
            )}
            {isAdmin && (
              <button className="text-btn" type="button" onClick={() => go('/colors')}>
                Участники и вишлисты
              </button>
            )}
            {canLeave && (
              <button className="text-btn" type="button" onClick={() => leaveRoom()}>
                Покинуть комнату
              </button>
            )}
          </div>
          {!isGlobalAdmin && actionError && <p className="err">{actionError}</p>}
        </div>
      </section>
    </>
  )
}

export function Rules() {
  useTitle('правила')
  return (
    <section className="sheet rules-page">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="rules-copy">
        <p className="crumb">как это работает</p>
        <h1>Правила</h1>
        <p className="note">Анонимный Тайный Санта: вишлисты без имён, раздача по цвету.</p>
      </div>
      <div className="rules" id="rules">
        <ol>
          <li>
            <b>01</b>
            <h2>Пишешь желания</h2>
            <p>Название, ссылка и фото. Имени рядом нет, и своего цвета ты не видишь.</p>
          </li>
          <li>
            <b>02</b>
            <h2>Скоро раздача</h2>
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
      </div>
      </section>
  )
}

export function Colors() {
  const {
    room,
    theme,
    isAdmin,
    participants,
    kickMember,
    changeRequests,
    decideChange,
    loadMemberWishlist,
    adminAddMemberGift,
    adminRemoveMemberGift,
  } = useStore()
  const [pid, setPid] = useState('')
  const [memberWish, setMemberWish] = useState({ items: [] })
  const [wishTitle, setWishTitle] = useState('')
  const [wishUrl, setWishUrl] = useState('')
  const [wishFile, setWishFile] = useState(null)
  const [wishErr, setWishErr] = useState('')
  const wishFileRef = useRef(null)
  useTitle('участники')

  useEffect(() => {
    setPid('')
    setMemberWish({ items: [] })
  }, [room?.id])

  useEffect(() => {
    if (!pid) {
      setMemberWish({ items: [] })
      return
    }
    let cancelled = false
    loadMemberWishlist(pid).then((data) => {
      if (!cancelled) setMemberWish(data || { items: [] })
    })
    return () => {
      cancelled = true
    }
  }, [pid, loadMemberWishlist])

  if (!room) return null
  if (!isAdmin) return <Navigate to="/" replace />

  const person = participants.find((item) => String(item.memberId) === String(pid)) || null
  const personColor = person ? colorById(room.theme, person.colorCode) : null

  async function submitMemberGift(event) {
    event.preventDefault()
    if (!person || !wishTitle.trim()) {
      setWishErr('нужно название')
      return
    }
    try {
      await adminAddMemberGift(person.memberId, {
        title: wishTitle.trim(),
        url: normalizeUrl(wishUrl),
        file: wishFile,
      })
      setWishTitle('')
      setWishUrl('')
      setWishFile(null)
      setWishErr('')
      if (wishFileRef.current) wishFileRef.current.value = ''
      setMemberWish((await loadMemberWishlist(person.memberId)) || { items: [] })
    } catch (e) {
      setWishErr(e.message || 'не удалось добавить')
    }
  }

  return (
    <>
      <section className="page-intro">
        <Weather type={theme.particle} color={theme.ink} />
        <div className="blob blob-a" />
        <p className="crumb">{room.title} · админ</p>
        <h1>Участники</h1>
        <p className="note">
          {peopleCount(participants.length)}. Цвет видишь только ты. Можно открыть и поправить чужой вишлист.
        </p>
      </section>
      <section className="sheet forms">
        <ul className="roster">
          {participants.map((item) => {
            const color = colorById(room.theme, item.colorCode)
            return (
              <li key={item.memberId}>
                <button
                  type="button"
                  className={String(item.memberId) === String(pid) ? 'on' : ''}
                  onClick={() => setPid(String(item.memberId) === String(pid) ? '' : item.memberId)}
                >
                  <i style={{ background: color?.base || '#999' }} aria-hidden="true" />
                  <span className="who">
                    <b>{item.displayName}</b>
                    <span>
                      {color?.name || 'без цвета'}
                      {item.username ? ` · @${item.username}` : ''}
                      {item.participates ? '' : ' · вне раздачи'}
                    </span>
                  </span>
                  <em style={{ background: color?.base || '#999', color: color?.ink || '#fff' }}>
                    {color?.name || '—'}
                  </em>
                </button>
              </li>
            )
          })}
        </ul>
        {person && (
          <div className="person-editor">
            <div className="label">
              <Squiggle />
              <span>участник · {person.displayName}</span>
            </div>
            <div className="color-chip" style={{ background: personColor?.base || '#999', color: personColor?.ink || '#fff' }}>
              {personColor?.name || 'без цвета'}
            </div>
            <p className="note">Участие: {person.participates ? 'да' : 'нет'}.</p>
            {person.role !== 'OWNER' && !room.forceDrawn && (
              <button className="text-btn" type="button" onClick={() => kickMember(person.memberId)}>
                исключить из комнаты
              </button>
            )}

            <div className="label space">
              <Squiggle />
              <span>вишлист участника</span>
            </div>
            {(memberWish.items || []).length === 0 ? (
              <p className="note">Список пока пуст.</p>
            ) : (
              <ul className="mine admin-wish">
                {(memberWish.items || []).map((gift) => (
                  <li key={gift.id}>
                    <div className="frame">
                      <Photo src={gift.imageUrl} alt={gift.title} />
                    </div>
                    <div>
                      <h3>{gift.title}</h3>
                      <div className="item-actions">
                        {gift.url ? (
                          <a className="buy" href={gift.url} target="_blank" rel="noreferrer">
                            ссылка
                          </a>
                        ) : (
                          <span className="demo-hint">без ссылки</span>
                        )}
                        <button
                          className="text-btn"
                          type="button"
                          onClick={async () => {
                            await adminRemoveMemberGift(person.memberId, gift.id)
                            setMemberWish((await loadMemberWishlist(person.memberId)) || { items: [] })
                          }}
                        >
                          убрать
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form className="stack-form" onSubmit={submitMemberGift}>
              <label className="line">
                <span>добавить желание</span>
                <input value={wishTitle} onChange={(e) => setWishTitle(e.target.value)} />
              </label>
              <label className="line">
                <span>ссылка</span>
                <input value={wishUrl} onChange={(e) => setWishUrl(e.target.value)} placeholder="https://" />
              </label>
              <div className="photo-row">
                <input
                  ref={wishFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setWishFile(e.target.files?.[0] || null)}
                />
                <button className="text-btn" type="button" onClick={() => wishFileRef.current?.click()}>
                  {wishFile?.name || 'фото'}
                </button>
              </div>
              {wishErr && <p className="err">{wishErr}</p>}
              <button className="fill" type="submit">
                сохранить в вишлист
              </button>
            </form>
          </div>
        )}
        <div className="label space">
          <Squiggle />
          <span>запросы на изменение</span>
        </div>
        {changeRequests.length === 0 ? (
          <p className="note">Очередь пуста.</p>
        ) : (
          <ul className="change-queue">
            {changeRequests.map((req) => (
              <li key={req.id}>
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
        <p className="note">Выбери комнату или создай новую. В каждую — свой вишлист и своя раздача.</p>
        <div className="row-actions room-new">
          <button className="fill" type="button" onClick={() => go('/rooms/new')}>
            Создать комнату
          </button>
          <button className="text-btn" type="button" onClick={() => go('/enter')}>
            Войти по коду
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
              <button className="room-hit" type="button" onClick={() => focusRoom(item.id, '/room')}>
                <p className="crumb">
                  {theme.label} · {item.myRole === 'OWNER' ? roomMark(item, { name: 'qqq', email: 'qqq@qqq' }) : 'участник'}
                  {item.id === room?.id ? ' · сейчас' : ''}
                </p>
                <h2>{item.title}</h2>
                <span className="band-more">
                  {peopleCount(item.memberCount || 0)} · {drawn ? 'список выпал' : 'скоро'}
                  {item.budget ? ` · ${money(item.budget, item.currency)}` : ''}
                  {item.code ? ` · код ${item.code}` : ''}
                </span>
              </button>
              {item.canTune && (
                <button className="text-btn" type="button" onClick={() => focusRoom(item.id, '/admin')}>
                  Настройки
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
          {busy ? 'Создаю…' : 'Создать комнату'}
        </button>
        <button className="text-btn" type="button" onClick={() => go('/')}>
          К комнатам
        </button>
      </form>
    </section>
  )
}

export function Admin() {
  const {
    room,
    theme,
    isAdmin,
    canTune,
    isGlobalAdmin,
    isRevealed,
    updateRoom,
    drawNow,
    undraw,
    actionError,
  } = useStore()
  const go = useGo()
  const [title, setTitle] = useState(room?.title || '')
  const [inviteHint, setInviteHint] = useState('')
  const [drawBusy, setDrawBusy] = useState(false)
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
        <button className="text-btn" type="button" onClick={() => go('/room')}>
          В комнату
        </button>
      </section>
    )
  }

  const count = room.memberCount || 0
  const guest = room.presence === 'guest'
  const invite = room.inviteLink || ''

  async function copyInvite() {
    const text = invite || `Код комнаты: ${room.code}`
    try {
      await navigator.clipboard.writeText(text)
      setInviteHint(invite ? 'Ссылка скопирована' : 'Код скопирован')
    } catch {
      setInviteHint(text)
    }
  }

  async function onDraw() {
    setDrawBusy(true)
    try {
      if (isRevealed) await undraw()
      else await drawNow()
    } finally {
      setDrawBusy(false)
    }
  }

  return (
    <section className="sheet admin">
      <Weather type={theme.particle} color={theme.ink} />
      <div className="blob blob-a" />
      <div className="admin-intro">
        <p className="crumb">админ · {room.title}</p>
        <h1>Настройки</h1>
        <p className="note">
          Пригласи друзей ссылкой, настрой срок и сумму. Участников и их вишлисты смотри отдельно.
        </p>
      </div>

      <div className="invite-box">
        <div className="label">
          <Squiggle />
          <span>приглашение</span>
        </div>
        <p className="note">
          Ссылка сразу открывает Mini App в этой комнате. Код: <b>{room.code}</b>
        </p>
        {!invite && (
          <p className="demo-hint">Задай TELEGRAM_BOT_USERNAME на сервере — пока копируется только код.</p>
        )}
        <div className="row-actions">
          <button className="fill" type="button" onClick={copyInvite}>
            {invite ? 'Скопировать ссылку' : 'Скопировать код'}
          </button>
          {isAdmin && (
            <button className="text-btn" type="button" onClick={() => go('/colors')}>
              Участники и вишлисты
            </button>
          )}
        </div>
        {inviteHint && <p className="demo-hint">{inviteHint}</p>}
      </div>

      <div className="editor">
        <div className="editor-col">
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
              ? 'Режим «как участник»: чужие вишлисты скрыты. Раздачу всё равно можно запустить.'
              : room.presence === 'out'
                ? 'Ты вне раздачи и не получаешь чужой список.'
                : 'Ты в раздаче и видишь участников.'}
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
          <p className="note">{peopleCount(count)} · код {room.code}</p>
          <p className="demo-hint">
            {isRevealed ? 'После раздачи состав зафиксирован.' : `Для раздачи нужно минимум ${MIN_PEOPLE} участников.`}
          </p>
        </div>
        <div className="editor-col">
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
          {isGlobalAdmin && (
            <div className="row-actions">
              <button className="fill" type="button" disabled={drawBusy} onClick={onDraw}>
                {drawBusy ? 'Разыгрываю…' : isRevealed ? 'Перерозыгрыш' : 'Разыграть сейчас'}
              </button>
            </div>
          )}
          {actionError && <p className="err">{actionError}</p>}
        </div>
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
    } catch (e) {
      setErr(e.message || 'не удалось войти')
      setBusy(false)
    }
  }

  return (
    <section className="sheet enter">
      <div className="blob blob-a" />
      <div className="enter-copy">
        <p className="crumb">приглашение</p>
        <h1>Войти в комнату</h1>
        <p className="note">Вставь код из ссылки бота или сообщения админа — откроется эта комната.</p>
      </div>
      <form className="enter-form" onSubmit={submit}>
        <label className="line">
          <span>код комнаты</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABCD2345"
            autoComplete="off"
          />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="fill" type="submit" disabled={busy}>
          {busy ? 'Вхожу…' : 'Войти'}
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
    isRevealed,
    focusRoom,
    addGift,
    removeGift,
    leaveRoom,
    copyWishlistFrom,
    saveError,
    actionError,
    requestChange,
    changeRequests,
  } = useStore()
  const go = useGo()
  const fileRef = useRef(null)
  const addFileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addFile, setAddFile] = useState(null)
  const [copyFrom, setCopyFrom] = useState('')
  const [copyHint, setCopyHint] = useState('')
  useTitle('вишлист')

  if (!data.user) return <Navigate to="/enter" replace />
  if (!room) {
    return (
      <section className="sheet missing">
        <h1>Вишлист</h1>
        <p className="note">Сначала создай комнату или войди по приглашению — тогда появится список желаний.</p>
        <div className="row-actions">
          <button className="fill" type="button" onClick={() => go('/rooms/new')}>
            Создать комнату
          </button>
          <button className="text-btn" type="button" onClick={() => go('/enter')}>
            Войти по коду
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
    setBusy(true)
    setErr('')
    try {
      await addGift({ title: title.trim(), url: normalizeUrl(url), file })
      setTitle('')
      setUrl('')
      setFile(null)
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setErr(e.message || 'не удалось добавить')
    } finally {
      setBusy(false)
    }
  }

  async function submitAddRequest(event) {
    event.preventDefault()
    if (!addTitle.trim()) {
      setErr('нужно название желания')
      return
    }
    setBusy(true)
    setErr('')
    try {
      let imageId = null
      if (addFile) {
        const compressed = await compressImageFile(addFile)
        const uploaded = await api.uploadImage(room.numericId, compressed)
        imageId = uploaded.id
      }
      await requestChange({
        addTitle: addTitle.trim(),
        addUrl: normalizeUrl(addUrl) || null,
        addImageId: imageId,
      })
      setAddTitle('')
      setAddUrl('')
      setAddFile(null)
      if (addFileRef.current) addFileRef.current.value = ''
    } catch (e) {
      setErr(e.message || 'не удалось отправить запрос')
    } finally {
      setBusy(false)
    }
  }

  async function onCopyWishlist() {
    if (!copyFrom) return
    setCopyHint('')
    try {
      const result = await copyWishlistFrom(Number(copyFrom))
      setCopyHint(`Скопировано: ${result.copied}${result.skipped ? `, пропущено: ${result.skipped}` : ''}`)
    } catch (e) {
      setCopyHint(e.message || 'не удалось скопировать')
    }
  }

  const canLeave = !isRevealed && room.myRole !== 'OWNER' && room.phase === 'REGISTRATION'
  const otherRooms = rooms.filter((item) => item.id !== room.id)

  return (
    <section className="sheet cabinet">
      <div className="cab-head">
        <div>
          <p className="crumb">вишлист · {room.title}</p>
          <h1>{displayName}</h1>
          <p className="note">{data.user.username ? `@${data.user.username}` : 'без username'}</p>
          <div className="cab-actions">
            <button className="text-btn" type="button" onClick={() => go('/')}>
              Мои комнаты
            </button>
            <button className="text-btn" type="button" onClick={() => go('/room')}>
              В комнату
            </button>
            <button className="text-btn" type="button" onClick={() => go('/enter')}>
              Другой код
            </button>
            {canLeave && (
              <button className="text-btn" type="button" onClick={() => leaveRoom()}>
                Покинуть комнату
              </button>
            )}
          </div>
          {actionError && <p className="err">{actionError}</p>}
        </div>
      </div>

      <InviteShare room={room} />

      <div className="label">
        <Squiggle />
        <span>комната</span>
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
        <p className="note">В этой комнате ты не участвуешь. Смотри участников во вкладке «Участники».</p>
      ) : (
      <>
      {room.canEdit && otherRooms.length > 0 && (
        <div className="copy-wish">
          <div className="label">
            <Squiggle />
            <span>скопировать из другой комнаты</span>
          </div>
          <div className="row-actions">
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">выбери комнату</option>
              {otherRooms.map((item) => (
                <option key={item.id} value={item.numericId}>
                  {item.title}
                </option>
              ))}
            </select>
            <button className="text-btn" type="button" disabled={!copyFrom} onClick={onCopyWishlist}>
              Скопировать вишлист
            </button>
          </div>
          {copyHint && <p className="demo-hint">{copyHint}</p>}
        </div>
      )}

      {room.canEdit ? (
        <form className="stack-form wish-form" onSubmit={submit}>
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
              {fileName || 'Прикрепить фото'}
            </button>
            {file && <span className="demo-hint">фото сжимается перед отправкой</span>}
          </div>
          {err && <p className="err">{err}</p>}
          {saveError && <p className="err">Ошибка сохранения. Попробуй ещё раз.</p>}
          <button className="fill" type="submit" disabled={busy}>
            {busy ? (file ? 'Сжимаю и отправляю…' : 'Добавляю…') : 'Добавить в вишлист'}
          </button>
        </form>
      ) : (
        <form className="stack-form wish-form" onSubmit={submitAddRequest}>
          <div className="label">
            <Squiggle />
            <span>запрос админу · добавить желание</span>
          </div>
          <p className="note">После раздачи список закрыт. Отправь желание — админ подтвердит, и оно появится в вишлисте.</p>
          <label className="line">
            <span>название</span>
            <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
          </label>
          <label className="line">
            <span>ссылка</span>
            <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="https://" />
          </label>
          <div className="photo-row">
            <input
              ref={addFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setAddFile(e.target.files?.[0] || null)}
            />
            <button className="text-btn" type="button" onClick={() => addFileRef.current?.click()}>
              {addFile?.name || 'Прикрепить фото'}
            </button>
          </div>
          {err && <p className="err">{err}</p>}
          <button className="fill" type="submit" disabled={busy}>
            {busy ? 'Отправляю…' : 'Отправить админу'}
          </button>
          {changeRequests?.length > 0 && (
            <p className="demo-hint">Последний статус: {changeRequests[0].status}</p>
          )}
        </form>
      )}

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
                  {room.canEdit && (
                    <button className="text-btn" type="button" onClick={() => removeGift(gift.id)}>
                      убрать
                    </button>
                  )}
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
