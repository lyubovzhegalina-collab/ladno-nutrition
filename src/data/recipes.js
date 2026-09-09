import { INGREDIENTS, ingredient as i } from './ingredients.js';
import { nutritionForIngredients } from '../utils/calculations.js';

const categoryMeta = {
  breakfast: { label: 'Завтрак', description: 'Спокойное начало дня с белком и знакомыми вкусами.', meals: ['breakfast'] },
  lunch: { label: 'Обед', description: 'Полноценное тёплое блюдо для ровной энергии днём.', meals: ['lunch', 'dinner'] },
  dinner: { label: 'Ужин', description: 'Комфортный ужин с белком, гарниром и овощами.', meals: ['dinner', 'lunch'] },
  snack: { label: 'Перекус', description: 'Сбалансированный перекус, который удобно встроить в рабочий день.', meals: ['snack'] },
  pleasure: { label: 'Для удовольствия', description: 'Понятная порция любимого вкуса уже учтена внутри дня.', meals: ['pleasure', 'snack'] }
};

const allergenMap = { egg: 'яйца', milk: 'молоко', yogurt: 'молоко', kefir: 'молоко', cottage: 'молоко', cheese: 'молоко', creamCheese: 'молоко', dorblue: 'молоко', sourCream: 'молоко', bread: 'глютен', tortilla: 'глютен', lavash: 'глютен', flour: 'глютен', pasta: 'глютен', noodles: 'глютен', shrimp: 'ракообразные', tuna: 'рыба', cod: 'рыба', pollock: 'рыба', trout: 'рыба', salmon: 'рыба', seabass: 'рыба', pike: 'рыба', herring: 'рыба', nuts: 'орехи' };

function cookingSteps(title, ingredients, tags, category) {
  const names = ingredients.map(x => INGREDIENTS[x.id].name.toLowerCase());
  const protein = names.find(x => /(кур|индей|говя|свин|крев|трес|минтай|форел|горбуш|окун|щук|тун|сельд|яйц)/.test(x));
  const vegetables = names.filter(x => /(помид|огур|перец|кабач|баклаж|гриб|лук|морков|салат|шпинат|брокк|зелень)/.test(x));
  if (category === 'pleasure') return [
    'Отмерьте указанную порцию — упаковку можно сразу убрать.',
    'Добавьте порцию к обычному приёму пищи или белковому перекусу и ешьте без спешки.'
  ];
  if (tags.includes('без готовки')) return [
    `Подготовьте и отмерьте все ингредиенты для блюда «${title}».`,
    `Нарежьте ${vegetables.slice(0, 2).join(' и ') || 'свежие продукты'}, соедините с остальными ингредиентами.`,
    'Перемешайте, попробуйте и подавайте сразу.'
  ];
  if (tags.includes('суп')) return [
    'Нарежьте подготовленные ингредиенты небольшими кусочками.',
    `Доведите воду до кипения, добавьте ${protein || 'основу блюда'} и варите на слабом огне.`,
    'Добавьте овощи и гарнир, готовьте до мягкости, посолите умеренно.',
    'Снимите с огня, дайте постоять 5 минут и добавьте зелень.'
  ];
  if (tags.includes('духовка')) return [
    'Разогрейте духовку до 190 °C и подготовьте форму.',
    `Нарежьте ${[protein, ...vegetables.slice(0, 2)].filter(Boolean).join(', ')}, соедините со специями и маслом.`,
    'Выложите в форму ровным слоем и запекайте до готовности.',
    'Дайте блюду отдохнуть 3–5 минут и подавайте с указанным гарниром.'
  ];
  return [
    'Подготовьте и взвесьте ингредиенты. Гарнир отварите до готовности, если он есть в составе.',
    `Нарежьте ${[protein, ...vegetables.slice(0, 2)].filter(Boolean).join(', ') || 'основные ингредиенты'} удобными кусочками.`,
    'Разогрейте сковороду, добавьте масло и готовьте основную часть блюда на среднем огне.',
    'Соедините компоненты, прогрейте 2–3 минуты, приправьте и подавайте.'
  ];
}

