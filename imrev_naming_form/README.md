# Imrev Naming Generator (Prototype)

Статичний прототип веб-форми для генерації назв за стандартом з PDF.

## Як запустити

1) Відкрийте файл `index.html` у браузері (подвійний клік).

Або (опційно) запустіть локальний сервер, щоб усе працювало однаково в різних браузерах:

```powershell
cd C:\Users\Administrator\imrev_naming_form
python -m http.server 5173
```

Якщо Python не встановлено — просто відкривайте `index.html` напряму.

## Що вміє

- Платформи: **Meta Ads / TikTok Ads / Google Ads**
- Рівні (приблизно за PDF):
  - Meta: Campaign / Ad Set / Ad
  - TikTok: Campaign / Ad Group / Ad
  - Google: Campaign / Ad Group (Asset Group) / Ad (Asset)
- Збирає назву через роздільник `" | "`
- Показує стандартний **UTM/Tracking шаблон** і дає кнопку Copy
- Мінімальна валідація: латиниця, формат дати `YYMMDD`, обов’язкові поля

## Файли

- `index.html` — UI
- `styles.css` — стилі
- `app.js` — логіка + довідники/правила (schema)

