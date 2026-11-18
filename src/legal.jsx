import { useNavigate } from 'react-router-dom'
import { useTitle } from './components'
import { useGo } from './store'

function LegalShell({ crumb, title, children }) {
  const go = useGo()
  const navigate = useNavigate()
  useTitle(title.toLowerCase())
  return (
    <section className="sheet legal-page">
      <p className="crumb">{crumb}</p>
      <h1>{title}</h1>
      <div className="legal-body">{children}</div>
      <button className="text-btn" type="button" onClick={() => navigate(-1)}>
        Назад
      </button>
      <button className="text-btn" type="button" onClick={() => go('/')}>
        На главную
      </button>
    </section>
  )
}

export function Privacy() {
  return (
    <LegalShell crumb="юридическое" title="Политика конфиденциальности">
      <p>
        Тайно обрабатывает данные, необходимые для работы Mini App: идентификатор Telegram, имя и username
        (хранятся в зашифрованном виде), состав комнат, вишлисты и служебные журналы действий.
      </p>
      <p>
        Данные не продаются. Доступ к чужим вишлистам после раздачи — только у назначенного дарителя и в рамках
        выбран режима комнаты (Тайно / Нетайно).
      </p>
      <p>
        Вы можете покинуть комнату (до раздачи) или попросить владельца удалить комнату. Удаление комнаты стирает
        связанные вишлисты и назначения.
      </p>
      <p>По вопросам персональных данных: раздел «Разработчики».</p>
    </LegalShell>
  )
}

export function Terms() {
  return (
    <LegalShell crumb="юридическое" title="Условия пользования">
      <p>
        Сервис предназначен для добровольного обмена подарками между участниками, согласившимися на правила
        комнаты. Запрещены мошенничество, спам, публикация незаконного контента и попытки обойти анонимность
        раздачи в режиме «Тайно».
      </p>
      <p>
        Владелец комнаты отвечает за приглашения и настройки. Администрация сервиса может ограничить доступ при
        злоупотреблениях. Сервис предоставляется «как есть»; возможны технические перерывы.
      </p>
    </LegalShell>
  )
}

export function Cookies() {
  return (
    <LegalShell crumb="юридическое" title="Политика cookies">
      <p>
        Тайно — Telegram Mini App. Мы не используем стороннюю рекламную cookie-аналитику. В локальном хранилище
        браузера / WebView сохраняются: JWT сессии, выбранная комната, флаг согласия с политикой.
      </p>
      <p>
        Эти данные нужны для входа и удобства. Очистка данных Telegram / Mini App удаляет локальные значения.
        Серверные сессии истекают по TTL JWT.
      </p>
    </LegalShell>
  )
}

export function Developers() {
  return (
    <LegalShell crumb="о проекте" title="Разработчики">
      <p>
        <strong>Тайно</strong> — независимый pet-проект анонимных (и открытых) раздач вишлистов в Telegram.
      </p>
      <p>
        Технологии: Spring Boot, PostgreSQL, React, Telegram Mini Apps SDK. Шрифты: Source Sans 3 и Source Code Pro
        (SIL Open Font License).
      </p>
      <p>
        Обратная связь и вопросы по данным: напишите боту приложения или владельцу репозитория проекта TAINO.
      </p>
    </LegalShell>
  )
}

export function MaintenanceScreen({ message }) {
  return (
    <main className="status-screen maintenance">
      <div className="gear-wrap" aria-hidden="true">
        <span className="gear gear-a" />
        <span className="gear gear-b" />
      </div>
      <p className="crumb">сервис</p>
      <h1>Технические работы</h1>
      <p className="note">
        {message || 'Бэкенд сейчас недоступен. Мы уже чиним — открой приложение чуть позже из Telegram.'}
      </p>
      <button className="fill" type="button" onClick={() => window.location.reload()}>
        Попробовать снова
      </button>
    </main>
  )
}

export function ErrorScreen({ code, title, message, onRetry }) {
  return (
    <main className="status-screen error-screen">
      <p className="crumb">{code || 'ошибка'}</p>
      <h1>{title || 'Что-то пошло не так'}</h1>
      <p className="note">{message}</p>
      {onRetry && (
        <button className="fill" type="button" onClick={onRetry}>
          Попробовать снова
        </button>
      )}
    </main>
  )
}