let serial = 0;
function make(category, title, ingredients, tags = ['быстро'], options = {}) {
  serial += 1;
  const nutrition = nutritionForIngredients(ingredients);
  const allergens = [...new Set(ingredients.map(x => allergenMap[x.id]).filter(Boolean))];
  const cookTime = options.cook ?? (tags.includes('без готовки') ? 0 : tags.includes('духовка') ? 30 : tags.includes('суп') ? 25 : 15);
  const prepTime = options.prep ?? 10;
  return {
    id: `${category}-${String(serial).padStart(3, '0')}`,
    title,
    category,
    categoryLabel: categoryMeta[category].label,
    description: options.description || categoryMeta[category].description,
    tags,
    basePortions: 1,
    prepTime,
    cookTime,
    totalTime: prepTime + cookTime,
    difficulty: options.difficulty || 'Легко',
    ingredients,
    instructions: cookingSteps(title, ingredients, tags, category),
    ...nutrition,
    minMultiplier: options.min ?? (category === 'pleasure' ? 0.75 : 0.8),
    maxMultiplier: options.max ?? (category === 'pleasure' ? 1.25 : 1.35),
    suitableMealTypes: categoryMeta[category].meals,
    allergens,
    substitutions: options.substitutions || ['Овощи можно заменить на сезонные в том же весе.', 'Соус можно подать отдельно и добавить по вкусу в пределах указанной порции.'],
    storageNote: options.storage || (category === 'pleasure' ? 'Храните по инструкции на упаковке.' : 'Готовое блюдо можно хранить в закрытом контейнере в холодильнике до 24 часов.'),
    visual: options.visual || ['sage', 'berry', 'cream', 'forest'][serial % 4],
    salty: ingredients.some(x => INGREDIENTS[x.id].salty)
  };
}

const B = 'breakfast', L = 'lunch', D = 'dinner', S = 'snack', P = 'pleasure';
const breakfast = [
  make(B, 'Омлет с овощами и сыром', [i('egg',120,2),i('pepper',80),i('tomato',100),i('cheese',25),i('oil',4)], ['быстро','много белка']),
  make(B, 'Скрэмбл с тостом и огурцом', [i('egg',120,2),i('bread',55,1),i('cucumber',140),i('creamCheese',15)], ['быстро']),
  make(B, 'Лаваш с яйцом и курицей', [i('lavash',55,1),i('egg',60,1),i('chicken',90),i('tomato',80),i('yogurt',25)], ['много белка']),
  make(B, 'Йогурт с бананом и шоколадом', [i('yogurt',220),i('banana',100),i('chocolate',15),i('nuts',10)], ['без готовки','для ПМС']),
  make(B, 'Сырники без овсянки с ягодами', [i('cottage',180),i('egg',45,1),i('flour',25),i('berries',90),i('yogurt',35)], ['комфортная еда']),
  make(B, 'Горячий сэндвич с курицей и сыром', [i('bread',80,2),i('chicken',90),i('cheese',25),i('tomato',70),i('mustard',8)], ['быстро','много белка']),
  make(B, 'Рассыпчатая гречка с яйцом и грибами', [i('buckwheat',55),i('egg',120,2),i('mushrooms',120),i('onion',30),i('oil',4)], ['сковорода']),
  make(B, 'Тосты с тунцом и сливочным сыром', [i('bread',70,2),i('tuna',100),i('creamCheese',20),i('cucumber',100)], ['без готовки','много белка']),
  make(B, 'Яичный ролл с индейкой и шпинатом', [i('egg',120,2),i('turkey',80),i('spinach',60),i('cheese',20)], ['быстро','много белка']),
  make(B, 'Творожная тарелка с персиком', [i('cottage',180),i('peach',150),i('yogurt',40),i('nuts',12)], ['без готовки']),
  make(B, 'Тортилья с омлетом и томатами', [i('tortilla',55,1),i('egg',110,2),i('tomato',100),i('cheese',20)], ['быстро']),
  make(B, 'Запечённые яйца с грибами', [i('egg',120,2),i('mushrooms',140),i('spinach',60),i('cheese',25),i('bread',45,1)], ['духовка']),
  make(B, 'Бутерброды с сельдью, яйцом и огурцом', [i('bread',70,2),i('herring',55),i('egg',60,1),i('cucumber',120),i('creamCheese',15)], ['без готовки','рыба']),
  make(B, 'Шакшука с сыром и тостом', [i('egg',120,2),i('tomato',180),i('pepper',80),i('onion',35),i('cheese',20),i('bread',45,1)], ['сковорода']),
  make(B, 'Кесадилья с курицей и грибами', [i('tortilla',60,1),i('chicken',90),i('mushrooms',90),i('cheese',25),i('tomato',70)], ['комфортная еда']),
  make(B, 'Яичные маффины с индейкой', [i('egg',120,2),i('turkey',85),i('pepper',80),i('cheese',20),i('spinach',40)], ['духовка','много белка']),
  make(B, 'Гречневый боул с яйцом и автовыбором овощей', [i('buckwheat',50),i('egg',120,2),i('cucumber',100),i('tomato',100),i('yogurt',30)], ['быстро']),
  make(B, 'Творожный крем с мандарином и орехами', [i('cottage',170),i('yogurt',60),i('mandarin',150),i('nuts',10),i('honey',8)], ['без готовки']),
  make(B, 'Омлет с креветками и шпинатом', [i('egg',120,2),i('shrimp',100),i('spinach',70),i('creamCheese',15),i('oil',3)], ['много белка','морепродукты']),
  make(B, 'Картофельная тортилья с зеленью', [i('potato',180),i('egg',120,2),i('onion',35),i('greens',15),i('yogurt',30),i('oil',4)], ['сковорода','комфортная еда'])
];

