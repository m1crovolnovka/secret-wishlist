function resolveApiBase() {
  const runtime = typeof window !== 'undefined' ? window.__TAINO_API_BASE_URL__ : ''
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  return String(runtime || fromEnv || 'http://localhost:8080').replace(/\/$/, '')
}

export const API_BASE = resolveApiBase()

let token = localStorage.getItem('taino-jwt') || ''

export function setToken(next) {
  token = next || ''
  if (token) localStorage.setItem('taino-jwt', token)
  else localStorage.removeItem('taino-jwt')
}

export function getToken() {
  return token
}

/** Turn relative /api/images/... into an absolute URL for <img src>. */
export function mediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  if (url.startsWith('/')) return `${API_BASE}${url}`
  return `${API_BASE}/${url}`
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const skipAuth = path.startsWith('/api/auth/')
  if (token && !skipAuth) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.code || res.statusText)
    err.code = data?.code
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  login: (initData) =>
    request('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }),
  me: () => request('/api/me'),
  rooms: () => request('/api/rooms'),
  createRoom: (body) => request('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (code) => request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code }) }),
  room: (id) => request(`/api/rooms/${id}`),
  updateRoom: (id, body) => request(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  form: (id) => request(`/api/rooms/${id}/me/form`),
  updateForm: (id, body) => request(`/api/rooms/${id}/me/form`, { method: 'PUT', body: JSON.stringify(body) }),
  wishlist: (id) => request(`/api/rooms/${id}/me/wishlist`),
  addWishlistItem: (id, body) =>
    request(`/api/rooms/${id}/me/wishlist/items`, { method: 'POST', body: JSON.stringify(body) }),
  removeWishlistItem: (id, itemId) =>
    request(`/api/rooms/${id}/me/wishlist/items/${itemId}`, { method: 'DELETE' }),
  copyWishlist: (toRoomId, fromRoomId) =>
    request(`/api/rooms/${toRoomId}/me/wishlist/copy`, {
      method: 'POST',
      body: JSON.stringify({ fromRoomId }),
    }),
  uploadImage: async (roomId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request(`/api/rooms/${roomId}/me/images`, { method: 'POST', body: fd })
  },
  assignment: (id) => request(`/api/rooms/${id}/assignment`),
  leaveRoom: (id) => request(`/api/rooms/${id}/leave`, { method: 'POST' }),
  changeRequests: (id) => request(`/api/rooms/${id}/me/change-requests`),
  createChangeRequest: (id, body) =>
    request(`/api/rooms/${id}/me/change-requests`, { method: 'POST', body: JSON.stringify(body) }),
  adminParticipants: (id) => request(`/api/admin/rooms/${id}/participants`),
  adminForm: (roomId, memberId) => request(`/api/admin/rooms/${roomId}/members/${memberId}/form`),
  adminWishlist: (roomId, memberId) =>
    request(`/api/admin/rooms/${roomId}/members/${memberId}/wishlist`),
  adminAddWishlistItem: (roomId, memberId, body) =>
    request(`/api/admin/rooms/${roomId}/members/${memberId}/wishlist/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  adminRemoveWishlistItem: (roomId, memberId, itemId) =>
    request(`/api/admin/rooms/${roomId}/members/${memberId}/wishlist/items/${itemId}`, {
      method: 'DELETE',
    }),
  adminChangeRequests: (id) => request(`/api/admin/rooms/${id}/change-requests`),
  decideChangeRequest: (roomId, requestId, body) =>
    request(`/api/admin/rooms/${roomId}/change-requests/${requestId}/decide`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  adminDraw: (id, { redraw = false } = {}) =>
    request(`/api/admin/rooms/${id}/draw?confirm=true&redraw=${redraw}`, { method: 'POST' }),
  kick: (roomId, memberId) =>
    request(`/api/admin/rooms/${roomId}/members/${memberId}/kick`, { method: 'POST' }),
}
