const shop = (q) =>
  `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(q)}`

export const MIN_PEOPLE = 3

export const ADMIN = { name: 'qqq', email: 'qqq@qqq' }

export const PRESENCE = [
  { id: 'in', title: 'Админ участвует', note: 'Ты в раздаче и ведёшь комнату.' },
  { id: 'out', title: 'Админ не участвует', note: 'Только ведёшь. Свой список тебе не выпадет.' },
  { id: 'guest', title: 'Админ как участник', note: 'Ты в раздаче, вишлисты скрыты. Роль можно сменить.' },
]

export const CURRENCIES = [
  { id: 'BYN', label: 'бел. рубль', short: 'Br' },
  { id: 'RUB', label: 'рос. рубль', short: '₽' },
  { id: 'USD', label: 'доллар', short: '$' },
  { id: 'EUR', label: 'евро', short: '€' },
]

export const DEFAULT_CURRENCY = 'BYN'

const DEMO_NAMES = [
  'Аня', 'Боря', 'Вера', 'Глеб', 'Даша', 'Егор', 'Женя', 'Ира', 'Кира', 'Лёва',
  'Маша', 'Ника', 'Оля', 'Петя', 'Рита', 'Сева', 'Тая', 'Федя', 'Юля', 'Яна',
]

export function isAdminUser(user) {
  if (!user?.name || !user?.email) return false
  return user.name.trim().toLowerCase() === ADMIN.name && user.email.trim().toLowerCase() === ADMIN.email
}

export function canManageRoom(user, room) {
  return Boolean(room && isAdminUser(user) && room.presence !== 'guest')
}

export function canTuneRoom(user, room) {
  return Boolean(room && isAdminUser(user))
}

export function readPresence(value) {
  return PRESENCE.some((item) => item.id === value) ? value : 'in'
}

export function roomMark(room, user) {
  if (!isAdminUser(user)) return 'участник'
  if (room?.presence === 'out') return 'админ · вне раздачи'
  if (room?.presence === 'guest') return 'как участник'
  return 'админ'
}

export function readCurrency(value) {
  const code = String(value || '').trim().toUpperCase()
  return CURRENCIES.some((item) => item.id === code) ? code : DEFAULT_CURRENCY
}

export function currencyOf(value) {
  const code = readCurrency(value)
  return CURRENCIES.find((item) => item.id === code) || CURRENCIES[0]
}