const lunch = [
  make(L, 'Паста с курицей в сливочно-грибном соусе', [i('pasta',70),i('chicken',140),i('mushrooms',130),i('sourCream',35),i('cheese',15),i('oil',4)], ['паста','комфортная еда']),
  make(L, 'Лёгкий бефстроганов с гречкой', [i('beef',140),i('buckwheat',65),i('mushrooms',100),i('onion',40),i('sourCream',35),i('oil',4)], ['комфортная еда','много белка']),
  make(L, 'Запечённый картофель с курицей и йогуртовым соусом', [i('potato',260),i('chicken',150),i('yogurt',60),i('cucumber',100),i('greens',15),i('oil',6)], ['духовка','много белка']),
  make(L, 'Рис с креветками и овощами', [i('rice',70),i('shrimp',160),i('pepper',100),i('zucchini',100),i('onion',35),i('oil',6)], ['морепродукты','сковорода']),
  make(L, 'Треска с пюре и салатом из огурца', [i('cod',180),i('potato',240),i('milk',50),i('cucumber',150),i('yogurt',35),i('oil',5)], ['рыба','много белка']),
  make(L, 'Минтай в томатном соусе с рисом', [i('pollock',190),i('rice',65),i('tomatoPaste',30),i('carrot',80),i('onion',40),i('oil',5)], ['рыба','сковорода']),
  make(L, 'Форель с картофелем и свежим салатом', [i('trout',160),i('potato',230),i('lettuce',70),i('tomato',100),i('cucumber',100),i('oil',6)], ['рыба','духовка']),
  make(L, 'Салат с пастой и тунцом', [i('pasta',65),i('tuna',130),i('tomato',120),i('cucumber',100),i('lettuce',60),i('yogurt',35)], ['рыба','паста','быстро']),
  make(L, 'Куриный ролл в тортилье', [i('tortilla',65,1),i('chicken',140),i('lettuce',60),i('tomato',100),i('cucumber',80),i('yogurt',40)], ['быстро','много белка']),
  make(L, 'Домашний бургер с йогуртовым соусом', [i('bread',90,2),i('beef',140),i('cheese',20),i('tomato',80),i('lettuce',50),i('yogurt',30),i('mustard',8)], ['комфортная еда']),
  make(L, 'Куриная шаурма в лаваше', [i('lavash',70,1),i('chicken',150),i('tomato',100),i('cucumber',100),i('lettuce',60),i('yogurt',45)], ['быстро','много белка']),
  make(L, 'Тефтели из индейки с рисом и томатным соусом', [i('turkey',160),i('rice',65),i('tomatoPaste',35),i('onion',35),i('carrot',70),i('oil',5)], ['комфортная еда']),
  make(L, 'Фаршированные перцы с курицей и рисом', [i('pepper',250),i('chicken',160),i('rice',60),i('onion',35),i('carrot',60),i('tomatoPaste',30),i('yogurt',30)], ['духовка','много белка']),
  make(L, 'Сливочный грибной суп с курицей', [i('mushrooms',180),i('chicken',130),i('potato',160),i('milk',120),i('onion',35),i('creamCheese',20)], ['суп','комфортная еда']),
  make(L, 'Куриный суп с лапшой', [i('chicken',140),i('noodles',55),i('carrot',80),i('onion',35),i('greens',15)], ['суп']),
  make(L, 'Тушёная говядина с овощами', [i('beef',160),i('potato',200),i('zucchini',120),i('pepper',100),i('onion',40),i('oil',6)], ['комфортная еда']),
  make(L, 'Баклажан с говядиной и сыром', [i('eggplant',240),i('beef',150),i('tomato',120),i('cheese',30),i('onion',35),i('oil',5)], ['духовка','много белка']),
  make(L, 'Запечённый кабачок с куриной начинкой', [i('zucchini',300),i('chicken',160),i('tomato',100),i('cheese',30),i('onion',35),i('oil',4)], ['духовка','много белка']),
  make(L, 'Тёплый салат с креветками и картофелем', [i('shrimp',160),i('potato',220),i('lettuce',70),i('tomato',100),i('cucumber',100),i('oil',7)], ['морепродукты']),
  make(L, 'Сельдь с картофелем, яйцом и огурцом', [i('herring',80),i('potato',220),i('egg',60,1),i('cucumber',140),i('onion',25),i('yogurt',30)], ['рыба','без готовки']),
  make(L, 'Горбуша с рисом и брокколи', [i('salmon',180),i('rice',65),i('broccoli',180),i('yogurt',35),i('oil',5)], ['рыба','духовка']),
  make(L, 'Свинина с гречкой и грибами', [i('pork',150),i('buckwheat',65),i('mushrooms',130),i('onion',40),i('sourCream',25),i('oil',5)], ['сковорода']),
  make(L, 'Щука с картофельными дольками', [i('pike',190),i('potato',250),i('tomato',100),i('lettuce',70),i('yogurt',35),i('oil',6)], ['рыба','духовка']),
  make(L, 'Курица с пастой и печёным перцем', [i('chicken',150),i('pasta',70),i('pepper',160),i('tomatoPaste',25),i('cheese',15),i('oil',5)], ['паста','сковорода']),
  make(L, 'Рисовый боул с говядиной и огурцом', [i('beef',145),i('rice',65),i('cucumber',130),i('carrot',80),i('greens',15),i('yogurt',30)], ['быстро','много белка'])
];

