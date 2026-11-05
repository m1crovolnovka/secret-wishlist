import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  assignedList,
  canManageRoom,
  closeDraw,
  colorById,
  composeRoom,
  drawRoom,
  ensureSeat,
  fresh,
  isAdminUser,
  isDrawnRoom,
  peopleColors,
  readBudget,
  readCurrency,
  themeOf,
  themeToken,
  uid,
  withCount,
  withTheme,
} from './data'

const KEY = 'taino-demo-v4'
const Ctx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.rooms) || parsed.rooms.length === 0) return null
    const rooms = parsed.rooms
      .filter((room) => room && Array.isArray(room.people) && room.people.length && room.theme)
      .map((room) => ({
        ...room,
        forceDrawn: Boolean(room.forceDrawn),
        presence: room.presence === 'out' || room.presence === 'guest' ? room.presence : 'in',
        budget: readBudget(room.budget),
        currency: readCurrency(room.currency),
        people: room.people.filter(Boolean).map((person) => ({
          ...person,
          email: String(person.email || '').trim().toLowerCase(),
          demo: Boolean(person.demo),
          gifts: person.gifts || [],
          note: person.note || '',
          assignedPid: person.assignedPid || null,
        })),
      }))
    if (!rooms.length) return null
    const roomId = rooms.some((room) => room.id === parsed.roomId) ? parsed.roomId : rooms[0].id
    return { user: parsed.user || null, roomId, rooms }
  } catch {
    return null
  }
}

function drawnMap(rooms, now = Date.now()) {
  const map = {}
  for (const room of rooms) {
    if (isDrawnRoom(room, now)) map[room.id] = true
  }
  return map
}

