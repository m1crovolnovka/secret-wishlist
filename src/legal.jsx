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
      <div className="legal-nav">
        <button className="text-btn" type="button" onClick={() => navigate(-1)}>
          Назад
        </button>
        <button className="text-btn" type="button" onClick={() => go('/legal')}>
          К документам
        </button>
        <button className="text-btn" type="button" onClick={() => go('/')}>
          На главную
        </button>
      </div>
    </section>
  )
}

/** Hub for rules and legal docs — opened from burger menu. */
export function LegalIndex() {
  const go = useGo()
  useTitle('о сервисе')
  return (
    <section className="sheet legal-page">
      <p className="crumb">меню</p>
      <h1>О сервисе</h1>
      <p className="note">Правила, документы и сведения о проекте — в одном месте.</p>
      <nav className="legal-index">
        <button type="button" className="legal-index-link" onClick={() => go('/rules')}>
          <strong>Правила</strong>
          <span>Как устроена раздача и анонимность</span>
        </button>
        <button type="button" className="legal-index-link" onClick={() => go('/legal/privacy')}>
          <strong>Конфиденциальность</strong>
          <span>Какие данные храним и как защищаем</span>
        </button>
        <button type="button" className="legal-index-link" onClick={() => go('/legal/terms')}>
          <strong>Условия использования</strong>
          <span>Правила пользования сервисом</span>
        </button>
        <button type="button" className="legal-index-link" onClick={() => go('/legal/cookies')}>
          <strong>Политика cookie</strong>
          <span>Что сохраняется на устройстве</span>
        </button>
        <button type="button" className="legal-index-link" onClick={() => go('/legal/developers')}>
          <strong>Разработчики</strong>
          <span>О проекте и обратная связь</span>
        </button>
      </nav>
      <div className="legal-nav">
        <button className="text-btn" type="button" onClick={() => go('/')}>
          На главную
        </button>
      </div>
    </section>
  )
}

export function Privacy() {
  return (
    <LegalShell crumb="о сервисе" title="Политика конфиденциальности">
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
      <p>По вопросам персональных данных смотрите раздел «Разработчики» в меню «О сервисе».</p>
    </LegalShell>
  )
}

export function Terms() {
  return (
    <LegalShell crumb="о сервисе" title="Условия использования">
      <p>
        Сервис предназначен для добровольного обмена подарками между участниками, согласившимися на правила
        комнаты. Запрещены мошенничество, спам, публикация незаконного контента и попытки обойти анонимность
        раздачи в режиме «Тайно».
      </p>
      <p>
        Владелец комнаты отвечает за приглашения и настройки. Администрация сервиса может ограничить доступ при
        злоупотреблениях. Сервис предоставляется «как есть»; возможны технические перерывы.
      </p>
      <p>
        Открывая приложение и пользуясь Тайно, ты принимаешь эти условия и политику конфиденциальности.
      </p>
    </LegalShell>
  )
}

export function Cookies() {
  return (
    <LegalShell crumb="о сервисе" title="Политика cookie">
      <p>
        Тайно — Telegram Mini App. Мы не используем стороннюю рекламную cookie-аналитику. В локальном хранилище
        браузера / WebView сохраняются JWT-сессия и выбранная комната для удобства входа.
      </p>
      <p>
        Эти данные нужны для работы приложения. Очистка данных Telegram или Mini App удаляет локальные значения.
        Серверные сессии истекают по сроку действия JWT.
      </p>
    </LegalShell>
  )
}

export function Developers() {
  return (
    <LegalShell crumb="о сервисе" title="Разработчики">
      <p>
        <strong>Тайно</strong> — независимый проект анонимных и открытых раздач вишлистов в Telegram.
      </p>
      <p>
        Технологии: Spring Boot, PostgreSQL, React, Telegram Mini Apps SDK. Шрифты: Source Sans 3 и Source Code Pro
        (лицензия SIL Open Font License).
      </p>
      <p>Обратная связь и вопросы по данным: напишите боту приложения.</p>
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
        {message || 'Сервер сейчас недоступен. Мы уже чиним — открой приложение чуть позже из Telegram.'}
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