const dinner = [
  make(D, 'Морской окунь с овощами из духовки', [i('seabass',190),i('zucchini',160),i('pepper',120),i('tomato',120),i('potato',160),i('oil',7)], ['рыба','духовка']),
  make(D, 'Индейка с гречкой и грибным соусом', [i('turkey',160),i('buckwheat',55),i('mushrooms',140),i('sourCream',30),i('onion',35),i('oil',4)], ['много белка']),
  make(D, 'Куриные котлеты с картофельным пюре', [i('chicken',170),i('egg',30,1),i('potato',230),i('milk',50),i('cucumber',130),i('oil',5)], ['комфортная еда']),
  make(D, 'Креветки в томатном соусе с рисом', [i('shrimp',170),i('rice',60),i('tomato',180),i('tomatoPaste',20),i('onion',35),i('oil',6)], ['морепродукты']),
  make(D, 'Треска с гречкой и тёплыми овощами', [i('cod',190),i('buckwheat',55),i('broccoli',160),i('carrot',80),i('oil',6)], ['рыба']),
  make(D, 'Курица с кабачком в сливочном соусе', [i('chicken',160),i('zucchini',220),i('mushrooms',100),i('sourCream',35),i('rice',50),i('oil',4)], ['сковорода']),
  make(D, 'Форель с рисом и огуречным салатом', [i('trout',160),i('rice',55),i('cucumber',160),i('lettuce',60),i('yogurt',35),i('oil',4)], ['рыба']),
  make(D, 'Говяжьи тефтели с овощным соусом', [i('beef',160),i('egg',30,1),i('tomato',160),i('zucchini',140),i('onion',35),i('rice',50),i('oil',4)], ['комфортная еда']),
  make(D, 'Омлет с курицей, грибами и салатом', [i('egg',120,2),i('chicken',120),i('mushrooms',120),i('cheese',20),i('lettuce',80),i('tomato',100)], ['быстро','много белка']),
  make(D, 'Минтай с картофелем и йогуртовой зеленью', [i('pollock',200),i('potato',230),i('yogurt',50),i('greens',15),i('cucumber',120),i('oil',5)], ['рыба','духовка']),
  make(D, 'Тёплая тортилья с индейкой', [i('tortilla',60,1),i('turkey',150),i('pepper',100),i('tomato',90),i('lettuce',60),i('yogurt',35)], ['быстро']),
  make(D, 'Горбуша под сырной корочкой с брокколи', [i('salmon',180),i('cheese',25),i('broccoli',200),i('potato',170),i('yogurt',30)], ['рыба','духовка']),
  make(D, 'Куриный гуляш с рассыпчатой гречкой', [i('chicken',170),i('buckwheat',60),i('tomatoPaste',25),i('carrot',80),i('onion',35),i('sourCream',25)], ['комфортная еда']),
  make(D, 'Паста с тунцом и томатами', [i('pasta',65),i('tuna',140),i('tomato',160),i('tomatoPaste',20),i('cheese',15),i('oil',4)], ['рыба','паста']),
  make(D, 'Свиная вырезка с картофелем и салатом', [i('pork',160),i('potato',220),i('lettuce',70),i('cucumber',110),i('tomato',100),i('oil',6)], ['духовка']),
  make(D, 'Щука в сметанном соусе с рисом', [i('pike',190),i('rice',55),i('sourCream',35),i('onion',35),i('carrot',80),i('oil',4)], ['рыба']),
  make(D, 'Курица с баклажаном и сыром', [i('chicken',160),i('eggplant',220),i('tomato',130),i('cheese',25),i('onion',35),i('oil',5)], ['духовка']),
  make(D, 'Салат с креветками, яйцом и картофелем', [i('shrimp',140),i('egg',60,1),i('potato',190),i('cucumber',120),i('lettuce',70),i('yogurt',40)], ['морепродукты','быстро']),
  make(D, 'Индейка с рисом и печёным перцем', [i('turkey',165),i('rice',60),i('pepper',180),i('tomato',100),i('oil',5)], ['духовка']),
  make(D, 'Треска в томатах с картофелем', [i('cod',200),i('potato',220),i('tomato',180),i('onion',40),i('greens',15),i('oil',6)], ['рыба','сковорода']),
  make(D, 'Говядина с кабачком и рисом', [i('beef',155),i('zucchini',190),i('rice',55),i('carrot',70),i('onion',35),i('oil',5)], ['сковорода']),
  make(D, 'Куриный суп с овощами и тостом', [i('chicken',150),i('potato',130),i('carrot',80),i('zucchini',100),i('bread',50,1),i('greens',15)], ['суп']),
  make(D, 'Запеканка из кабачка, индейки и сыра', [i('zucchini',260),i('turkey',160),i('egg',60,1),i('cheese',30),i('tomato',100)], ['духовка','много белка']),
  make(D, 'Сельдь с печёным картофелем и салатом', [i('herring',75),i('potato',230),i('cucumber',130),i('tomato',100),i('lettuce',60),i('yogurt',30)], ['рыба']),
  make(D, 'Креветки с гречкой и грибами', [i('shrimp',170),i('buckwheat',55),i('mushrooms',130),i('spinach',70),i('creamCheese',20),i('oil',4)], ['морепродукты'])
];

