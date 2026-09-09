# Ладно

Мобильный персональный план питания без регистрации и внешних API. Данные сохраняются локально в браузере.

## Запуск

Откройте папку через любой статический HTTP-сервер, например:

```powershell
python -m http.server 4173
```

Затем откройте `http://localhost:4173`.

## Проверка

```powershell
npm test
```

Каталог рецептов: `src/data/recipes.js`. Пищевая ценность ингредиентов: `src/data/ingredients.js`. Все расчёты: `src/utils/calculations.js`.