export function money(value, currency = DEFAULT_CURRENCY) {
  const amount = Math.round(Number(value) || 0)
  if (amount <= 0) return ''
  const code = readCurrency(currency)
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('ru-RU').format(amount)} ${currencyOf(code).short}`
  }
}

export function readBudget(value) {
  const amount = Math.round(Number(value))
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.min(amount, 10000000)
}

const EXTRA_NAMES = [
  'Лагуна', 'Медь', 'Лён', 'Графит', 'Флокс', 'Янтарь', 'Черника', 'Пепел',
  'Кора', 'Небо', 'Молоко', 'Ржавчина', 'Шалфей', 'Уголь', 'Персик', 'Индиго',
  'Пыль', 'Вишня', 'Охра', 'Мох', 'Серебро', 'Глина', 'Лаванда', 'Сосна',
  'Кварц', 'Кармин', 'Олива', 'Туман', 'Сахар', 'Ночь', 'Пшеница', 'Бархат',
]

export const INK = {
  base: '#231f20',
  soft: '#4a4446',
  deep: '#0e0c0d',
  ink: '#f4efe8',
}

export const THEMES = {
  newyear: {
    id: 'newyear',
    label: 'Новый год',
    particle: 'snow',
    particleLabel: 'снег',
    paper: '#f4f7fb',
    ink: '#1a2832',
    blob: '#d5e4ef',
    blob2: '#f6c4cf',
    deep: '#7f9aaf',
    band: '#d5e4ef',
  },
  autumn: {
    id: 'autumn',
    label: 'Осень',
    particle: 'rain',
    particleLabel: 'дождь',
    paper: '#f7f1e8',
    ink: '#2a2118',
    blob: '#e7b089',
    blob2: '#c45c38',
    deep: '#6b3e32',
    band: '#e7b089',
  },
  birthday: {
    id: 'birthday',
    label: 'День рождения',
    particle: 'confetti',
    particleLabel: 'конфетти',
    paper: '#fff7f8',
    ink: '#2a1218',
    blob: '#ffd0e0',
    blob2: '#ffe08a',
    deep: '#c43b62',
    band: '#ffd0e0',
  },
}

const tone = (id, name, note, base, soft, deep, ink) => ({
  id,
  name,
  note,
  base,
  soft,
  deep,
  ink,
})

export const PALETTES = {
  newyear: [
    tone('ny-frost', 'Иней', 'Ясные вещи на холодном свете.', '#d7e6f0', '#f4f8fb', '#b7cddd', '#1a2832'),
    tone('ny-pine', 'Хвоя', 'Тихому дому и длинным вечерам.', '#1e4a38', '#3e7a60', '#0f2c21', '#f3efe4'),
    tone('ny-midnight', 'Полночь', 'Тёмное, точное, без лишнего блеска.', '#1b2432', '#44526b', '#0c1016', '#f3eee6'),
    tone('ny-berry', 'Клюква', 'Яркое, чтобы зима не серела.', '#8e2434', '#c45a68', '#5c1422', '#fff4f2'),
    tone('ny-snow', 'Снег', 'Лёгкое, почти невесомое.', '#e7eef2', '#ffffff', '#c5d4de', '#1c2430'),
    tone('ny-plum', 'Слива', 'Мягкая роскошь без повода.', '#5c2d55', '#8a4d82', '#3a1a36', '#f8f0f4'),
    tone('ny-spark', 'Искра', 'Тёплое золото к длинному вечеру.', '#f0d78c', '#fff6d8', '#e2b84a', '#2a2112'),
    tone('ny-north', 'Север', 'Спокойный цвет, как вода подо льдом.', '#2f5d73', '#6f9aab', '#1a3846', '#f3f7f8'),
    tone('ny-cocoa', 'Какао', 'Сладкое и медленное.', '#6b3e32', '#a56a55', '#3d221b', '#f8f1ea'),
    tone('ny-dawn', 'Заря', 'Нежный тон, близко к коже.', '#f3c1cb', '#ffe4ea', '#e7a8b8', '#2a1210'),
  ],
  autumn: [
    tone('au-pumpkin', 'Тыква', 'Тёплое, круглое, к столу.', '#e07a3d', '#f3c09a', '#b85a22', '#2a140c'),
    tone('au-moss', 'Мох', 'Для прогулок и тихих полок.', '#4f5d34', '#8a9a62', '#2c361c', '#f4f1e4'),
    tone('au-chestnut', 'Каштан', 'Глубокий домашний цвет.', '#6b3e32', '#a56a55', '#3d221b', '#f8f1ea'),
    tone('au-fog', 'Туман', 'Мягкие вещи без острых углов.', '#d9d0c5', '#f3efe8', '#b7aea3', '#2a241e'),
    tone('au-grape', 'Виноград', 'Вечерний, чуть торжественный.', '#6a3050', '#a85d84', '#3e1a2e', '#f8eef3'),
    tone('au-honey', 'Мёд', 'Сладкое и тягучее.', '#e2b84a', '#ffe3a3', '#c4962a', '#2a2112'),
    tone('au-smoke', 'Дым', 'Спокойные предметы на каждый день.', '#8d847c', '#c9c2ba', '#5c564f', '#1c1917'),
    tone('au-rowan', 'Рябина', 'Яркая точка в сером дне.', '#a33b32', '#e07a72', '#6e221c', '#fff4f2'),
    tone('au-olive', 'Олива', 'Зелень, которая не кричит.', '#3e4a38', '#7d8a72', '#232b20', '#f3f6ef'),
    tone('au-sand', 'Песок', 'Светлое, чтобы держать в руках.', '#efd7b0', '#fff6e8', '#d7b88a', '#2a2112'),
  ],
  birthday: [
    tone('bd-sugar', 'Сахар', 'Сладкое и праздничное.', '#ff8fab', '#ffd0dc', '#f06292', '#2a1218'),
    tone('bd-lemon', 'Лимон', 'Кислое, весёлое, светлое.', '#ffe56b', '#fff6c2', '#f0c93a', '#2a2112'),
    tone('bd-sky', 'Небо', 'Лёгкое, как открытка.', '#7ec8f0', '#e5f6ff', '#4aa3d8', '#102430'),
    tone('bd-mint', 'Мята', 'Свежее, почти летнее.', '#5dbe8a', '#d8f5e6', '#2e8f62', '#102218'),
    tone('bd-lilac', 'Сирень', 'Мягкий праздник без крика.', '#b48cc8', '#f3e6f8', '#8a62a4', '#241628'),
    tone('bd-coral', 'Коралл', 'Тёплое и близкое.', '#ff6f61', '#ffc7c0', '#e14d40', '#2a1210'),
    tone('bd-ink', 'Чернила', 'Точное, для того, кто пишет.', '#2c2c54', '#55557a', '#16162e', '#f4f1ea'),
    tone('bd-peach', 'Персик', 'Нежное, к чаю.', '#ffcba4', '#ffe8d6', '#f0a87a', '#2a1810'),
    tone('bd-lime', 'Лайм', 'Звонкое и молодое.', '#c5d63a', '#eef6b0', '#9aaf22', '#1c2408'),
    tone('bd-fuchsia', 'Фуксия', 'Чтобы праздник было видно.', '#c2185b', '#f48fb1', '#880e4f', '#fff0f6'),
  ],
}

const gift = (id, title, photo, query) => ({
  id,
  title,
  photo,
  url: shop(query || title),
})

const BANK = [
  gift('g1', 'Беспроводные наушники', '/gifts/coral-1.jpg', 'беспроводные наушники'),
  gift('g2', 'Сыворотка в тёмном стекле', '/gifts/coral-2.jpg', 'сыворотка для лица'),
  gift('g3', 'Тёплый шарф', '/gifts/coral-3.jpg', 'шерстяной шарф'),
  gift('g4', 'Белая кружка', '/gifts/pine-1.jpg', 'керамическая кружка'),
  gift('g5', 'Сборник стихов', '/gifts/pine-2.jpg', 'сборник стихов'),
  gift('g6', 'Хлопковая подушка', '/gifts/pine-3.jpg', 'подушка хлопок'),
  gift('g7', 'Коробка конфет', '/gifts/amber-1.jpg', 'коробка конфет'),
  gift('g8', 'Бокал для холодного чая', '/gifts/amber-2.jpg', 'бокал для напитков'),
  gift('g9', 'Виниловая пластинка', '/gifts/amber-3.jpg', 'виниловая пластинка'),
  gift('g10', 'Наручные часы', '/gifts/frost-1.jpg', 'наручные часы'),
  gift('g11', 'Моментальная камера', '/gifts/frost-2.jpg', 'моментальная камера'),
  gift('g12', 'Городской рюкзак', '/gifts/frost-3.jpg', 'городской рюкзак'),
  gift('g13', 'Флакон духов', '/gifts/plum-1.jpg', 'духи'),
  gift('g14', 'Крем для умывания', '/gifts/plum-2.jpg', 'крем для умывания'),
  gift('g15', 'Деревянные шахматы', '/gifts/plum-3.jpg', 'деревянные шахматы'),
  gift('g16', 'Красные кеды', '/gifts/berry-1.jpg', 'красные кеды'),
  gift('g17', 'Бутылка для воды', '/gifts/berry-2.jpg', 'бутылка для воды'),
  gift('g18', 'Торшер', '/gifts/berry-3.jpg', 'торшер'),
]

export const SAMPLES = BANK.slice(0, 8).map((item) => ({ src: item.photo, title: item.title }))

export function takeGifts(shift = 0) {
  return [0, 1, 2].map((step) => {
    const item = BANK[(shift + step) % BANK.length]
    return { ...item, id: `${item.id}-s${shift}-n${step}` }
  })
}

export function themeOf(id) {
  return THEMES[id] || THEMES.newyear
}

export function themeToken(id) {
  const theme = themeOf(id)
  return { base: theme.blob, soft: theme.blob2, deep: theme.deep, ink: theme.ink }
}

export function palette(theme) {
  return PALETTES[theme] || PALETTES.newyear
}

function hsl(h, s, l) {
  const sat = s / 100
  const lig = l / 100
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const channel = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * channel).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function colorAt(theme, index) {
  const named = palette(theme)
  if (index < named.length) return named[index]
  const n = index - named.length
  const hue0 = theme === 'autumn' ? 26 : theme === 'birthday' ? 332 : 206
  const hue = (hue0 + n * 137.508) % 360
  const light = 28 + (n % 5) * 12
  const sat = 36 + (n % 4) * 12
  const pool = EXTRA_NAMES.filter((item) => !named.some((color) => color.name === item))
  const word = pool[n % pool.length]
  const turn = Math.floor(n / pool.length)
  return {
    id: `${theme}-n${index}`,
    name: turn ? `${word} ${turn + 1}` : word,
    note: 'Тихий список без подписи.',
    base: hsl(hue, sat, light),
    soft: hsl(hue, Math.max(16, sat - 18), Math.min(94, light + 30)),
    deep: hsl(hue, Math.min(72, sat + 6), Math.max(12, light - 16)),
    ink: light > 58 ? '#1c1917' : '#f6f1ea',
  }
}

export function colorById(theme, id) {
  const named = palette(theme).find((item) => item.id === id)
  if (named) return named
  const match = /-n(\d+)$/.exec(id || '')
  if (match) return colorAt(theme, Number(match[1]))
  return palette(theme)[0]
}

export function peopleCount(count) {
  const n10 = count % 10
  const n100 = count % 100
  if (n10 === 1 && n100 !== 11) return `${count} участник`
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${count} участника`
  return `${count} участников`
}

