# Taino Frontend

Telegram Mini App UI для «Тайно». Основан на прототипе
[saintviacheslav/secret-wishlist](https://github.com/saintviacheslav/secret-wishlist).

**Стек:** React 19, Vite 6, react-router-dom 7, `@telegram-apps/sdk`.

Отдельный git-репозиторий (не монорепо с backend).

## Dev

```bash
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8080

npm install
npm run dev
```

Сборка: `npm run build`.

## Telegram Mini App

SDK: тема Telegram, BackButton, haptic, viewport/safe-area.  
Авторизация: raw `initData` → `POST /api/auth/telegram` → JWT в `localStorage`.

Deep-link / start param: `room_<CODE>` → авто-join.

## Экраны

- `/` — отсчёт / анонимный вишлист после раздачи  
- `/cabinet` — форма + wishlist + запрос на изменение  
- `/rooms`, `/rooms/new`, `/enter` — комнаты / создание / код  
- `/admin` — настройки владельца  
- `/colors` — участники с цветами + очередь change requests (только admin tab)

## Деплой

Vercel (как прототип). Укажи домен в BotFather и в backend `CORS_ALLOWED_ORIGINS` / `MINI_APP_URL`.