const snack = [
  make(S, 'Творог с бананом и корицей', [i('cottage',150),i('banana',90),i('yogurt',30)], ['без готовки','много белка']),
  make(S, 'Йогурт с ягодами и орехами', [i('yogurt',200),i('berries',100),i('nuts',12)], ['без готовки']),
  make(S, 'Кефир, мандарин и сыр', [i('kefir',250),i('mandarin',150),i('cheese',25)], ['без готовки']),
  make(S, 'Яйцо с тостом и огурцом', [i('egg',60,1),i('bread',45,1),i('cucumber',140),i('creamCheese',12)], ['быстро']),
  make(S, 'Ролл с индейкой и свежими овощами', [i('lavash',40,1),i('turkey',75),i('cucumber',80),i('tomato',70),i('yogurt',25)], ['быстро','много белка']),
  make(S, 'Творожный крем с шоколадной крошкой', [i('cottage',140),i('yogurt',50),i('darkChocolate',12)], ['без готовки','для ПМС']),
  make(S, 'Персик с йогуртом и орехами', [i('peach',180),i('yogurt',170),i('nuts',10)], ['без готовки']),
  make(S, 'Мини-сэндвич с тунцом', [i('bread',50,1),i('tuna',75),i('cucumber',80),i('creamCheese',12)], ['без готовки','рыба']),
  make(S, 'Омлет-ролл со сливочным сыром', [i('egg',90,2),i('creamCheese',18),i('spinach',50),i('tomato',80)], ['быстро']),
  make(S, 'Йогурт с мандарином и шоколадом', [i('yogurt',180),i('mandarin',140),i('chocolate',12)], ['без готовки']),
  make(S, 'Творог с персиком и мёдом', [i('cottage',150),i('peach',140),i('honey',8)], ['без готовки']),
  make(S, 'Хрустящий тост с курицей', [i('bread',50,1),i('chicken',75),i('tomato',70),i('cheese',15)], ['быстро']),
  make(S, 'Кефирный коктейль с бананом', [i('kefir',250),i('banana',100),i('berries',60)], ['без готовки']),
  make(S, 'Яичная тарелка с овощами и сыром', [i('egg',60,1),i('cheese',25),i('cucumber',100),i('tomato',100),i('bread',35,1)], ['без готовки']),
  make(S, 'Йогуртовая чаша с творогом и ягодами', [i('yogurt',140),i('cottage',100),i('berries',100),i('honey',6)], ['без готовки','много белка'])
];