function demoName(index) {
  const word = DEMO_NAMES[index % DEMO_NAMES.length]
  const turn = Math.floor(index / DEMO_NAMES.length)
  return turn ? `${word} ${turn + 1}` : word
}

function blankPerson({ pid, name, email, demo, gifts, note, colorId }) {
  return {
    pid,
    name,
    email: String(email || '').trim().toLowerCase(),
    demo: Boolean(demo),
    gifts: gifts || [],
    note: note || '',
    assignedPid: null,
    colorId,
  }
}

export function peopleColors(room) {
  return (room?.people || []).map((person) => {
    const color = colorById(room.theme, person.colorId)
    return {
      key: person.pid,
      owner: person.name,
      email: person.email,
      name: color.name,
      base: color.base,
      ink: color.ink,
      demo: person.demo,
    }
  })
}

export function assignedList(room, email) {
  if (!room || !email || !isDrawnRoom(room)) return null
  const me = room.people.find((person) => person.email === email.trim().toLowerCase())
  if (!me?.assignedPid) return null
  const person = room.people.find((item) => item.pid === me.assignedPid)
  if (!person || person.pid === me.pid) return null
  const color = colorById(room.theme, person.colorId)
  return {
    id: person.pid,
    name: color.name,
    note: person.note || color.note,
    base: color.base,
    soft: color.soft,
    deep: color.deep,
    ink: color.ink,
    gifts: person.gifts || [],
  }
}