export function StoreProvider({ children }) {
  const navigate = useNavigate()
  const initial = useRef(load() || fresh()).current
  const [data, setData] = useState(initial)
  const [now, setNow] = useState(() => Date.now())
  const [revealed, setRevealed] = useState(() => drawnMap(initial.rooms))
  const [fx, setFx] = useState(null)
  const [saveError, setSaveError] = useState(false)
  const mid = useRef(null)
  const pouring = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }, [data])

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

  const room = useMemo(
    () => data.rooms.find((item) => item.id === data.roomId) || data.rooms[0],
    [data.rooms, data.roomId],
  )
  const theme = themeOf(room?.theme)
  const email = data.user?.email?.trim().toLowerCase() || ''
  const assignment = useMemo(() => assignedList(room, email), [room, email])
  const seat = useMemo(
    () => room?.people?.find((person) => person.email === email) || null,
    [room, email],
  )
  const mosaic = useMemo(() => (room ? peopleColors(room) : []), [room])
  const isRevealed = Boolean(room && revealed[room.id] && assignment)
  const isGlobalAdmin = isAdminUser(data.user)
  const isAdmin = canManageRoom(data.user, room)

  useEffect(() => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId) || dataRef.current.rooms[0]
    const viewer = dataRef.current.user?.email?.trim().toLowerCase()
    if (!current || !viewer || !isDrawnRoom(current, now)) return undefined
    if (revealed[current.id]) return undefined
    const me = current.people.find((person) => person.email === viewer)
    const target = me && current.people.find((person) => person.pid === me.assignedPid)
    if (!target || pouring.current) return undefined
    pouring.current = true
    const color = colorById(current.theme, target.colorId)
    transition(color, () => {
      pouring.current = false
      setRevealed((prev) => ({ ...prev, [current.id]: true }))
      navigate('/')
      window.scrollTo(0, 0)
    })
    return undefined
  }, [now, data.roomId, data.rooms, data.user, revealed, transition, navigate])

  useEffect(() => {
    if (!data.user) return
    setData((prev) => {
      const current = prev.rooms.find((item) => item.id === prev.roomId)
      if (!current) return prev
      const next = ensureSeat(current, prev.user)
      if (next === current) return prev
      return {
        ...prev,
        rooms: prev.rooms.map((item) => (item.id === current.id ? next : item)),
      }
    })
  }, [data.user, data.roomId])

  const focusRoom = useCallback(
    (id, to = '/') => {
      const target = dataRef.current.rooms.find((item) => item.id === id)
      if (!target) return
      const same = dataRef.current.roomId === id
      const go = () => {
        setData((prev) => ({ ...prev, roomId: id }))
        navigate(to)
        window.scrollTo(0, 0)
      }
      if (same) {
        navigate(to)
        window.scrollTo(0, 0)
        return
      }
      transition(themeToken(target.theme), go)
    },
    [navigate, transition],
  )

  const enter = useCallback((name, email) => {
    setData((prev) => ({
      ...prev,
      user: { name: name.trim(), email: email.trim().toLowerCase() },
    }))
  }, [])

  const logout = useCallback(() => {
    setData((prev) => ({ ...prev, user: null }))
  }, [])

  const mapSeat = useCallback((roomId, user, fn) => {
    const mail = user?.email?.trim().toLowerCase()
    if (!mail) return
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) => {
        if (item.id !== roomId) return item
        const seated = ensureSeat(item, user)
        return {
          ...seated,
          people: seated.people.map((person) => (person.email === mail ? fn(person) : person)),
        }
      }),
    }))
  }, [])

  const setNote = useCallback((myNote) => {
    const user = dataRef.current.user
    if (isAdminUser(user) && dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)?.presence === 'out') return
    mapSeat(dataRef.current.roomId, user, (person) => ({ ...person, note: myNote }))
  }, [mapSeat])

  const addGift = useCallback((gift) => {
    const user = dataRef.current.user
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!user || (isAdminUser(user) && current?.presence === 'out')) return
    mapSeat(dataRef.current.roomId, user, (person) => ({
      ...person,
      gifts: [...person.gifts, { ...gift, id: uid() }].slice(0, 12),
    }))
  }, [mapSeat])

  const removeGift = useCallback((giftId) => {
    const user = dataRef.current.user
    mapSeat(dataRef.current.roomId, user, (person) => ({
      ...person,
      gifts: person.gifts.filter((gift) => gift.id !== giftId),
    }))
  }, [mapSeat])

  const patchPerson = useCallback((pid, patch) => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!canManageRoom(dataRef.current.user, current)) return
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) =>
        item.id === current.id
          ? {
              ...item,
              people: item.people.map((person) => (person.pid === pid ? { ...person, ...patch, pid: person.pid, email: person.email } : person)),
            }
          : item,
      ),
    }))
  }, [])

  const addPersonGift = useCallback((pid, gift) => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!canManageRoom(dataRef.current.user, current)) return
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) =>
        item.id === current.id
          ? {
              ...item,
              people: item.people.map((person) =>
                person.pid === pid ? { ...person, gifts: [...person.gifts, { ...gift, id: uid() }].slice(0, 12) } : person,
              ),
            }
          : item,
      ),
    }))
  }, [])

  const removePersonGift = useCallback((pid, giftId) => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!canManageRoom(dataRef.current.user, current)) return
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) =>
        item.id === current.id
          ? {
              ...item,
              people: item.people.map((person) =>
                person.pid === pid ? { ...person, gifts: person.gifts.filter((gift) => gift.id !== giftId) } : person,
              ),
            }
          : item,
      ),
    }))
  }, [])

  const updateRoom = useCallback((patch) => {
    const id = dataRef.current.roomId
    const current = dataRef.current.rooms.find((item) => item.id === id)
    if (!canManageRoom(dataRef.current.user, current)) return
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) => {
        if (item.id !== id) return item
        let next = item
        if (patch.theme && patch.theme !== item.theme) next = withTheme(next, patch.theme)
        if (typeof patch.count === 'number' && !isDrawnRoom(item)) next = withCount(next, patch.count)
        if (typeof patch.title === 'string') next = { ...next, title: patch.title }
        if (typeof patch.budget === 'number') next = { ...next, budget: readBudget(patch.budget) }
        if (typeof patch.currency === 'string') next = { ...next, currency: readCurrency(patch.currency) }
        if (typeof patch.drawAt === 'number') next = { ...next, drawAt: patch.drawAt }
        if (typeof patch.giftBy === 'number') next = { ...next, giftBy: patch.giftBy }
        if (next.giftBy <= next.drawAt) next = { ...next, giftBy: next.drawAt + 86400000 }
        if (typeof patch.drawAt === 'number' && patch.drawAt > Date.now()) next = closeDraw(next, patch.drawAt)
        return next
      }),
    }))
    if (typeof patch.drawAt === 'number' && patch.drawAt > Date.now()) {
      setRevealed((prev) => ({ ...prev, [id]: false }))
    }
  }, [])

  const createRoom = useCallback(
    (spec) => {
      if (!isAdminUser(dataRef.current.user)) return
      const id = uid()
      const roomNext = composeRoom({
        ...spec,
        id,
        forceDrawn: false,
        myGifts: [],
        myNote: '',
        giftShift: Math.floor(Math.random() * 8),
        createdAt: Date.now(),
      })
      transition(themeToken(roomNext.theme), () => {
        setData((prev) => ({
          ...prev,
          roomId: roomNext.id,
          rooms: [roomNext, ...prev.rooms],
        }))
        navigate('/')
        window.scrollTo(0, 0)
      })
    },
    [navigate, transition],
  )

  const drawNow = useCallback(() => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!canManageRoom(dataRef.current.user, current) || isDrawnRoom(current) || current.people.length < 2) return
    const next = drawRoom(current)
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) => (item.id === current.id ? next : item)),
    }))
  }, [])

  const undraw = useCallback(() => {
    const current = dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)
    if (!canManageRoom(dataRef.current.user, current)) return
    pouring.current = false
    setRevealed((prev) => ({ ...prev, [current.id]: false }))
    setData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((item) => {
        if (item.id !== current.id) return item
        const drawAt = item.drawAt > Date.now() ? item.drawAt : Date.now() + 3 * 86400000
        return closeDraw(item, drawAt)
      }),
    }))
  }, [])

  const reset = useCallback(() => {
    const token = themeToken(dataRef.current.rooms.find((item) => item.id === dataRef.current.roomId)?.theme)
    transition(token, () => {
      const next = fresh()
      setData(next)
      setRevealed(drawnMap(next.rooms))
      pouring.current = false
      navigate('/')
      window.scrollTo(0, 0)
    })
  }, [navigate, transition])

  const value = useMemo(
    () => ({
      data,
      now,
      room,
      rooms: data.rooms,
      theme,
      fx,
      saveError,
      mosaic,
      assignment,
      isRevealed,
      isAdmin,
      isGlobalAdmin,
      seat,
      transition,
      focusRoom,
      enter,
      logout,
      setNote,
      addGift,
      removeGift,
      patchPerson,
      addPersonGift,
      removePersonGift,
      updateRoom,
      createRoom,
      drawNow,
      undraw,
      reset,
    }),
    [
      data,
      now,
      room,
      theme,
      fx,
      saveError,
      mosaic,
      assignment,
      isRevealed,
      isAdmin,
      isGlobalAdmin,
      seat,
      transition,
      focusRoom,
      enter,
      logout,
      setNote,
      addGift,
      removeGift,
      patchPerson,
      addPersonGift,
      removePersonGift,
      updateRoom,
      createRoom,
      drawNow,
      undraw,
      reset,
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
