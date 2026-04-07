# Supabase setup

## Як застосувати схему

1. Відкрийте Supabase проєкт → **SQL Editor**.
2. Створіть **New query**.
3. Скопіюйте весь вміст файлу [`supabase/schema.sql`](./schema.sql) і натисніть **Run**.

## Що далі

- Додайте користувачів через Supabase Auth (Email/Password).
- Створіть профілі в таблиці `public.users` (admin-дія) і призначте ролі: `admin | pm | specialist`.
- Після цього фронтенд зможе безпечно читати/писати дані через RLS політики.