function assignMissing(room) {
  const people = room.people.map((person) => {
    const current = room.people.find((item) => item.pid === person.assignedPid)
    if (current && current.pid !== person.pid) return person
    const pool = room.people.filter((item) => item.pid !== person.pid)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    return { ...person, assignedPid: pick ? pick.pid : null }
  })
  return { ...room, people }
}

export function ensureSeat(room, user) {
  if (!room || !user?.email || !user?.name) return room
  const email = user.email.trim().toLowerCase()
  const name = user.name.trim()
  if (!email || !name) return room
  if (isAdminUser({ name, email }) && room.presence === 'out') return room
  const index = room.people.findIndex((person) => person.email === email)
  if (index >= 0) {
    if (room.people[index].name === name) return room
    return {
      ...room,
      people: room.people.map((person, i) => (i === index ? { ...person, name } : person)),
    }
  }
  const person = blankPerson({
    pid: uid(),
    name,
    email,
    demo: false,
    colorId: colorAt(room.theme, room.people.length).id,
  })
  let next = { ...room, people: [...room.people, person] }
  if (isDrawnRoom(next)) next = assignMissing(next)
  return next
}

export function withPresence(room, presence) {
  const next = readPresence(presence)
  if (room.presence === next) return room
  let people = room.people.slice()
  const index = people.findIndex((person) => person.email === ADMIN.email)

  if (next === 'out') {
    if (index >= 0) {
      const removed = people[index]
      people = people.filter((_, i) => i !== index).map((person) => ({
        ...person,
        assignedPid: person.assignedPid === removed.pid ? null : person.assignedPid,
      }))
      if (isDrawnRoom(room) && people.length > 1) {
        people = assignMissing({ ...room, people }).people
      }
    }
  } else if (index < 0) {
    people = [
      ...people,
      blankPerson({
        pid: `host-${room.id}`,
        name: ADMIN.name,
        email: ADMIN.email,
        demo: false,
        colorId: colorAt(room.theme, people.length).id,
      }),
    ]
    if (isDrawnRoom(room) && people.length > 1) {
      people = assignMissing({ ...room, people }).people
    }
  }

  return { ...room, presence: next, people }
}

export function drawRoom(room) {
  const people = room.people.map((person) => {
    const pool = room.people.filter((other) => other.pid !== person.pid)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    return { ...person, assignedPid: pick ? pick.pid : null }
  })
  return { ...room, people, forceDrawn: true }
}

export function closeDraw(room, drawAt) {
  return {
    ...room,
    forceDrawn: false,
    drawAt,
    people: room.people.map((person) => ({ ...person, assignedPid: null })),
  }
}

export function isDrawnRoom(room, now = Date.now()) {
  return Boolean(room && (room.forceDrawn || now >= room.drawAt))
}

