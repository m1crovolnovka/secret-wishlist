import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Header, Pour, ScrollReset } from './components'
import { Cookies, Developers, ErrorScreen, MaintenanceScreen, Privacy, Terms } from './legal'
import { Admin, Cabinet, Colors, Enter, NewRoom, RoomLobby, Rooms, Rules, SharedWishlist } from './pages'
import { useStore } from './store'
import { showBackButton } from './telegram'

export default function App() {
  const { theme, boot } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--paper', theme.paper)
    root.style.setProperty('--ink', theme.ink)
    root.style.setProperty('--blob', theme.blob)
    root.style.setProperty('--blob-2', theme.blob2)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme.blob)
  }, [theme])

  useEffect(() => {
    return showBackButton(() => navigate(-1))
  }, [navigate])

  if (boot.loading) {
    return (
      <main className="boot-screen">
        <p>Загрузка Тайно…</p>
      </main>
    )
  }

  if (boot.errorCode === 'MAINTENANCE') {
    return <MaintenanceScreen message={boot.error} />
  }

  if (boot.error && !boot.guest) {
    return (
      <ErrorScreen
        code={boot.errorCode || 'ошибка'}
        title={boot.errorCode === 'TG_ONLY' ? 'Открой в Telegram' : 'Не удалось войти'}
        message={boot.error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (boot.guest) {
    return (
      <>
        <ScrollReset />
        <main className="guest-main">
          <Routes>
            <Route path="/shared/:token" element={<SharedWishlist guest />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/cookies" element={<Cookies />} />
            <Route path="/legal/developers" element={<Developers />} />
            <Route
              path="*"
              element={
                <ErrorScreen
                  code="просмотр"
                  title="Открой в Telegram"
                  message="Полное приложение работает только как Mini App. Эту страницу открыли без Telegram."
                />
              }
            />
          </Routes>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <ScrollReset />
      <main>
        <Routes>
          <Route path="/" element={<Rooms />} />
          <Route path="/room" element={<RoomLobby />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/colors" element={<Colors />} />
          <Route path="/rooms" element={<Navigate to="/" replace />} />
          <Route path="/rooms/new" element={<NewRoom />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/cabinet" element={<Cabinet />} />
          <Route path="/shared/:token" element={<SharedWishlist />} />
          <Route path="/enter" element={<Enter />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/cookies" element={<Cookies />} />
          <Route path="/legal/developers" element={<Developers />} />
          <Route path="/lists" element={<Navigate to="/colors" replace />} />
          <Route path="/list/:id" element={<Navigate to="/room" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Pour />
    </>
  )
}
