import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useParams } from 'react-router-dom'
import {
  Collection,
  GiftMini,
  Hint,
  Photo,
  Squiggle,
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
  themeOf,
  toInput,
} from './data'
import { api } from './api'
import { compressImageFile } from './imageCompress'
import { openOnboardingAgain } from './Onboarding'
import { useGo, useStore } from './store'
import { getTelegramPhotoUrl, haptic } from './telegram'

function RuDateTimeInput({ value, onChange }) {
  const inputRef = useRef(null)
  const ts = value ? fromInput(value) || (typeof value === 'number' ? value : null) : null
  const local = typeof value === 'string' ? value : value ? toInput(value) : ''

  function openPicker(event) {
    event.preventDefault()
    const el = inputRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker()
        return
      }
    } catch {
      /* fall through */
    }
    el.focus()
    el.click()
  }

  return (
    <div className="ru-dt">
      <button type="button" className="ru-dt-value" onClick={openPicker}>
        {ts ? formatWhen(ts) : 'выбери дату и время'}
      </button>
      <input
        ref={inputRef}
        type="datetime-local"
        lang="ru"
        value={local}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
      />
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
        Ссылка открывает Mini App в комнате и создаёт диалог с ботом — потом можно вернуться из чата. Код:{' '}
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
    form,
    drawNow,
    undraw,
    leaveRoom,
    addGift,
    removeGift,
    claimGift,
    unclaimGift,
    patchForm,
    attachPersonalWishlist,
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
  const [wbPickup, setWbPickup] = useState('')
  const [contactLink, setContactLink] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [claimBusyId, setClaimBusyId] = useState(null)
  const [personalLists, setPersonalLists] = useState([])
  const [pickListId, setPickListId] = useState('')
  const [attachHint, setAttachHint] = useState('')
  const [inviteToast, setInviteToast] = useState('')
  const [revealOpen, setRevealOpen] = useState(false)
  const [revealDone, setRevealDone] = useState(false)
  const attachLock = useRef(false)
  useTitle(isRevealed ? 'тебе выпало' : room?.title || 'комната')

  useEffect(() => {
    setWishOpen(false)
    setPickListId('')
    setAttachHint('')
    setInviteToast('')
    setRevealOpen(false)
    setRevealDone(false)
    attachLock.current = false
  }, [room?.id])

  useEffect(() => {
    if (!isRevealed || !assignment || !room?.id) return undefined
    const key = `taino-reveal-${room.id}`
    try {
      if (sessionStorage.getItem(key) === '1') {
        setRevealDone(true)
        setRevealOpen(true)
        return undefined
      }
    } catch {
      /* ignore */
    }
    const openTimer = setTimeout(() => setRevealOpen(true), 280)
    const doneTimer = setTimeout(() => {
      setRevealDone(true)
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      haptic('medium')
    }, 1400)
    return () => {
      clearTimeout(openTimer)
      clearTimeout(doneTimer)
    }
  }, [isRevealed, assignment, room?.id])

  useEffect(() => {
    if (!wishOpen) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.personalWishlists()
        if (!cancelled) setPersonalLists(list || [])
      } catch {
        if (!cancelled) setPersonalLists([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [wishOpen])

  useEffect(() => {
    setWbPickup(form?.wbPickup || '')
    setContactLink(form?.telegramLink || '')
    setDisplayName(form?.displayName || '')
  }, [form?.wbPickup, form?.telegramLink, form?.displayName, room?.id])

  useEffect(() => {
    setNoteDraft(form?.note || '')
  }, [room?.id, form?.id])

  useEffect(() => {
    if (!room?.numericId || !room.canEdit) return undefined
    const timer = setTimeout(async () => {
      const patch = {}
      if (wbPickup !== (form?.wbPickup || '')) patch.wbPickup = wbPickup
      if (contactLink !== (form?.telegramLink || '')) patch.telegramLink = contactLink
      if (displayName.trim() && displayName !== (form?.displayName || '')) {
        patch.displayName = displayName.trim()
      }
      if (noteDraft !== (form?.note || '')) patch.note = noteDraft
      if (Object.keys(patch).length === 0) return
      try {
        await patchForm(patch)
      } catch {
        /* keep local */
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [
    wbPickup,
    contactLink,
    displayName,
    noteDraft,
    room?.numericId,
    room?.canEdit,
    form?.wbPickup,
    form?.telegramLink,
    form?.displayName,
    form?.note,
    patchForm,
  ])

  if (!room) {
    return (
      <div className="page-r">
        <h1>Нет активной комнаты</h1>
        <p className="lead">Выбери комнату на главной или войди по приглашению.</p>
        <div className="room-actions">
          <button className="btn-primary" type="button" onClick={() => go('/')}>
            На главную
          </button>
          <button className="btn-secondary" type="button" onClick={() => go('/find')}>
            Найти комнату
          </button>
        </div>
      </div>
    )
  }

  const budget = money(room.budget, room.currency)
  const drawn = isDrawnRoom(room, now)
  const hosting = isGlobalAdmin && room.presence === 'out'
  const gifts = seat?.gifts || []
  const canLeave = !isRevealed && room.myRole !== 'OWNER' && room.phase === 'REGISTRATION'
  const canEditWish = Boolean(room.canEdit) && !hosting

  if (isRevealed && assignment) {
    const openMode = assignment.secrecyMode === 'OPEN'
    async function onClaim(itemId) {
      setClaimBusyId(itemId)
      try {
        await claimGift(itemId)
      } finally {
        setClaimBusyId(null)
      }
    }
    async function onUnclaim(itemId) {
      setClaimBusyId(itemId)
      try {
        await unclaimGift(itemId)
      } finally {
        setClaimBusyId(null)
      }
    }

    if (!revealDone) {
      return (
        <div className="page-r color-reveal">
          <Weather type="confetti" count={18} />
          <p className="lead">Твоя цветовая карточка</p>
          <div className={revealOpen ? 'color-card-flip open' : 'color-card-flip'}>
            <div className="color-face front" style={{ background: theme.band, color: theme.ink }}>
              <div className="ribbon" />
              <strong>ТАЙНО</strong>
              <span>переверни…</span>
            </div>
            <div
              className="color-face back"
              style={{ background: assignment.base || theme.band, color: assignment.ink || theme.ink }}
            >
              <div className="ribbon" />
              <strong style={{ fontSize: '1.4rem' }}>{assignment.name || 'Цвет'}</strong>
              <span>твой получатель</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Collection
        wl={assignment}
        particle={theme.particle}
        kicker={`${theme.label} · тебе выпал этот цвет`}
        onClaim={onClaim}
        onUnclaim={onUnclaim}
        claimBusyId={claimBusyId}
        side={
          <>
            <p className="note aside">
              {openMode
                ? 'Цвет без имени. Ниже — заметка, пункт WB и ссылка, если получатель их указал.'
                : 'Собери это тихо. Имя не показывается — только цвет списка.'}
            </p>
            <p className="note aside">
              Можно отметить «подарю». Если тот же вишлист в другой комнате — другие дарители увидят отметку. Владелец
              списка — нет.
            </p>
            {assignment.note && <p className="note">Заметка: {assignment.note}</p>}
            {openMode && assignment.wbPickup && <p className="note">Пункт WB: {assignment.wbPickup}</p>}
            {openMode && assignment.contactLink && (
              <p className="note">
                Связь:{' '}
                <a href={assignment.contactLink} target="_blank" rel="noreferrer">
                  {assignment.contactLink}
                </a>
              </p>
            )}
            {budget && (
              <p className="budget">
                <span>сумма подарка</span>
                <b>{budget}</b>
              </p>
            )}
            <Timer to={room.giftBy} now={now} />
            <p className="timer-date">подарить до {formatWhen(room.giftBy)}</p>
            <div className="room-actions">
              {isGlobalAdmin && (
                <button className="btn-secondary" type="button" onClick={() => go('/admin')}>
                  Настройки
                </button>
              )}
              {isAdmin && (
                <button className="btn-secondary" type="button" onClick={() => go('/colors')}>
                  Люди
                </button>
              )}
            </div>
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

  async function copyInvite() {
    const invite = room.inviteLink || `Код комнаты Тайно: ${room.code}`
    try {
      await navigator.clipboard.writeText(invite)
      setInviteToast(room.inviteLink ? 'Ссылка скопирована' : 'Код скопирован')
    } catch {
      setInviteToast(invite)
    }
    setTimeout(() => setInviteToast(''), 2000)
  }

  const needMore = Math.max(0, MIN_PEOPLE - count)
  const drawBlocked = !drawn && needMore > 0

  return (
    <div className="room-page">
      <div className="room-hero-card" style={{ background: theme.band, color: theme.ink }}>
        <p className="crumb-r">
          {theme.label} · {peopleCount(count)}
          {room.myRole === 'OWNER' || room.canTune ? ' · организатор' : ''}
        </p>
        <h1>{room.title}</h1>
        {budget && (
          <p className="budget">
            <span>сумма</span>
            <b>{budget}</b>
          </p>
        )}
        <span className="room-art" aria-hidden="true" style={{ position: 'absolute', right: 8, bottom: 4, opacity: 0.85 }}>
          <GiftMini size={72} />
        </span>
      </div>

      <div className="timer-card">
        <span className="timer-label">{drawn ? 'подарить до' : 'до жеребьёвки'}</span>
        <Timer to={drawn ? room.giftBy : room.drawAt} now={now} />
        <p className="timer-date">
          {drawn ? `вручить до ${formatWhen(room.giftBy)}` : `раздача ${formatWhen(room.drawAt)}`}
        </p>
        {drawBlocked && (
          <p className="demo-hint">
            Для раздачи нужно ещё {needMore} {needMore === 1 ? 'участник' : needMore < 5 ? 'участника' : 'участников'}.
          </p>
        )}
        {!drawn && !drawBlocked && (
          <p className="demo-hint">
            В комнате {peopleCount(count)}. После раздачи откроется один чужой список — без имени, только цвет.
            {hosting ? ' Ты ведёшь комнату и в раздаче не участвуешь.' : ''}
          </p>
        )}
      </div>

      <div className="room-actions">
        {canEditWish ? (
          <button className="btn-primary" type="button" onClick={toggleWish} aria-expanded={wishOpen}>
            {wishOpen ? 'Свернуть вишлист' : gifts.length ? 'Редактировать вишлист' : 'Составить вишлист'}
          </button>
        ) : null}
        <button className="btn-secondary" type="button" onClick={copyInvite}>
          Пригласить в комнату
        </button>
        {isGlobalAdmin ? (
          drawn ? (
            <button className="btn-secondary" type="button" onClick={() => undraw()}>
              Перерозыгрыш
            </button>
          ) : (
            <button
              className="btn-secondary"
              type="button"
              disabled={drawBlocked}
              onClick={() => {
                if (!window.confirm('Разыграть пары прямо сейчас?')) return
                drawNow()
              }}
            >
              Разыграть сейчас
            </button>
          )
        ) : null}
      </div>
      {isGlobalAdmin && actionError && <p className="err">{actionError}</p>}

      <div ref={wishRef} className={wishOpen ? 'wish-panel open' : 'wish-panel'} aria-hidden={!wishOpen}>
        <div className="wish-panel-inner">
          <div className="wish-inline">
            <div className="label">
              <Squiggle />
              <span>твой вишлист · {room.title}</span>
            </div>
            <div className="open-fields">
              <label className="field-r">
                <span>имя в комнате</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!room.canEdit}
                  placeholder="как тебя увидят участники"
                  maxLength={80}
                />
              </label>
              {room.canEdit && (
                <div className="copy-wish personal-pick">
                  <div className="label">
                    <Squiggle />
                    <span>из моих вишлистов</span>
                  </div>
                  <p className="note">Выбери готовый список — позиции добавятся в вишлист этой комнаты.</p>
                  <div className="row-actions form-actions">
                    <select
                      value={pickListId}
                      onChange={(e) => setPickListId(e.target.value)}
                      disabled={busy || personalLists.length === 0}
                      aria-label="личный вишлист"
                    >
                      <option value="">
                        {personalLists.length === 0 ? 'пока нет личных списков' : 'выбери список…'}
                      </option>
                      {personalLists.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {item.itemCount || 0} жел.
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={busy || !pickListId}
                      onClick={async () => {
                        if (!pickListId || attachLock.current) return
                        attachLock.current = true
                        setBusy(true)
                        setErr('')
                        setAttachHint('')
                        try {
                          const res = await attachPersonalWishlist(pickListId)
                          setAttachHint(
                            `Добавлено: ${res.copied || 0}` + (res.skipped ? `, пропущено ${res.skipped}` : ''),
                          )
                        } catch (e) {
                          setErr(e.message || 'не удалось добавить список')
                        } finally {
                          attachLock.current = false
                          setBusy(false)
                        }
                      }}
                    >
                      {busy ? 'Добавляю…' : 'Добавить в комнату'}
                    </button>
                  </div>
                  {attachHint && <p className="demo-hint">{attachHint}</p>}
                  {personalLists.length === 0 && (
                    <button className="btn-secondary" type="button" onClick={() => go('/')}>
                      Создать вишлист на главной
                    </button>
                  )}
                </div>
              )}
              {room.secrecyMode === 'OPEN' && (
                <>
                  <label className="field-r">
                    <span>заметка дарителю</span>
                    <textarea
                      rows={2}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      disabled={!room.canEdit}
                      placeholder="размер, адрес, пожелания…"
                    />
                  </label>
                  <p className="demo-hint note-preview-hint">
                    Не привязана к позиции: после раздачи даритель увидит её над твоим списком.
                    {noteDraft.trim() ? ` Сейчас: «${noteDraft.trim()}»` : ''}
                  </p>
                  <label className="field-r">
                    <span>пункт выдачи WB</span>
                    <input
                      value={wbPickup}
                      onChange={(e) => setWbPickup(e.target.value)}
                      disabled={!room.canEdit}
                      placeholder="город, ПВЗ…"
                    />
                  </label>
                  <label className="field-r">
                    <span>ссылка на Telegram</span>
                    <input
                      value={contactLink}
                      onChange={(e) => setContactLink(e.target.value)}
                      disabled={!room.canEdit}
                      placeholder="@username или t.me/…"
                    />
                  </label>
                </>
              )}
            </div>
            <form className="stack-form wish-form" onSubmit={submitWish}>
              <label className="field-r">
                <span>название</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="field-r">
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
                <button className="btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
                  {fileName || 'Прикрепить фото'}
                </button>
              </div>
              {err && <p className="err">{err}</p>}
              {saveError && <p className="err">Ошибка сохранения. Попробуй ещё раз.</p>}
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? 'Добавляю…' : 'Добавить в вишлист'}
              </button>
            </form>

            {gifts.length === 0 ? (
              <p className="empty-block">Пока пусто — добавь первое желание.</p>
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
                          <span className="meta-plain">без ссылки</span>
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
            {room.secrecyMode === 'OPEN' && noteDraft.trim() && (
              <p className="note wish-note-preview">
                <b>Заметка дарителю:</b> {noteDraft.trim()}
              </p>
            )}
          </div>
        </div>
      </div>

      {(isGlobalAdmin || isAdmin) && (
        <div className="room-actions">
          {isGlobalAdmin && (
            <button className="room-list-btn" type="button" onClick={() => go('/admin')}>
              <span>
                <strong>Настройки комнаты</strong>
                <span>Сроки, бюджет, тема, доступ</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          )}
          {isAdmin && (
            <button className="room-list-btn" type="button" onClick={() => go('/colors')}>
              <span>
                <strong>Участники</strong>
                <span>{peopleCount(count)}</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          )}
        </div>
      )}

      {canLeave && (
        <button className="btn-secondary" type="button" onClick={() => leaveRoom()}>
          Покинуть комнату
        </button>
      )}
      {!isGlobalAdmin && actionError && <p className="err">{actionError}</p>}
      {inviteToast && <div className="toast-r">{inviteToast}</div>}
    </div>
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
        <p className="note">Анонимный обмен подарками: вишлисты без имён, раздача по цвету списка.</p>
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
            <p>Пока таймер не дошёл, чужие списки закрыты. Новый участник не выдаёт себя цветом.</p>
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
  const [popPerson, setPopPerson] = useState(null)
  const wishFileRef = useRef(null)
  useTitle('люди')
  const go = useGo()

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
        <h1>Люди</h1>
        <p className="note">
          {peopleCount(participants.length)}. Цвет видишь только ты. Можно открыть и поправить чужой вишлист.
        </p>
        <button className="text-btn" type="button" onClick={() => go('/room')}>
          К комнате
        </button>
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
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setPopPerson(item)
                  }}
                >
                  <i style={{ background: color?.base || '#999' }} aria-hidden="true" />
                  <span className="who">
                    <b
                      onClick={(e) => {
                        e.stopPropagation()
                        setPopPerson(item)
                      }}
                    >
                      {item.displayName}
                    </b>
                    <span>
                      {color?.name || 'без цвета'}
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
        {popPerson && (
          <div className="participant-pop" role="dialog" aria-modal="true">
            <div className="participant-pop-card">
              <p className="crumb">участник</p>
              <h2>{popPerson.displayName}</h2>
              <p className="note">
                {popPerson.username ? `@${popPerson.username}` : 'Telegram-тег скрыт или не задан'}
              </p>
              <button className="fill" type="button" onClick={() => setPopPerson(null)}>
                Закрыть
              </button>
            </div>
          </div>
        )}
        {person && (
          <div className="person-editor">
            <div className="label">
              <Squiggle />
              <span>
                участник ·{' '}
                <button className="text-btn" type="button" onClick={() => setPopPerson(person)}>
                  {person.displayName}
                </button>
              </span>
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

function daysUntil(ts, now) {
  const left = Math.max(0, ts - now)
  return Math.ceil(left / 86400000)
}

function RoomCardR({ item, now, onOpen }) {
  const theme = themeOf(item.theme)
  const drawn = isDrawnRoom(item, now)
  const delivery = item.phase === 'DELIVERY'
  const organizer = item.myRole === 'OWNER' || item.canTune
  const days = daysUntil(item.drawAt, now)
  const status = delivery
    ? 'Раздача подарков'
    : drawn
      ? 'Жеребьёвка проведена'
      : `До жеребьёвки ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`

  return (
    <button
      type="button"
      className="room-card-r"
      style={{ background: theme.band, color: theme.ink }}
      onClick={onOpen}
    >
      {organizer && <span className="owner-badge">организатор</span>}
      <h3>{item.title}</h3>
      <p className="sub">{theme.label}</p>
      <div className="room-meta">
        <span>{peopleCount(item.memberCount || 0)}</span>
        {item.budget ? <span>{money(item.budget, item.currency)}</span> : null}
      </div>
      <span className="status-pill">{status}</span>
      <span className="room-art" aria-hidden="true">
        <GiftMini size={64} />
      </span>
    </button>
  )
}

export function Rooms() {
  const { rooms, archivedRooms, room, focusRoom, now, reload } = useStore()
  const go = useGo()
  const [filter, setFilter] = useState('active')
  const [wishlists, setWishlists] = useState([])
  useTitle('главная')

  useEffect(() => {
    reload?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.personalWishlists()
        if (!cancelled) setWishlists(list || [])
      } catch {
        if (!cancelled) setWishlists([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const active = [...rooms].sort((a, b) => {
    if (a.id === room?.id) return -1
    if (b.id === room?.id) return 1
    return Number(b.numericId || 0) - Number(a.numericId || 0)
  })
  const archived = [...archivedRooms].sort((a, b) => Number(b.giftBy || 0) - Number(a.giftBy || 0))
  const list = filter === 'active' ? active : archived

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-row">
          <div>
            <h1>Обмен подарками без спойлеров</h1>
            <p>Создавай комнату, собирай вишлисты и узнай своего получателя в день жеребьёвки — по цвету, без имени.</p>
          </div>
          <GiftMini size={72} />
        </div>
      </section>

      <section className="action-cards">
        <button type="button" className="action-card create" onClick={() => go('/rooms/new')}>
          <span className="action-arrow" aria-hidden="true">
            →
          </span>
          <strong>Создать комнату</strong>
          <span>Организуй свой обмен подарками.</span>
          <span className="action-art">
            <GiftMini size={56} />
          </span>
        </button>
        <button type="button" className="action-card join" onClick={() => go('/find')}>
          <span className="action-arrow" aria-hidden="true">
            →
          </span>
          <strong>Присоединиться</strong>
          <span>Введи код от друга и стань участником.</span>
        </button>
      </section>

      <section>
        <div className="section-head">
          <h2>Мои комнаты</h2>
          <div className="filter-chips">
            <button type="button" className={filter === 'active' ? 'chip-r on' : 'chip-r'} onClick={() => setFilter('active')}>
              Активные
            </button>
            <button
              type="button"
              className={filter === 'done' ? 'chip-r on' : 'chip-r'}
              onClick={() => setFilter('done')}
            >
              Завершённые
            </button>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="empty-block">
            {filter === 'active'
              ? 'Пока нет комнат. Создай свою или войди по коду.'
              : 'Архив пуст — завершённые комнаты появятся здесь.'}
          </p>
        ) : (
          list.map((item) => (
            <RoomCardR
              key={item.id}
              item={item}
              now={now}
              onOpen={() => focusRoom(item.id, filter === 'done' ? '/room' : '/room')}
            />
          ))
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Мои вишлисты</h2>
          <button className="icon-plus-sm" type="button" aria-label="создать вишлист" onClick={() => go('/cabinet')}>
            +
          </button>
        </div>
        {wishlists.length === 0 ? (
          <p className="empty-block">Пока пусто — создай первый список</p>
        ) : (
          wishlists.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="wish-row"
              onClick={() => go(`/cabinet/wishlists/${item.id}`)}
            >
              <div>
                <strong>{item.title}</strong>
                <span>{item.itemCount || 0} жел.</span>
              </div>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}

export function Find() {
  const { rooms, focusRoom, joinByCode, joinPublicRoom } = useStore()
  const [tab, setTab] = useState('code')
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [publicQ, setPublicQ] = useState('')
  const [publicRooms, setPublicRooms] = useState([])
  const [publicBusy, setPublicBusy] = useState(false)
  const [publicErr, setPublicErr] = useState('')
  const [joiningId, setJoiningId] = useState(null)
  useTitle('найти')
  const myRoomIds = new Set(rooms.map((r) => String(r.numericId)))

  useEffect(() => {
    if (tab !== 'public') return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      setPublicBusy(true)
      setPublicErr('')
      try {
        const list = await api.publicRooms(publicQ.trim())
        if (!cancelled) setPublicRooms(list || [])
      } catch (e) {
        if (!cancelled) setPublicErr(e.message || 'Не удалось загрузить публичные комнаты')
      } finally {
        if (!cancelled) setPublicBusy(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [publicQ, tab])

  async function applyDisplayName(roomId) {
    const name = displayName.trim()
    if (!name || !roomId) return
    try {
      await api.updateForm(roomId, { displayName: name })
    } catch {
      /* optional */
    }
  }

  async function submitCode(event) {
    event.preventDefault()
    if (code.trim().length < 4) {
      setErr('введи код комнаты')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const detail = await joinByCode(code)
      const roomId = detail?.room?.id || detail?.room?.numericId
      await applyDisplayName(roomId)
    } catch (e) {
      setErr(e.message || 'не удалось войти')
      setBusy(false)
    }
  }

  async function onJoinPublic(item) {
    setJoiningId(item.id)
    setPublicErr('')
    try {
      const detail = await joinPublicRoom(item.id)
      const roomId = detail?.room?.id || item.id
      await applyDisplayName(roomId)
    } catch (e) {
      setPublicErr(e.message || 'Не удалось войти')
      setJoiningId(null)
    }
  }

  return (
    <div className="page-r">
      <h1>Найти комнату</h1>
      <p className="lead">Войди по коду из приглашения или выбери публичную комнату.</p>

      <div className="seg" role="tablist">
        <button type="button" role="tab" className={tab === 'code' ? 'on' : ''} onClick={() => setTab('code')}>
          По коду
        </button>
        <button type="button" role="tab" className={tab === 'public' ? 'on' : ''} onClick={() => setTab('public')}>
          Публичные
        </button>
      </div>

      {tab === 'code' ? (
        <form className="stack-form" onSubmit={submitCode}>
          <label className="field-r">
            <span>код комнаты</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABCD2345"
              autoComplete="off"
            />
          </label>
          <label className="field-r">
            <span>имя в комнате</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="как тебя увидят"
              maxLength={80}
            />
          </label>
          {err && <p className="err">{err}</p>}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Вхожу…' : 'Войти'}
          </button>
        </form>
      ) : (
        <div className="stack-form">
          <label className="field-r">
            <span>поиск</span>
            <input value={publicQ} onChange={(e) => setPublicQ(e.target.value)} placeholder="название…" />
          </label>
          <label className="field-r">
            <span>имя в комнате</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="как тебя увидят"
              maxLength={80}
            />
          </label>
          {publicBusy && <p className="demo-hint">Ищу…</p>}
          {publicErr && <p className="err">{publicErr}</p>}
          {!publicBusy && publicRooms.length === 0 && (
            <p className="empty-block">Пока нет публичных комнат с открытой регистрацией.</p>
          )}
          <ul className="public-list">
            {publicRooms.map((item) => {
              const already = myRoomIds.has(String(item.id))
              return (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="demo-hint">
                      {peopleCount(item.memberCount || 0)} ·{' '}
                      {item.secrecyMode === 'OPEN' ? 'нетайно' : 'тайно'}
                      {item.budgetMax ? ` · до ${money(item.budgetMax, item.currency)}` : ''}
                    </span>
                  </div>
                  {already ? (
                    <button className="btn-secondary" type="button" onClick={() => focusRoom(String(item.id), '/room')}>
                      Открыть
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={joiningId === item.id}
                      onClick={() => onJoinPublic(item)}
                    >
                      {joiningId === item.id ? 'Вхожу…' : 'Войти'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export function NewRoom() {
  const { createRoom, room, focusRoom } = useStore()
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('birthday')
  const [presence, setPresence] = useState('in')
  const [secrecyMode, setSecrecyMode] = useState('SECRET')
  const [visibility, setVisibility] = useState('PRIVATE')
  const [budget, setBudget] = useState('100')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [drawAt, setDrawAt] = useState(() => toInput(Date.now() + 14 * 86400000))
  const [giftBy, setGiftBy] = useState(() => toInput(Date.now() + 24 * 86400000))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const cash = currencyOf(currency)
  const themeMeta = themeOf(theme)
  useTitle('создание комнаты')

  function validateStep() {
    if (step === 0) {
      if (title.trim().length < 2) return 'как назвать комнату?'
    }
    if (step === 3) {
      const draw = fromInput(drawAt)
      const gift = fromInput(giftBy)
      if (!draw || !gift) return 'нужны обе даты'
      if (gift <= draw) return 'подарок позже раздачи'
    }
    return ''
  }

  function next() {
    const message = validateStep()
    if (message) {
      setErr(message)
      return
    }
    setErr('')
    setStep((s) => Math.min(3, s + 1))
  }

  async function submit() {
    const message = validateStep()
    if (message) {
      setErr(message)
      return
    }
    setBusy(true)
    setErr('')
    try {
      await createRoom(
        {
          title: title.trim(),
          theme,
          presence,
          secrecyMode,
          visibility,
          budget: readBudget(budget),
          currency,
          drawAt: fromInput(drawAt),
          giftBy: fromInput(giftBy),
        },
        { skipNavigate: true },
      )
      setReady(true)
    } catch (e) {
      setErr(e.message || 'не удалось создать')
    } finally {
      setBusy(false)
    }
  }

  async function copyInvite() {
    const invite = room?.inviteLink || (room?.code ? `Код комнаты Тайно: ${room.code}` : '')
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite)
      setToast('Ссылка скопирована')
      setTimeout(() => setToast(''), 1800)
    } catch {
      setToast(invite)
      setTimeout(() => setToast(''), 2400)
    }
  }

  if (ready && room) {
    return (
      <div className="ready-screen">
        <GiftMini size={88} />
        <h1>Комната готова!</h1>
        <p className="lead">Теперь пригласи друзей и собери вишлист.</p>
        <div className="ready-card" style={{ background: themeMeta.band, color: themeMeta.ink }}>
          <span className="crumb">{themeMeta.label}</span>
          <strong style={{ fontSize: '1.25rem' }}>{room.title}</strong>
          <div className="room-meta">
            <span>{peopleCount(room.memberCount || 1)}</span>
            {room.budget ? <span>{money(room.budget, room.currency)}</span> : null}
          </div>
          <span className="status-pill">До жеребьёвки {daysUntil(room.drawAt, Date.now())} дн.</span>
        </div>
        <button className="btn-primary" type="button" onClick={copyInvite}>
          Пригласить в комнату
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            focusRoom(room.id, '/room')
          }}
        >
          Составить вишлист
        </button>
        <div className="next-steps">
          <h2>Что дальше?</h2>
          <div className="next-step">
            <div className="ico" style={{ background: 'var(--pink)' }}>
              👥
            </div>
            <div>
              <strong>Дождись жеребьёвки</strong>
              <span>Мы случайно распределим участников</span>
            </div>
          </div>
          <div className="next-step">
            <div className="ico" style={{ background: 'var(--lavender)' }}>
              🎁
            </div>
            <div>
              <strong>Подготовь подарок</strong>
              <span>Ориентируйся на вишлист своего получателя</span>
            </div>
          </div>
        </div>
        {toast && <div className="toast-r">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="wizard">
      <div className="wizard-progress" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <h1>Что празднуем?</h1>
          <label className="field-r">
            <span>название</span>
            <input value={title} maxLength={42} onChange={(e) => setTitle(e.target.value)} placeholder="День рождения Кати" />
          </label>
          <p className="lead">Выбери тему — карточки комнаты подстроятся под повод.</p>
          <ThemePicker value={theme} onChange={setTheme} />
        </>
      )}

      {step === 1 && (
        <>
          <h1>Настройки комнаты</h1>
          <p className="lead">Ты автоматически становишься организатором. Можно участвовать в раздаче или только вести комнату.</p>
          <div className="presence">
            <button type="button" className={visibility === 'PRIVATE' ? 'on' : ''} onClick={() => setVisibility('PRIVATE')}>
              <strong>Приватная</strong>
              <span>Только по коду или ссылке</span>
            </button>
            <button type="button" className={visibility === 'PUBLIC' ? 'on' : ''} onClick={() => setVisibility('PUBLIC')}>
              <strong>Публичная</strong>
              <span>Видна во вкладке «Найти»</span>
            </button>
          </div>
          <div className="presence">
            <button type="button" className={secrecyMode === 'SECRET' ? 'on' : ''} onClick={() => setSecrecyMode('SECRET')}>
              <strong>Тайно</strong>
              <span>Только цвет и вишлист</span>
            </button>
            <button type="button" className={secrecyMode === 'OPEN' ? 'on' : ''} onClick={() => setSecrecyMode('OPEN')}>
              <strong>Нетайно</strong>
              <span>Ещё заметка, WB и ссылка</span>
            </button>
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
        </>
      )}

      {step === 2 && (
        <>
          <h1>Бюджет</h1>
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
          <label className="field-r">
            <span>сумма · {cash.short}</span>
            <input type="number" min="0" step="1" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
          <p className="demo-hint">{money(budget, currency) || 'сумма не задана'}</p>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Даты</h1>
          <div className="field-r">
            <span>жеребьёвка</span>
            <RuDateTimeInput value={drawAt} onChange={(e) => setDrawAt(e.target.value)} />
          </div>
          <div className="field-r">
            <span>подарить до</span>
            <RuDateTimeInput value={giftBy} onChange={(e) => setGiftBy(e.target.value)} />
          </div>
          <p className="demo-hint">Минимум участников для раздачи — {MIN_PEOPLE}.</p>
        </>
      )}

      {err && <p className="err">{err}</p>}

      <div className="room-actions">
        {step < 3 ? (
          <button className="btn-primary" type="button" onClick={next}>
            Дальше
          </button>
        ) : (
          <button className="btn-primary" type="button" disabled={busy} onClick={submit}>
            {busy ? 'Создаю…' : 'Создать комнату'}
          </button>
        )}
        {step > 0 && (
          <button className="btn-secondary" type="button" onClick={() => setStep((s) => s - 1)}>
            Назад
          </button>
        )}
      </div>
    </div>
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
    deleteRoom,
    actionError,
  } = useStore()
  const go = useGo()
  const [title, setTitle] = useState(room?.title || '')
  const [inviteHint, setInviteHint] = useState('')
  const [drawBusy, setDrawBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
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

  async function onDeleteRoom() {
    if (!window.confirm(`Удалить комнату «${room.title}» навсегда? Участники потеряют доступ.`)) return
    setDeleteBusy(true)
    try {
      await deleteRoom(room.numericId)
    } catch {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="page-r admin">
      <h1>Настройки</h1>
      <p className="lead">
        {room.title} · код <b>{room.code}</b>. Пригласи друзей и настрой срок и сумму.
      </p>

      <div className="invite-box">
        <div className="label">
          <Squiggle />
          <span>приглашение</span>
        </div>
        <p className="note">Ссылка сразу открывает Mini App в этой комнате.</p>
        {!invite && (
          <p className="demo-hint">Задай TELEGRAM_BOT_USERNAME на сервере — пока копируется только код комнаты.</p>
        )}
        <div className="room-actions">
          <button className="btn-primary" type="button" onClick={copyInvite}>
            {invite ? 'Скопировать ссылку' : 'Скопировать код'}
          </button>
          {isAdmin && (
            <button className="btn-secondary" type="button" onClick={() => go('/colors')}>
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
              <div
                key={item.id}
                className={room.presence === item.id ? 'presence-row on' : 'presence-row'}
              >
                <button
                  type="button"
                  className="presence-pick"
                  onClick={() => updateRoom({ presence: item.id })}
                >
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </button>
                <Hint text={item.tip} />
              </div>
            ))}
          </div>
          <div className="admin-preview">
            <div className="title-row">
              <h3>Как увидят участники</h3>
              <Hint text="Краткий превью экрана участника после твоих настроек." />
            </div>
            <p className="note">
              {guest
                ? 'Ты в раздаче как участник, но без админ-панели: вкладка «Люди» и чужие вишлисты скрыты до жеребьёвки.'
                : room.presence === 'out'
                  ? 'Ты только организатор: приглашения, даты, розыгрыш. В жеребьёвке тебя нет.'
                  : 'Ты организатор в раздаче: настройки, список людей и своя пара после жеребьёвки.'}
            </p>
            <p className="note">
              {(room.secrecyMode || 'SECRET') === 'SECRET'
                ? 'После раздачи даритель видит только цвет и вишлист — без имени и контактов.'
                : 'После раздачи даритель видит цвет, вишлист, заметку, пункт WB и ссылку Telegram получателя.'}
            </p>
          </div>
          <div className="label space">
            <Squiggle />
            <span>
              режим <Hint text="Тайно — полная анонимность. Нетайно — даритель видит заметку и контакты, но не имя в интерфейсе цвета." />
            </span>
          </div>
          <div className="presence">
            <button
              type="button"
              className={(room.secrecyMode || 'SECRET') === 'SECRET' ? 'on' : ''}
              onClick={() => updateRoom({ secrecyMode: 'SECRET' })}
            >
              <strong>Тайно</strong>
              <span>Цвет без имени и контактов</span>
            </button>
            <button
              type="button"
              className={room.secrecyMode === 'OPEN' ? 'on' : ''}
              onClick={() => updateRoom({ secrecyMode: 'OPEN' })}
            >
              <strong>Нетайно</strong>
              <span>Заметка, WB, ссылка TG</span>
            </button>
          </div>
          <div className="label space">
            <Squiggle />
            <span>доступ</span>
          </div>
          <div className="presence">
            <button
              type="button"
              className={(room.visibility || 'PRIVATE') === 'PRIVATE' ? 'on' : ''}
              onClick={() => updateRoom({ visibility: 'PRIVATE' })}
            >
              <strong>Приватная</strong>
              <span>Только по коду</span>
            </button>
            <button
              type="button"
              className={room.visibility === 'PUBLIC' ? 'on' : ''}
              onClick={() => updateRoom({ visibility: 'PUBLIC' })}
            >
              <strong>Публичная</strong>
              <span>В поиске «Найти»</span>
            </button>
          </div>
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
          <div className="line">
            <span>раздача</span>
            <RuDateTimeInput
              value={toInput(room.drawAt)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ drawAt: ts })
              }}
            />
          </div>
          <p className="demo-hint">Если сдвинуть вперёд, выпавший список снова закроется.</p>
          <div className="line">
            <span>подарить до</span>
            <RuDateTimeInput
              value={toInput(room.giftBy)}
              onChange={(event) => {
                const ts = fromInput(event.target.value)
                if (ts) updateRoom({ giftBy: ts })
              }}
            />
          </div>
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
            <div className="room-actions">
              <button className="btn-primary" type="button" disabled={drawBusy} onClick={onDraw}>
                {drawBusy ? 'Разыгрываю…' : isRevealed ? 'Перерозыгрыш' : 'Разыграть сейчас'}
              </button>
            </div>
          )}
          {actionError && <p className="err">{actionError}</p>}
        </div>
      </div>

      {isGlobalAdmin && (
        <div className="danger-zone">
          <div className="label">
            <Squiggle />
            <span>удаление</span>
          </div>
          <p className="note">
            Комната исчезнет у всех. После даты подарков она ещё неделю живёт в активных, потом уходит в архив —
            оттуда тоже можно удалить.
          </p>
          <button className="btn-secondary danger-btn" type="button" disabled={deleteBusy} onClick={onDeleteRoom}>
            {deleteBusy ? 'Удаляю…' : 'Удалить комнату'}
          </button>
        </div>
      )}
    </div>
  )
}

export function Enter() {
  return <Navigate to="/find" replace />
}

export function Cabinet() {
  const { data } = useStore()
  const go = useGo()
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle('профиль')

  const displayName = data.user?.firstName || data.user?.username || 'ты'
  const photo = data.user?.photoUrl || getTelegramPhotoUrl()
  const initial = (displayName || '?').trim().slice(0, 1).toUpperCase()

  if (!data.user) return <Navigate to="/find" replace />

  async function createList(event) {
    event.preventDefault()
    if (!newTitle.trim()) {
      setErr('нужно название')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const created = await api.createPersonalWishlist({ title: newTitle.trim() })
      setNewTitle('')
      setCreating(false)
      go(`/cabinet/wishlists/${created.id}`)
    } catch (e) {
      setErr(e.message || 'не удалось создать')
    } finally {
      setBusy(false)
    }
  }

  function replayOnboarding() {
    openOnboardingAgain()
    window.dispatchEvent(new Event('taino:onboarding'))
  }

  return (
    <div className="page-r">
      <div className="profile-head">
        <div className="profile-avatar">
          {photo ? <img src={photo} alt="" /> : <span style={{ fontSize: 36, fontWeight: 800 }}>{initial}</span>}
        </div>
        <h2>{displayName}</h2>
        <p className="handle">{data.user.username ? `@${data.user.username}` : 'без username'}</p>
      </div>

      <button type="button" className="menu-card" onClick={replayOnboarding}>
        <span className="menu-ico" style={{ background: 'var(--pink)' }}>
          ?
        </span>
        <span>
          <strong>Как работает ТАЙНО</strong>
          <span>Короткий онбординг</span>
        </span>
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>

      <button type="button" className="menu-card" onClick={() => go('/legal')}>
        <span className="menu-ico" style={{ background: 'var(--lavender)' }}>
          i
        </span>
        <span>
          <strong>О сервисе</strong>
          <span>Правила, privacy, terms</span>
        </span>
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>

      <button type="button" className="menu-card" onClick={() => go('/')}>
        <span className="menu-ico" style={{ background: 'var(--mint)' }}>
          ♡
        </span>
        <span>
          <strong>Мои вишлисты</strong>
          <span>Списки на главной · создать новый ниже</span>
        </span>
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>

      {!creating ? (
        <button className="btn-secondary" type="button" onClick={() => setCreating(true)}>
          Новый вишлист
        </button>
      ) : (
        <form className="stack-form" onSubmit={createList}>
          <label className="field-r">
            <span>название</span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="День рождения, Новый год…"
              autoFocus
            />
          </label>
          {err && <p className="err">{err}</p>}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Создаю…' : 'Создать'}
          </button>
          <button className="btn-secondary" type="button" onClick={() => setCreating(false)}>
            Отмена
          </button>
        </form>
      )}
    </div>
  )
}

export function WishlistNotebook() {
  const { id } = useParams()
  const { room } = useStore()
  const go = useGo()
  const fileRef = useRef(null)
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [attachHint, setAttachHint] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [itemModal, setItemModal] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [sharePanel, setSharePanel] = useState(null)
  const [shareFlash, setShareFlash] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [itemUrl, setItemUrl] = useState('')
  const [itemSku, setItemSku] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  useTitle(detail?.title || 'вишлист')

  async function load() {
    const d = await api.personalWishlist(id)
    setDetail(d)
    setTitleDraft(d.title)
    return d
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.personalWishlist(id)
        if (!cancelled) {
          setDetail(d)
          setTitleDraft(d.title)
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'не найден')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!itemModal) return undefined
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [itemModal])

  async function saveTitle() {
    if (!titleDraft.trim()) {
      setErr('нужно название')
      return
    }
    setBusy(true)
    try {
      const d = await api.updatePersonalWishlist(id, { title: titleDraft.trim() })
      setDetail(d)
      setEditingTitle(false)
    } catch (e) {
      setErr(e.message || 'не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  function openAdd() {
    setItemModal({ mode: 'add' })
    setItemTitle('')
    setItemUrl('')
    setItemSku('')
    setFile(null)
    setFileName('')
    setMenuId(null)
  }

  function openEdit(gift) {
    setItemModal({ mode: 'edit', item: gift })
    setItemTitle(gift.title || '')
    setItemUrl(gift.url || '')
    setItemSku(gift.sku || '')
    setFile(null)
    setFileName('')
    setMenuId(null)
  }

  async function saveItem(event) {
    event.preventDefault()
    if (!itemTitle.trim()) {
      setErr('нужно название')
      return
    }
    setBusy(true)
    setErr('')
    try {
      let body
      if (file) {
        const compressed = await compressImageFile(file)
        const uploaded = await api.uploadMyImage(compressed)
        body = {
          type: 'IMAGE',
          title: itemTitle.trim(),
          imageId: uploaded.id,
          url: normalizeUrl(itemUrl) || null,
          sku: itemSku.trim() || null,
        }
      } else if (itemUrl.trim()) {
        body = {
          type: 'LINK',
          title: itemTitle.trim(),
          url: normalizeUrl(itemUrl),
          sku: itemSku.trim() || null,
        }
      } else {
        body = {
          type: itemSku.trim() ? 'SKU' : 'TEXT',
          title: itemTitle.trim(),
          sku: itemSku.trim() || null,
        }
      }
      if (itemModal?.mode === 'edit' && itemModal.item?.id) {
        await api.updatePersonalWishlistItem(id, itemModal.item.id, body)
      } else {
        await api.addPersonalWishlistItem(id, body)
      }
      setItemModal(null)
      await load()
    } catch (e) {
      setErr(e.message || 'не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  async function removeItem(itemId) {
    if (!window.confirm('Удалить эту позицию?')) return
    setMenuId(null)
    await api.removePersonalWishlistItem(id, itemId)
    await load()
  }

  async function removeList() {
    if (!window.confirm(`Удалить вишлист «${detail?.title}»?`)) return
    await api.deletePersonalWishlist(id)
    go('/cabinet')
  }

  function openShare() {
    if (!detail?.shareToken) {
      setErr('Нет ссылки')
      return
    }
    setSharePanel({
      telegramUrl:
        detail.telegramShareUrl || `${window.location.origin}/shared/${detail.shareToken}`,
      webUrl: detail.webShareUrl || `${window.location.origin}/shared/${detail.shareToken}`,
      title: detail.title,
    })
    setShareFlash('')
    setMenuId(null)
  }

  async function copyShareUrl(url, label) {
    try {
      await navigator.clipboard.writeText(url)
      setShareFlash(label || 'Ссылка скопирована')
      haptic('success')
    } catch {
      setShareFlash(url)
    }
  }

  if (err && !detail) {
    return (
      <section className="sheet">
        <p className="err">{err}</p>
        <button className="text-btn" type="button" onClick={() => go('/cabinet')}>
          Назад
        </button>
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="sheet">
        <p className="note">Загрузка…</p>
      </section>
    )
  }

  return (
    <div className="page-r notebook-r">
      <div className="notebook-toolbar">
        <button className="btn-secondary narrow" type="button" onClick={() => go('/')}>
          ← Назад
        </button>
        <button className="btn-secondary narrow danger-btn" type="button" onClick={removeList}>
          Удалить список
        </button>
      </div>

      {editingTitle ? (
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault()
            saveTitle()
          }}
        >
          <label className="field-r">
            <span>название вишлиста</span>
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus />
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            Сохранить
          </button>
          <button className="btn-secondary" type="button" onClick={() => setEditingTitle(false)}>
            Отмена
          </button>
        </form>
      ) : (
        <div className="notebook-title-row">
          <h1>{detail.title}</h1>
          <button
            className="pencil-btn"
            type="button"
            aria-label="переименовать"
            onClick={() => {
              setTitleDraft(detail.title)
              setEditingTitle(true)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 6.5l3 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="room-actions">
        <button className="btn-primary" type="button" onClick={openAdd}>
          Добавить в вишлист
        </button>
        <button className="btn-secondary" type="button" onClick={openShare}>
          Поделиться списком
        </button>
        {room?.numericId && room.canEdit && (
          <button
            className="btn-secondary"
            type="button"
            disabled={busy}
            onClick={async () => {
              if (busy) return
              setBusy(true)
              setAttachHint('')
              setErr('')
              try {
                const res = await api.attachPersonalWishlist(id, room.numericId)
                setAttachHint(
                  `В комнату «${room.title}» добавлено: ${res.copied || 0}` +
                    (res.skipped ? `, уже было ${res.skipped}` : ''),
                )
                haptic('success')
              } catch (e) {
                setErr(e.message || 'не удалось добавить в комнату')
              } finally {
                setBusy(false)
              }
            }}
          >
            В текущую комнату
          </button>
        )}
      </div>
      {attachHint && <p className="demo-hint">{attachHint}</p>}

      {sharePanel && (
        <div className="share-panel">
          <p className="share-label">Telegram Mini App</p>
          <code className="share-url">{sharePanel.telegramUrl}</code>
          <div className="room-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={() => copyShareUrl(sharePanel.telegramUrl, 'Ссылка Telegram скопирована')}
            >
              Скопировать
            </button>
            <button className="btn-secondary" type="button" onClick={() => setSharePanel(null)}>
              Закрыть
            </button>
          </div>
          {shareFlash && <p className="share-flash">{shareFlash}</p>}
        </div>
      )}

      {(detail.items || []).length === 0 ? (
        <p className="empty-block">Позиций пока нет — добавь первую.</p>
      ) : (
        <div className="notebook-list">
          {detail.items.map((gift) => (
            <div className="notebook-item" key={gift.id}>
              <div className="frame" style={{ width: 56, height: 56, flexShrink: 0 }}>
                <Photo src={gift.imageUrl} alt={gift.title} />
              </div>
              <div className="notebook-item-main">
                <strong>{gift.title}</strong>
                {gift.sku && <p className="demo-hint">арт. {gift.sku}</p>}
                {gift.url && (
                  <a className="btn-chip" href={gift.url} target="_blank" rel="noreferrer">
                    Ссылка
                  </a>
                )}
              </div>
              <button
                className="dots-btn"
                type="button"
                aria-label="меню"
                onClick={() => setMenuId(menuId === gift.id ? null : gift.id)}
              >
                ⋮
              </button>
              {menuId === gift.id && (
                <div className="notebook-menu">
                  <button type="button" onClick={() => openEdit(gift)}>
                    Редактировать
                  </button>
                  <button type="button" onClick={openShare}>
                    Поделиться
                  </button>
                  <button type="button" onClick={() => removeItem(gift.id)}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {err && <p className="err">{err}</p>}

      {itemModal &&
        createPortal(
          <div
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setItemModal(null)
            }}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                type="button"
                aria-label="закрыть"
                onClick={() => setItemModal(null)}
              >
                ×
              </button>
              <h2>{itemModal.mode === 'edit' ? 'Редактировать' : 'Новая позиция'}</h2>
              <form className="stack-form" onSubmit={saveItem}>
                <label className="field-r">
                  <span>название</span>
                  <input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} autoFocus />
                </label>
                <label className="field-r">
                  <span>ссылка</span>
                  <input
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    placeholder="https://"
                    inputMode="url"
                  />
                </label>
                <label className="field-r">
                  <span>артикул</span>
                  <input value={itemSku} onChange={(e) => setItemSku(e.target.value)} placeholder="опционально" />
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
                  <button className="btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
                    {fileName || 'Прикрепить фото'}
                  </button>
                </div>
                <div className="modal-actions">
                  <button className="btn-primary" type="submit" disabled={busy}>
                    {busy ? 'Сохраняю…' : 'Сохранить'}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setItemModal(null)}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export function SharedWishlist({ guest = false }) {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const go = useGo()
  const { boot } = useStore()
  const isGuest = guest || boot.guest
  useTitle('вишлист')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const shared = await api.sharedWishlist(token)
        if (!cancelled) setData(shared)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Вишлист не найден')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (err) {
    return (
      <section className="sheet missing">
        <h1>Нет доступа</h1>
        <p className="note">{err}</p>
        {!isGuest && (
          <button className="text-btn" type="button" onClick={() => go('/')}>
            На главную
          </button>
        )}
      </section>
    )
  }

  if (!data) {
    return (
      <section className="sheet">
        <p className="note">Загрузка…</p>
      </section>
    )
  }

  return (
    <section className="sheet cabinet cab-spaced">
      <p className="crumb">{isGuest ? 'общий просмотр' : 'общий вишлист'}</p>
      <h1>{data.title}</h1>
      <p className="note">
        {isGuest
          ? 'Публичный просмотр без входа. Полный функционал — комнаты и свой вишлист — только в Telegram Mini App.'
          : 'Только просмотр. Свой список создаётся в профиле.'}
      </p>
      {data.items?.length === 0 ? (
        <p className="note">Пусто.</p>
      ) : (
        <ul className="mine">
          {data.items.map((gift) => (
            <li key={gift.id}>
              <div className="frame">
                <Photo src={gift.imageUrl} alt={gift.title} />
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
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