export function withCount(room, count) {
  const size = Math.max(MIN_PEOPLE, Math.round(Number(count)) || MIN_PEOPLE)
  const fixed = room.people.filter((person) => !person.demo)
  const demos = room.people.filter((person) => person.demo)
  const people = [...fixed]
  let reused = 0
  while (people.length < size) {
    if (reused < demos.length) {
      people.push(demos[reused])
      reused += 1
    } else {
      const n = people.length
      people.push(
        blankPerson({
          pid: uid(),
          name: demoName(n),
          email: `demo-${room.id}-${n}-${uid().slice(0, 6)}@taino.local`,
          demo: true,
          gifts: takeGifts(n + 2),
          colorId: colorAt(room.theme, n).id,
        }),
      )
    }
  }
  while (people.length > size) {
    const index = people.findLastIndex((person) => person.demo)
    if (index < 0) break
    people.splice(index, 1)
  }
  return { ...room, people }
}

export function withTheme(room, theme) {
  return {
    ...room,
    theme,
    people: room.people.map((person, index) => ({
      ...person,
      colorId: colorAt(theme, index).id,
    })),
  }
}

export function composeRoom(spec) {
  const id = spec.id || uid()
  const theme = THEMES[spec.theme] ? spec.theme : 'newyear'
  const presence = PRESENCE.some((item) => item.id === spec.presence) ? spec.presence : 'in'
  const size = Math.max(MIN_PEOPLE, Math.round(Number(spec.count)) || 6)
  const people = []
  if (presence !== 'out') {
    people.push(
      blankPerson({
        pid: `host-${id}`,
        name: ADMIN.name,
        email: ADMIN.email,
        demo: false,
        gifts: spec.myGifts || [],
        note: spec.myNote || '',
        colorId: colorAt(theme, 0).id,
      }),
    )
  }
  let n = 0
  while (people.length < size) {
    people.push(
      blankPerson({
        pid: `m-${id}-${n}`,
        name: demoName(n),
        email: `demo-${id}-${n}@taino.local`,
        demo: true,
        gifts: takeGifts((spec.giftShift || 0) + (n + 1) * 2),
        colorId: colorAt(theme, people.length).id,
      }),
    )
    n += 1
  }
  const drawAt = spec.drawAt
  const giftBy = spec.giftBy > drawAt ? spec.giftBy : drawAt + 86400000
  const seated = spec.forceDrawn
    ? people.map((person, index) => ({
        ...person,
        assignedPid: people[(index + 1) % people.length].pid,
      }))
    : people
  return {
    id,
    title: spec.title,
    theme,
    presence,
    budget: readBudget(spec.budget ?? 100),
    currency: readCurrency(spec.currency),
    drawAt,
    giftBy,
    forceDrawn: Boolean(spec.forceDrawn),
    people: seated,
    createdAt: spec.createdAt || Date.now(),
  }
}

export function formatWhen(ts) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export function toInput(ts) {
  const date = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromInput(value) {
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function uid() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}

export function fresh() {
  const now = Date.now()
  const day = 86400000
  const office = composeRoom({
    id: 'room-office',
    title: 'Офис',
    theme: 'newyear',
    presence: 'in',
    budget: 100,
    currency: 'BYN',
    count: 8,
    drawAt: now + 18 * day,
    giftBy: now + 32 * day,
    giftShift: 0,
    myGifts: [
      gift('my-scarf', 'Тёплый шарф', '/gifts/coral-3.jpg', 'шерстяной шарф'),
      gift('my-mug', 'Белая кружка', '/gifts/pine-1.jpg', 'керамическая кружка'),
    ],
    myNote: 'тихое и тёплое, без открыток',
    createdAt: now - day,
  })
  const study = composeRoom({
    id: 'room-study',
    title: 'Учёба',
    theme: 'autumn',
    presence: 'out',
    budget: 80,
    currency: 'BYN',
    count: 5,
    drawAt: now + 25 * day,
    giftBy: now + 40 * day,
    giftShift: 5,
    createdAt: now - 20 * day,
  })
  const birthday = composeRoom({
    id: 'room-birthday',
    title: 'Именины',
    theme: 'birthday',
    presence: 'guest',
    budget: 150,
    currency: 'BYN',
    count: 6,
    drawAt: now - 2 * day,
    giftBy: now + 6 * day,
    forceDrawn: true,
    assign: 2,
    giftShift: 8,
    myGifts: [gift('my-scent', 'Флакон духов', '/gifts/plum-1.jpg', 'духи')],
    myNote: 'что-нибудь красивое',
    createdAt: now - 4 * day,
  })
  return {
    user: null,
    roomId: office.id,
    rooms: [office, birthday, study],
  }
}
