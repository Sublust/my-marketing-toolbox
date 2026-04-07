# Marketing KPI Web

React (Vite) + Tailwind + Supabase застосунок для розрахунку KPI, історії по періодах і дашбордів.

## Локальний запуск

1) Встановити залежності:

```bash
npm install
```

2) Створити `.env` на основі `.env.example` і вставити ваші значення Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) Запустити dev-сервер:

```bash
npm run dev
```

4) Продакшен-білд (перевірка перед деплоєм):

```bash
npm run build
```

## Підготовка під Netlify (вже додано в проєкт)

- **SPA-роутинг**: файл `public/_redirects` та правило в `netlify.toml` гарантують, що маршрути типу `/dashboard` працюють після оновлення сторінки.
- **Налаштування білду**: `netlify.toml` підказує Netlify, що треба виконувати `npm run build` і публікувати `dist`.
- **Безпека env**: `.env` та `.env.*` ігноруються git (крім `.env.example`).

## Деплой на Netlify (коли будете готові)

У Netlify вкажіть environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Після деплою перевірте:

- логін працює
- прямий перехід/оновлення сторінки на `/kpi` і `/dashboard` не дає 404

