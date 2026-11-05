import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Header, Pour, ScrollReset } from './components'
import { Admin, Cabinet, Colors, Enter, Home, NewRoom, Rooms } from './pages'
import { useStore } from './store'

export default function App() {
  const { theme } = useStore()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--paper', theme.paper)
    root.style.setProperty('--ink', theme.ink)
    root.style.setProperty('--blob', theme.blob)
    root.style.setProperty('--blob-2', theme.blob2)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme.blob)
  }, [theme])

  return (
    <>
      <Header />
      <ScrollReset />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/colors" element={<Colors />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/new" element={<NewRoom />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/cabinet" element={<Cabinet />} />
          <Route path="/enter" element={<Enter />} />
          <Route path="/lists" element={<Navigate to="/colors" replace />} />
          <Route path="/list/:id" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Pour />
    </>
  )
}