const pleasure = [
  make(P, 'Молочный шоколад — спокойная порция', [i('chocolate',25)], ['без готовки','для ПМС'], { min: 0.8, max: 1.2, substitutions: ['Можно заменить на 20 г тёмного шоколада.'] }),
  make(P, 'Небольшой шоколадный батончик', [i('chocolate',32,1)], ['без готовки'], { min: 1, max: 1, substitutions: ['Выберите батончик около 30–35 г и сверьте этикетку.'] }),
  make(P, 'Choco Pie', [i('chocopie',30,1)], ['без готовки'], { min: 1, max: 1, substitutions: ['Одна штука — уже запланированная порция.'] }),
  make(P, 'Два любимых печенья', [i('cookies',30,2)], ['без готовки'], { min: 1, max: 1 }),
  make(P, 'Небольшая порция чипсов', [i('chips',30)], ['без готовки','солёное']),
  make(P, 'Сухарики «3 Корочки» с хреном', [i('ryeSnacks',35)], ['без готовки','солёное']),
  make(P, 'Мини-бутерброд с ветчиной', [i('bread',35,1),i('sausage',35),i('cucumber',60)], ['без готовки','солёное']),
  make(P, 'Хлеб со сливочным сыром', [i('bread',40,1),i('creamCheese',25)], ['без готовки']),
  make(P, 'Небольшая сладкая булочка', [i('pastry',50,1)], ['без готовки']),
  make(P, 'Шарик сливочного мороженого', [i('icecream',75,1)], ['без готовки']),
  make(P, 'Йогуртовый десерт с шоколадом', [i('yogurt',100),i('chocolate',15),i('berries',50)], ['без готовки']),
  make(P, 'Порция любимого сыра', [i('cheese',40)], ['без готовки']),
  make(P, 'Хрустящий бекон к обычному блюду', [i('bacon',30)], ['быстро','солёное']),
  make(P, 'Ветчина к завтраку или салату', [i('sausage',55)], ['без готовки','солёное']),
  make(P, 'Тёмный шоколад с мандарином', [i('darkChocolate',20),i('mandarin',120)], ['без готовки','для ПМС'])
];

export const RECIPES = [...breakfast, ...lunch, ...dinner, ...snack, ...pleasure];
export const RECIPES_BY_ID = new Map(RECIPES.map(recipe => [recipe.id, recipe]));
export const RECIPE_COUNTS = Object.fromEntries(Object.keys(categoryMeta).map(category => [category, RECIPES.filter(r => r.category === category).length]));
export const CATEGORY_META = categoryMeta;

