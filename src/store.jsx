import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getToken, setToken } from './api'
import { themeOf, themeToken } from './data'
import { getInitData, getStartParam, haptic, initTelegram } from './telegram'

const Ctx = createContext(null)
const ROOM_KEY = 'taino-room-id'

const PRESENCE_FROM_MODE = {
  ADMIN_PARTICIPATES: 'in',
  ADMIN_NOT_PARTICIPATES: 'out',
  ADMIN_AS_USER: 'guest',
}

const MODE_FROM_PRESENCE = {
  in: 'ADMIN_PARTICIPATES',
  out: 'ADMIN_NOT_PARTICIPATES',
  guest: 'ADMIN_AS_USER',
}

function mapRoomSummary(summary, detail = null) {
  const me = detail?.me
  return {
    id: String(summary.id),
    numericId: summary.id,
    code: summary.code,
    title: summary.title,
    theme: summary.theme,
    phase: summary.phase,
    adminMode: summary.adminMode,
    presence: PRESENCE_FROM_MODE[summary.adminMode] || 'in',
    drawAt: new Date(summary.registrationEndsAt).getTime(),
    giftBy: new Date(summary.deliveryAt).getTime(),
    deliveryPlace: summary.deliveryPlace || '',
    budget: summary.budgetMin === summary.budgetMax ? summary.budgetMin : summary.budgetMax,
    budgetMin: summary.budgetMin,
    budgetMax: summary.budgetMax,
    currency: summary.currency,
    forceDrawn: summary.phase !== 'REGISTRATION',
    drawLocked: summary.drawLocked,
    memberCount: summary.memberCount,
    myRole: summary.myRole,
    participates: summary.participates,
    hasAdminTab: summary.hasAdminTab,
    canTune: summary.canTune,
    people: [],
    formLocked: me?.formLocked,
    canEdit: me?.canEdit,
    editWindowUntil: me?.editWindowUntil,
    memberId: me?.memberId,
  }
}

export function StoreProvider({ children }) {
  const navigate = useNavigate()
  const [boot, setBoot] = useState({ loading: true, error: null })
  const [user, setUser] = useState(null)
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState(() => localStorage.getItem(ROOM_KEY) || '')
  const [form, setForm] = useState(null)
  const [wishlist, setWishlist] = useState({ items: [], canEdit: true })
  const [assignment, setAssignment] = useState(null)
  const [participants, setParticipants] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [fx, setFx] = useState(null)
  const [saveError, setSaveError] = useState(false)
  const mid = useRef(null)
  const roomIdRef = useRef(roomId)
  roomIdRef.current = roomId

  const room = useMemo(
    () => rooms.find((r) => r.id === roomId) || rooms[0] || null,
    [rooms, roomId],
  )
  const theme = themeOf(room?.theme || 'newyear')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const transition = useCallback((token, fn) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      fn?.()
      return
    }
    mid.current = fn || null
    setFx({
      id: Date.now() + Math.random(),
      base: token?.base || '#231f20',
      soft: token?.soft || '#4a4446',
      deep: token?.deep || '#0e0c0d',
    })
  }, [])

  useEffect(() => {
    if (!fx) return undefined
    const cover = setTimeout(() => {
      const fn = mid.current
      mid.current = null
      fn?.()
    }, 760)
    const end = setTimeout(() => setFx(null), 1500)
    return () => {
      clearTimeout(cover)
      clearTimeout(end)
    }
  }, [fx])

  const refreshRoomExtras = useCallback(async (numericId, summary) => {
    if (!numericId) return
    try {
      const [formRes, wishRes, assignRes] = await Promise.all([
        api.form(numericId).catch(() => null),
        api.wishlist(numericId).catch(() => ({ items: [], canEdit: false })),
        api.assignment(numericId).catch(() => null),
      ])
      setForm(formRes)
      setWishlist(wishRes || { items: [], canEdit: false })
      setAssignment(assignRes)

      if (summary?.hasAdminTab) {
        const [people, reqs] = await Promise.all([
          api.adminParticipants(numericId).catch(() => ({ participants: [] })),
          api.adminChangeRequests(numericId).catch(() => ({ items: [] })),
        ])
        setParticipants(people.participants || [])
        setChangeRequests(reqs.items || [])
      } else {
        setParticipants([])
        const mine = await api.changeRequests(numericId).catch(() => ({ items: [] }))
        setChangeRequests(mine.items || [])
      }
    } catch {
      setSaveError(true)
    }
  }, [])

  const loadRooms = useCallback(async (preferredId) => {
    const list = await api.rooms()
    const mapped = []
    for (const summary of list) {
      let detail = null
      try {
        detail = await api.room(summary.id)
      } catch {
        detail = null
      }
      mapped.push(mapRoomSummary(detail?.room || summary, detail))
    }
    setRooms(mapped)
    const preferred = preferredId || localStorage.getItem(ROOM_KEY)
    const next =
      mapped.find((r) => String(r.numericId) === String(preferred) || r.id === preferred)?.id ||
      mapped[0]?.id ||
      ''
    setRoomId(next)
    if (next) localStorage.setItem(ROOM_KEY, next)
    const current = mapped.find((r) => r.id === next)
    if (current) await refreshRoomExtras(current.numericId, current)
    return mapped
  }, [refreshRoomExtras])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Never let Telegram SDK hang the whole Mini App (Desktop viewport.mount bug)
        await Promise.race([
          initTelegram(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
        let initData = getInitData()
        // Dev fallback: paste initData via ?initData= or localStorage
        if (!initData) initData = localStorage.getItem('taino-dev-init-data') || ''
        if (!initData) {
          if (!cancelled) {
            setBoot({
              loading: false,
              error:
                'Открой приложение из Telegram Mini App или сохрани initData в localStorage (taino-dev-init-data).',
            })
          }
          return
        }
        if (!getToken()) {
          const auth = await api.login(initData)
          setToken(auth.accessToken)
          setUser(auth.user)
        } else {
          try {
            const me = await api.me()
            setUser(me)
          } catch {
            const auth = await api.login(initData)
            setToken(auth.accessToken)
            setUser(auth.user)
          }
        }

        const start = getStartParam()
        if (start.startsWith('room_')) {
          try {
            await api.joinRoom(start.slice(5))
          } catch {
            // ignore invalid code
          }
        }

        if (!cancelled) {
          await loadRooms()
          setBoot({ loading: false, error: null })
        }
      } catch (err) {
        const message =
          err?.message === 'Failed to fetch' || err?.name === 'TypeError'
            ? `Не удалось связаться с API (${import.meta.env.VITE_API_BASE_URL || 'URL не задан'}). Проверь VITE_API_BASE_URL и CORS.`
            : err.message || 'Ошибка входа'
        if (!cancelled) setBoot({ loading: false, error: message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadRooms])

  useEffect(() => {
    if (!room?.numericId) return
    refreshRoomExtras(room.numericId, room)
  }, [room?.numericId, room?.phase, refreshRoomExtras])

  const focusRoom = useCallback(
    (id, to = '/') => {
      const target = rooms.find((item) => item.id === id || String(item.numericId) === String(id))
      if (!target) return
      const go = () => {
        setRoomId(target.id)
        localStorage.setItem(ROOM_KEY, target.id)
        navigate(to)
        window.scrollTo(0, 0)
        refreshRoomExtras(target.numericId, target)
      }
      if (roomId === target.id) {
        navigate(to)
        return
      }
      transition(themeToken(target.theme), go)
    },
    [rooms, roomId, navigate, transition, refreshRoomExtras],
  )

  const createRoom = useCallback(
    async (spec) => {
      const body = {
        title: spec.title,
        theme: spec.theme,
        adminMode: MODE_FROM_PRESENCE[spec.presence] || 'ADMIN_PARTICIPATES',
        registrationEndsAt: new Date(spec.drawAt).toISOString(),
        deliveryAt: new Date(spec.giftBy).toISOString(),
        deliveryPlace: spec.deliveryPlace || '',
        budgetMin: Number(spec.budget) || 0,
        budgetMax: Number(spec.budget) || 0,
        currency: spec.currency || 'BYN',
      }
      const detail = await api.createRoom(body)
      haptic('success')
      await loadRooms(detail.room.id)
      transition(themeToken(detail.room.theme), () => {
        navigate('/')
        window.scrollTo(0, 0)
      })
    },
    [loadRooms, navigate, transition],
  )

  const joinByCode = useCallback(
    async (code) => {
      const detail = await api.joinRoom(code.trim())
      haptic('success')
      await loadRooms(detail.room.id)
      navigate('/')
    },
    [loadRooms, navigate],
  )

  const updateRoom = useCallback(
    async (patch) => {
      if (!room?.numericId || !room.canTune) return
      const body = {}
      if (typeof patch.title === 'string') body.title = patch.title
      if (patch.theme) body.theme = patch.theme
      if (typeof patch.presence === 'string') body.adminMode = MODE_FROM_PRESENCE[patch.presence]
      if (typeof patch.drawAt === 'number') body.registrationEndsAt = new Date(patch.drawAt).toISOString()
      if (typeof patch.giftBy === 'number') body.deliveryAt = new Date(patch.giftBy).toISOString()
      if (typeof patch.budget === 'number') {
        body.budgetMin = patch.budget
        body.budgetMax = patch.budget
      }
      if (typeof patch.currency === 'string') body.currency = patch.currency
      if (typeof patch.deliveryPlace === 'string') body.deliveryPlace = patch.deliveryPlace
      await api.updateRoom(room.numericId, body)
      await loadRooms(room.numericId)
    },
    [room, loadRooms],
  )

  const setNote = useCallback(
    async (note) => {
      if (!room?.numericId) return
      const next = await api.updateForm(room.numericId, { note })
      setForm(next)
    },
    [room],
  )

  const addGift = useCallback(
    async (gift) => {
      if (!room?.numericId) return
      let imageId = null
      if (gift.file) {
        const uploaded = await api.uploadImage(room.numericId, gift.file)
        imageId = uploaded.id
        await api.addWishlistItem(room.numericId, {
          type: 'IMAGE',
          title: gift.title,
          imageId,
          url: gift.url || null,
        })
      } else if (gift.url) {
        await api.addWishlistItem(room.numericId, {
          type: 'LINK',
          title: gift.title,
          url: gift.url,
        })
      } else {
        await api.addWishlistItem(room.numericId, {
          type: 'TEXT',
          title: gift.title,
          body: gift.note || '',
        })
      }
      haptic('light')
      const wish = await api.wishlist(room.numericId)
      setWishlist(wish)
    },
    [room],
  )

  const removeGift = useCallback(
    async (giftId) => {
      if (!room?.numericId) return
      await api.removeWishlistItem(room.numericId, giftId)
      const wish = await api.wishlist(room.numericId)
      setWishlist(wish)
    },
    [room],
  )

  const drawNow = useCallback(async () => {
    if (!room?.numericId || !room.hasAdminTab) return
    await api.adminDraw(room.numericId, { redraw: false })
    haptic('success')
    await loadRooms(room.numericId)
  }, [room, loadRooms])

  const undraw = useCallback(async () => {
    if (!room?.numericId || !room.hasAdminTab) return
    await api.adminDraw(room.numericId, { redraw: true })
    await loadRooms(room.numericId)
  }, [room, loadRooms])

  const requestChange = useCallback(
    async (reason, requestedChanges) => {
      if (!room?.numericId) return
      await api.createChangeRequest(room.numericId, { reason, requestedChanges })
      const mine = await api.changeRequests(room.numericId)
      setChangeRequests(mine.items || [])
    },
    [room],
  )

  const decideChange = useCallback(
    async (requestId, approve, adminNote) => {
      if (!room?.numericId) return
      await api.decideChangeRequest(room.numericId, requestId, {
        approve,
        adminNote,
        editWindowHours: 2,
      })
      const reqs = await api.adminChangeRequests(room.numericId)
      setChangeRequests(reqs.items || [])
      await refreshRoomExtras(room.numericId, room)
    },
    [room, refreshRoomExtras],
  )

  const kickMember = useCallback(
    async (memberId) => {
      if (!room?.numericId) return
      await api.kick(room.numericId, memberId)
      const people = await api.adminParticipants(room.numericId)
      setParticipants(people.participants || [])
    },
    [room],
  )

  const logout = useCallback(() => {
    setToken('')
    setUser(null)
    setRooms([])
    setRoomId('')
  }, [])

  const seat = useMemo(() => {
    if (!form && !wishlist) return null
    return {
      pid: room?.memberId,
      name: form?.displayName || user?.firstName || '',
      note: form?.note || '',
      gifts: (wishlist.items || []).map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url || '',
        photo: item.imageUrl || '',
      })),
    }
  }, [form, wishlist, room, user])

  const assignmentView = useMemo(() => {
    if (!assignment?.available) return null
    return {
      name: '',
      note: assignment.note || '',
      gifts: (assignment.wishlist || []).map((item, index) => ({
        id: `${index}-${item.title}`,
        title: item.title,
        url: item.url || '',
        photo: item.imageUrl || '',
      })),
      budgetMin: assignment.budgetMin,
      budgetMax: assignment.budgetMax,
      currency: assignment.currency,
      deliveryAt: assignment.deliveryAt,
      deliveryPlace: assignment.deliveryPlace,
    }
  }, [assignment])

  const isRevealed = Boolean(assignmentView)
  const isAdmin = Boolean(room?.hasAdminTab)
  const canTune = Boolean(room?.canTune)
  const isGlobalAdmin = Boolean(room?.myRole === 'OWNER')

  const value = useMemo(
    () => ({
      boot,
      data: { user, rooms, roomId },
      now,
      room,
      rooms,
      theme,
      fx,
      saveError,
      mosaic: [],
      assignment: assignmentView,
      isRevealed,
      isAdmin,
      isGlobalAdmin,
      canTune,
      seat,
      form,
      wishlist,
      participants,
      changeRequests,
      transition,
      focusRoom,
      enter: () => {},
      logout,
      setNote,
      addGift,
      removeGift,
      patchPerson: () => {},
      addPersonGift: () => {},
      removePersonGift: () => {},
      updateRoom,
      createRoom,
      joinByCode,
      drawNow,
      undraw,
      reset: logout,
      requestChange,
      decideChange,
      kickMember,
      reload: () => loadRooms(room?.numericId),
    }),
    [
      boot,
      user,
      rooms,
      roomId,
      now,
      room,
      theme,
      fx,
      saveError,
      assignmentView,
      isRevealed,
      isAdmin,
      isGlobalAdmin,
      canTune,
      seat,
      form,
      wishlist,
      participants,
      changeRequests,
      transition,
      focusRoom,
      logout,
      setNote,
      addGift,
      removeGift,
      updateRoom,
      createRoom,
      joinByCode,
      drawNow,
      undraw,
      requestChange,
      decideChange,
      kickMember,
      loadRooms,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('store')
  return ctx
}

export function useGo() {
  const navigate = useNavigate()
  const { transition, theme } = useStore()
  return (to, token) =>
    transition(token || themeToken(theme.id), () => {
      navigate(to)
      window.scrollTo(0, 0)
    })
}
