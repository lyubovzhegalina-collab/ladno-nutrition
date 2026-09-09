import { RECIPES, RECIPES_BY_ID, CATEGORY_META } from './data/recipes.js';
import { INGREDIENTS } from './data/ingredients.js';
import { RECOMMENDATIONS } from './data/recommendations.js';
import { QUICK_TRACKERS, EXTENDED_TRACKERS } from './data/trackers.js';
import { aggregateGroceries, fitRecipe, macroCalories, scaleRecipe, sumNutrition, nutritionForIngredients } from './utils/calculations.js';

const STORAGE_KEY = 'ladno-nutrition-v1';
const dayNames = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const dayShort = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const mealLabels = { breakfast:'Завтрак', lunch:'Обед', snack:'Перекус', dinner:'Ужин', pleasure:'Для удовольствия' };
const mealTimes = { breakfast:'09:30', lunch:'13:30', snack:'17:00', dinner:'20:00', pleasure:'после еды' };

const icons = {
  today:'<svg viewBox="0 0 24 24"><path d="M4 10h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="m9 15 2 2 4-5"/></svg>',
  week:'<svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4m8-4v4M4 10h16"/></svg>',
  cart:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.3 11.5h10.8L21 8H6M9 20h.01M17 20h.01"/></svg>',
  guide:'<svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z"/></svg>',
  trackers:'<svg viewBox="0 0 24 24"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  leaf:'<svg viewBox="0 0 24 24"><path d="M20 4C11 4 5 8 5 15c0 2 1 4 3 5 6-2 10-7 12-16Z"/><path d="M4 21c3-5 7-8 12-11"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  chevron:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 9M4 15l2.4 2.6A7 7 0 0 0 17.9 15"/></svg>',
  bowl:'<svg viewBox="0 0 24 24"><path d="M4 11h16a8 8 0 0 1-16 0Zm4 8h8M8 7c0-2 2-2 2-4m4 4c0-2 2-2 2-4"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

const defaultSettings = {
  mode:'current', calories:1600, protein:115, fat:55, carbs:160, fiber:20, weight:73,
  mealCount:4, distribution:{ breakfast:25, lunch:35, snack:15, dinner:25 }, pleasurePerWeek:3,
  excluded:'', included:'', targetWeight:'', times:{ breakfast:'09:30', lunch:'13:30', snack:'17:00', dinner:'20:00' },
  timeEnds:{ breakfast:'10:00', lunch:'14:00', snack:'17:30', dinner:'21:00' }
};

function recipeMap(state) { return new Map([...RECIPES, ...state.personalMeals].map(r => [r.id, r])); }
function getMonday(date = new Date()) { const d = new Date(date); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(12,0,0,0); return d; }
function isoDay(date) { return date.toISOString().slice(0,10); }

function generateWeek(settings, seed = 0) {
  const monday = getMonday();
  const categories = settings.mealCount === 3 ? ['breakfast','lunch','dinner'] : ['breakfast','lunch','snack','dinner'];
  const pools = Object.fromEntries(categories.map(cat => [cat, RECIPES.filter(r => r.category === cat)]));
  const pleasures = RECIPES.filter(r => r.category === 'pleasure');
  return Array.from({ length:7 }, (_, day) => {
    const date = new Date(monday); date.setDate(monday.getDate()+day);
    const pleasureRecipe = day < settings.pleasurePerWeek ? pleasures[(day+seed)%pleasures.length] : null;
    const available = settings.calories - (pleasureRecipe?.calories || 0);
    const distribution = effectiveDistribution(settings);
    const meals = categories.map((category, idx) => {
      const pool = pools[category];
      const recipe = pool[(day * 3 + idx + seed) % pool.length];
      const scaled = fitRecipe(recipe, available * distribution[category] / 100);
      return { type:category, recipeId:recipe.id, multiplier:scaled.multiplier, eaten:false };
    });
    if (pleasureRecipe) meals.push({ type:'pleasure', recipeId:pleasureRecipe.id, multiplier:1, eaten:false });
    return { date:isoDay(date), meals };
  });
}

function effectiveDistribution(settings) {
  if (settings.mealCount === 4) return settings.distribution;
  const source = ['breakfast','lunch','dinner'];
  const sum = source.reduce((n,k)=>n+settings.distribution[k],0) || 100;
  return { ...settings.distribution, snack:0, ...Object.fromEntries(source.map(k=>[k,settings.distribution[k]/sum*100])) };
}

function initialState() {
  return {
    activeTab:'today', selectedDay:Math.min(6, Math.max(0, (new Date().getDay()+6)%7)), settings:structuredClone(defaultSettings),
    week:null, favorites:[], personalMeals:[], grocery:{ checked:[], manual:[], selectedDays:[0,1,2,3,4,5,6], hideChecked:false },
    trackers:{}, weightHistory:[{ date:isoDay(new Date()), weight:73 }], recommendationRead:[], modal:null, undo:null, filters:{ quick:false, fish:false, budget:false, protein:'all' }
  };
}

function loadState() {
  const fresh = initialState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') throw new Error('empty');
    const merged = { ...fresh, ...saved, settings:{ ...fresh.settings, ...(saved.settings||{}), distribution:{...fresh.settings.distribution,...(saved.settings?.distribution||{})}, times:{...fresh.settings.times,...(saved.settings?.times||{})}, timeEnds:{...fresh.settings.timeEnds,...(saved.settings?.timeEnds||{})} }, modal:null };
    if (!Array.isArray(merged.week) || merged.week.length !== 7) merged.week = generateWeek(merged.settings);
    return merged;
  } catch {
    fresh.week = generateWeek(fresh.settings);
    return fresh;
  }
}

let state = loadState();
let modalContext = {};
let toastTimer;
const app = document.querySelector('#app');

function persist() {
  try {
    const { modal, undo, ...safe } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch { showToast('Не удалось сохранить данные на устройстве'); }
}

function showToast(message, action = null) {
  const toast = document.querySelector('#toast');
  toast.innerHTML = action ? `${message} <button class="text-btn" data-action="${action}">Отменить</button>` : message;
  toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>toast.classList.remove('show'), 4200);
}

function fmt(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits:0 }).format(Math.round(value)); }
function dateLong(value) { return new Intl.DateTimeFormat('ru-RU',{ day:'numeric', month:'long' }).format(new Date(`${value}T12:00:00`)); }
function todayDateText() { return new Intl.DateTimeFormat('ru-RU',{ weekday:'long', day:'numeric', month:'long' }).format(new Date()).replace(/^./,c=>c.toUpperCase()); }
function modeLabel() { return { maintenance:'Поддержание', mild:'Мягкий дефицит', current:'Текущий дефицит', custom:'Свои значения' }[state.settings.mode]; }
function timeRange(type) { const start=state.settings.times[type]||mealTimes[type]; const end=state.settings.timeEnds?.[type]; return end ? `${start}–${end}` : start; }
function recipePhoto(recipe) {
  if (recipe.category==='breakfast') return './assets/meals/breakfast.png';
  if (recipe.category==='snack') return './assets/meals/snack.png';
  if (recipe.category==='pleasure') return './assets/meals/pleasure.png';
  if (recipe.tags.includes('рыба') || recipe.ingredients.some(x=>['cod','pollock','trout','salmon','seabass','pike','herring'].includes(x.id))) return './assets/meals/fish.png';
  if (recipe.ingredients.some(x=>['beef','pork'].includes(x.id))) return './assets/meals/beef-bowl.png';
  return './assets/meals/chicken-pasta.png';
}

function mealScaled(meal) { const recipe = recipeMap(state).get(meal.recipeId); return recipe ? scaleRecipe(recipe, meal.multiplier) : null; }
function dayNutrition(day) { return sumNutrition(day.meals.map(mealScaled).filter(Boolean)); }
function consumedNutrition(day) { return sumNutrition(day.meals.filter(m=>m.eaten).map(mealScaled).filter(Boolean)); }
function currentDay() { return state.week[state.selectedDay]; }
function progress(value,target) { return Math.min(100,Math.round(value/Math.max(1,target)*100)); }

function topbar(title = null) {
  return `<header class="topbar"><div class="brand"><span class="brand-mark">л</span><span>${title || 'Ладно'}</span></div><button class="icon-btn" data-action="settings" aria-label="Настройки">${icons.settings}</button></header>`;
}

function nav() {
  const items = [['today','Сегодня'],['week','Неделя'],['shopping','Покупки'],['guide','Советы'],['trackers','Трекеры']];
  return `<nav class="bottom-nav" aria-label="Основная навигация">${items.map(([id,label])=>`<button class="nav-item ${state.activeTab===id?'active':''}" data-tab="${id}" aria-current="${state.activeTab===id?'page':'false'}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>`;
}

function macroCard(label, value, target) {
  return `<div class="macro"><span>${label}</span><b>${fmt(value)} / ${fmt(target)} г</b><div class="mini-track"><i style="width:${progress(value,target)}%"></i></div></div>`;
}

function mealCard(meal, index, dayIndex = state.selectedDay) {
  const recipe = recipeMap(state).get(meal.recipeId); if (!recipe) return '';
  const scaled = scaleRecipe(recipe, meal.multiplier);
  const portion = meal.multiplier === 1 ? '1 порция' : `${meal.multiplier.toFixed(2).replace('.',',')} порции`;
  return `<article class="card meal-card ${meal.eaten?'is-eaten':''}">
    <div class="meal-visual"><img src="${recipePhoto(recipe)}" alt="${recipe.title}" loading="lazy"></div>
    <div><div class="meal-time">${mealLabels[meal.type]} · ${timeRange(meal.type)}</div><div class="meal-title">${recipe.title}</div><div class="meal-data"><span>${portion}</span><span>${scaled.calories} ккал</span><span>Б ${scaled.protein} · Ж ${scaled.fat} · У ${scaled.carbs}</span></div></div>
    <div class="meal-actions"><button class="btn ${meal.eaten?'soft':'primary'}" data-action="toggle-eaten" data-day="${dayIndex}" data-meal="${index}">${meal.eaten?'Съедено ✓':'Отметить'}</button><button class="btn" data-action="open-recipe" data-id="${recipe.id}" data-day="${dayIndex}" data-meal="${index}">Открыть</button><button class="btn" data-action="replace" data-day="${dayIndex}" data-meal="${index}" aria-label="Заменить блюдо">${icons.refresh}</button></div>
  </article>`;
}

function saltHint(day) {
  const saltyCount = day.meals.filter(m=>recipeMap(state).get(m.recipeId)?.salty).length;
  return saltyCount >= 2 ? `<div class="notice">Сегодня несколько солёных продуктов — отёчность может временно ощущаться сильнее.</div>` : '';
}

function renderToday() {
  const day = currentDay(); const planned = dayNutrition(day); const consumed = consumedNutrition(day);
  const water = state.trackers[isoDay(new Date())]?.water || 0;
  const next = day.meals.find(m=>!m.eaten);
  return `<main class="page">${topbar()}
    <section class="hero"><p class="eyebrow">${todayDateText()}</p><h1>Добрый день, Люба</h1><p class="lead">План уже собран. Можно менять блюда и порции — список покупок обновится сам.</p>
      <article class="card target-card"><div class="target-head"><div><small>Твой ориентир</small><h2>${modeLabel()}</h2></div><span class="mode-pill">±100 ккал — нормально</span></div>
      <div class="target-number"><strong>${fmt(planned.calories)}</strong><span>из ${fmt(state.settings.calories)} ккал запланировано</span></div><div class="calorie-track"><i style="width:${progress(consumed.calories,state.settings.calories)}%"></i></div><div class="target-meta"><span>Съедено ${fmt(consumed.calories)} ккал</span><span>${progress(consumed.calories,state.settings.calories)}%</span></div>
      <div class="macro-grid">${macroCard('Белки',planned.protein,state.settings.protein)}${macroCard('Жиры',planned.fat,state.settings.fat)}${macroCard('Углеводы',planned.carbs,state.settings.carbs)}</div></article>
      <div class="rhythm"><span class="tiny-icon">${icons.clock}</span><span>${next ? `Следующий ориентир — ${mealLabels[next.type].toLowerCase()} в интервале ${timeRange(next.type)}.` : 'Все запланированные приёмы отмечены. Спасибо, что заметила свой ритм.'} Вода: ${fmt(water)} мл. Без наказаний, если график сегодня сдвинулся.</span></div>
    </section>
    <div class="desktop-grid"><section class="section"><div class="section-head"><div><h2>Сегодня в меню</h2><p>Все количества — для одного человека</p></div><button class="text-btn" data-action="constructor">Конструктор</button></div>${saltHint(day)}<div class="meal-list">${day.meals.map((m,i)=>mealCard(m,i)).join('')}</div></section>
    <aside><article class="card tip-card"><span class="tiny-icon">${icons.leaf}</span><div><strong>Фокус дня</strong><p>Поставь воду рядом с рабочим местом и сделай несколько глотков до того, как появится сильная жажда.</p></div></article><article class="card quick-check"><div><strong>Как ты сегодня?</strong><div class="lead">Короткая отметка займёт меньше минуты</div></div><button class="btn" data-tab="trackers">Отметить</button></article></aside></div>
    <p class="footer-note">Расчёты ориентировочные: бренды продуктов и способ приготовления могут немного менять значения.</p></main>`;
}

function renderWeek() {
  const filters = [['quick','До 20 минут'],['fish','Рыбные дни'],['budget','Простые продукты']];
  return `<main class="page">${topbar('Неделя')}<section class="hero"><p class="eyebrow">План на 7 дней</p><h1>Неделя без лишних подсчётов</h1><p class="lead">Блюда не повторяются чаще двух раз. Все порции рассчитаны на одного человека.</p></section>
    <div class="week-toolbar">${filters.map(([id,label])=>`<button class="chip ${state.filters[id]?'active':''}" data-action="filter" data-filter="${id}">${label}</button>`).join('')}<select class="chip" data-week-protein aria-label="Любимый белок"><option value="all">Любой белок</option><option value="chicken" ${state.filters.protein==='chicken'?'selected':''}>Курица</option><option value="fish" ${state.filters.protein==='fish'?'selected':''}>Рыба</option><option value="beef" ${state.filters.protein==='beef'?'selected':''}>Говядина</option></select><button class="chip" data-action="regen-week">Обновить неделю</button></div>
    <p class="filter-note">Фильтры учитываются при обновлении дня или всей недели.</p>
    <section class="week-list">${state.week.map((day,di)=>{ const total=dayNutrition(day); return `<article class="card day-card ${di===state.selectedDay?'today':''}"><div class="day-title"><div><h3>${dayNames[di]}${di===state.selectedDay?' · сегодня':''}</h3><small>${dateLong(day.date)} · ${day.meals.length} приёма</small></div><div class="day-total"><strong>${total.calories} ккал</strong>Б ${total.protein} · Ж ${total.fat} · У ${total.carbs}</div></div><div class="day-meals">${day.meals.map((meal,mi)=>{const r=recipeMap(state).get(meal.recipeId);return `<div class="day-meal"><small>${mealLabels[meal.type]}</small><button class="text-btn" data-action="open-recipe" data-id="${r.id}" data-day="${di}" data-meal="${mi}">${r.title}</button><button data-action="replace" data-day="${di}" data-meal="${mi}" aria-label="Заменить">${icons.refresh}</button></div>`}).join('')}</div><div class="day-actions"><button class="btn soft" data-action="regen-day" data-day="${di}">Обновить только день</button></div></article>`}).join('')}</section></main>`;
}

function groceryItems() {
  const generated = aggregateGroceries(state.week, recipeMap(state), state.grocery.selectedDays);
  return [...generated, ...state.grocery.manual.map(x=>({ ...x, category:'Добавлено вручную', unit:x.unit||'шт', purchaseAmount:x.amount }))];
}

function renderShopping() {
  const items = groceryItems(); const checked = items.filter(i=>state.grocery.checked.includes(i.id)).length;
  const shown = state.grocery.hideChecked ? items.filter(i=>!state.grocery.checked.includes(i.id)) : items;
  const groups = Object.groupBy ? Object.groupBy(shown,i=>i.category) : shown.reduce((a,i)=>((a[i.category]??=[]).push(i),a),{});
  return `<main class="page">${topbar('Покупки')}<section class="hero"><p class="eyebrow">Собрано из меню</p><h1>Покупки на неделю</h1><p class="lead">Точные количества меняются вместе с блюдами и порциями.</p></section>
    <article class="card shopping-summary"><div class="shopping-head"><div class="ring" style="--progress:${items.length?checked/items.length*100:0}%"><strong>${checked}/${items.length}</strong></div><div><h2>${checked ? 'Уже в корзине':'Можно начинать'}</h2><p>Практичная фасовка показана рядом с точной потребностью меню.</p></div></div></article>
    <div class="day-selector">${dayShort.map((d,i)=>`<button class="${state.grocery.selectedDays.includes(i)?'active':''}" data-action="shop-day" data-day="${i}">${d}</button>`).join('')}</div>
    <div class="shop-controls"><input class="input" id="manual-item" placeholder="Добавить свой продукт" aria-label="Новый продукт"><button class="btn primary" data-action="add-manual">Добавить</button></div>
    <div class="section-head"><label class="switch-row" style="gap:10px"><span>Скрыть отмеченные</span><span class="switch"><input type="checkbox" data-action="hide-checked" ${state.grocery.hideChecked?'checked':''}><i></i></span></label><button class="text-btn" data-action="reset-checks">Сбросить отметки</button></div>
    ${Object.entries(groups).map(([category,list])=>`<section class="shop-group"><h3>${category}</h3><div class="card shop-items">${list.map(item=>`<label class="shop-row ${state.grocery.checked.includes(item.id)?'checked':''}"><input class="check" type="checkbox" data-action="shop-check" data-id="${item.id}" ${state.grocery.checked.includes(item.id)?'checked':''}><span>${item.name}</span><span class="shop-amount"><strong>${fmt(item.amount)} ${item.unit}</strong>купить ≈ ${fmt(item.purchaseAmount)} ${item.unit}</span></label>`).join('')}</div></section>`).join('') || '<div class="card empty">Выбери хотя бы один день — список появится здесь.</div>'}
    <p class="footer-note">Цены не показываются: список не выдумывает стоимость без надёжных данных магазина.</p></main>`;
}

function renderGuide() {
  const energy = trackerScore('energyDay',42,false); const health = healthScore();
  return `<main class="page">${topbar('Рекомендации')}<section class="hero"><p class="eyebrow">Персональный ориентир</p><h1>Понятно о питании</h1><p class="lead">Никаких запретов и обещаний. Наблюдаем за энергией, аппетитом, сном и комфортом.</p></section>
    <section class="score-grid"><article class="card score"><small>Коучинговая оценка энергии</small><strong>${energy}/100</strong><div class="score-line"><i style="width:${energy}%"></i></div></article><article class="card score"><small>Коучинговая оценка питания</small><strong>${health}/100</strong><div class="score-line"><i style="width:${health}%"></i></div></article></section>
    <div class="notice" style="margin-top:12px">Это не медицинские показатели. Они начинают с 42/100 и 36/100 и меняются по отметкам энергии, сна, воды, регулярности еды и пищеварительного комфорта.</div>
    <section class="accordion">${RECOMMENDATIONS.map((r,i)=>`<details class="card" data-rec="${r.id}" ${i===0?'open':''}><summary data-action="read-rec" data-id="${r.id}"><span class="brand-mark" style="width:34px;height:34px;font-size:13px">${state.recommendationRead.includes(r.id)?'✓':i+1}</span>${r.title}</summary><p>${r.text}</p></details>`).join('')}</section></main>`;
}

function trackerScore(key, baseline, inverse=false) {
  const entries = Object.values(state.trackers).filter(v=>v && typeof v[key]==='number');
  if (!entries.length) return baseline;
  const avg = entries.reduce((n,v)=>n+v[key],0)/entries.length;
  return Math.round(inverse ? 100-avg*10 : avg*10);
}
function healthScore() {
  const entries = Object.values(state.trackers);
  if (!entries.length) return 36;
  const latest = entries.at(-1); return Math.max(0,Math.min(100,Math.round((latest.meals||0)/4*30 + Math.min(1,(latest.water||0)/1600)*30 + (latest.produce||0)/5*20 + (latest.protein?20:0))));
}
function trackerField(t, value) {
  if (t.type==='check') return `<article class="card tracker-row switch-row"><span>${t.label}</span><label class="switch"><input type="checkbox" data-tracker="${t.id}" ${value?'checked':''}><i></i></label></article>`;
  return `<article class="card tracker-row"><label class="tracker-label" for="tr-${t.id}"><span>${t.label}</span><output>${value} ${t.unit}</output></label><input id="tr-${t.id}" type="range" min="${t.min}" max="${t.max}" step="${t.step}" value="${value}" data-tracker="${t.id}"></article>`;
}

function weightChart() {
  const history=[...state.weightHistory].sort((a,b)=>a.date.localeCompare(b.date));
  if(!history.length) return '<div class="empty">Добавь первую отметку — здесь появится линия динамики. Ежедневные измерения не нужны.</div>';
  const width=360,height=190,left=42,right=14,top=18,bottom=32;
  const values=history.map(x=>x.weight); const target=Number(state.settings.targetWeight)||null;
  const min=Math.floor(Math.min(...values,...(target?[target]:[]))-1); const max=Math.ceil(Math.max(...values,...(target?[target]:[]))+1); const range=Math.max(1,max-min);
  const x=i=>history.length===1?(left+width-right)/2:left+i*(width-left-right)/(history.length-1);
  const y=v=>top+(max-v)*(height-top-bottom)/range;
  const path=history.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(' ');
  const first=history[0],last=history.at(-1),delta=last.weight-first.weight;
  return `<div class="weight-stats"><div><small>Последняя отметка</small><strong>${last.weight.toFixed(1).replace('.',',')} кг</strong></div><div style="text-align:right"><small>Изменение</small><strong style="font-size:20px">${delta>0?'+':''}${delta.toFixed(1).replace('.',',')} кг</strong></div></div>
  <svg class="weight-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="weight-chart-title weight-chart-desc"><title id="weight-chart-title">Динамика веса</title><desc id="weight-chart-desc">${history.length} отметок веса с ${dateLong(first.date)} по ${dateLong(last.date)}.</desc>
    ${[min,(min+max)/2,max].map(v=>`<line class="grid" x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}"/><text x="${left-7}" y="${y(v)+4}" text-anchor="end">${v.toFixed(1)}</text>`).join('')}
    <line class="axis" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"/>
    ${target?`<line class="target" x1="${left}" y1="${y(target)}" x2="${width-right}" y2="${y(target)}"/><text x="${width-right}" y="${y(target)-5}" text-anchor="end">ориентир ${target.toFixed(1).replace('.',',')} кг</text>`:''}
    <path class="trend" d="${path}"/>${history.map((p,i)=>`<circle class="point" cx="${x(i)}" cy="${y(p.weight)}" r="4"><title>${dateLong(p.date)}: ${p.weight.toFixed(1).replace('.',',')} кг</title></circle>`).join('')}
    <text x="${left}" y="${height-9}">${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(new Date(first.date+'T12:00:00'))}</text><text x="${width-right}" y="${height-9}" text-anchor="end">${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(new Date(last.date+'T12:00:00'))}</text><text x="12" y="${top}" transform="rotate(-90 12 ${top})">Вес, кг</text>
  </svg><div class="weight-log">${history.slice(-4).reverse().map(p=>`<div class="weight-log-row"><span>${dateLong(p.date)}</span><strong>${p.weight.toFixed(1).replace('.',',')} кг</strong><button data-action="delete-weight" data-date="${p.date}" aria-label="Удалить отметку за ${dateLong(p.date)}">×</button></div>`).join('')}</div>`;
}

function renderTrackers() {
  const key=isoDay(new Date()); const saved=state.trackers[key]||{}; const val=t=>saved[t.id]??t.default;
  const trends=[['energyDay','Энергия',42,false],['craving','Тяга к сладкому',50,true],['water','Вода',35,false],['bloating','Комфорт пищеварения',45,true],['puffiness','Отёчность',50,true],['meals','Регулярность еды',40,false]];
  return `<main class="page">${topbar('Трекеры')}<section class="hero"><p class="eyebrow">Меньше минуты</p><h1>Как прошёл день?</h1><p class="lead">Отмечай только то, что хочется наблюдать. Вес остаётся необязательным.</p></section>
    <section class="section" style="margin-top:0"><div class="section-head"><div><h2>Динамика веса</h2><p>Необязательный показатель — важен общий тренд, а не колебания за день</p></div></div><article class="card weight-card">${weightChart()}</article><form id="weight-form" class="weight-entry-form"><input class="input" name="date" type="date" value="${key}" max="${key}" aria-label="Дата измерения"><input class="input" name="weight" type="number" min="35" max="250" step="0.1" placeholder="Вес, кг" required><button class="btn primary" type="submit">Добавить</button></form></section>
    <form id="tracker-form"><section class="tracker-grid">${QUICK_TRACKERS.map(t=>trackerField(t,val(t))).join('')}</section><details class="advanced"><summary class="text-btn">Больше наблюдений</summary><section class="tracker-grid">${EXTENDED_TRACKERS.map(t=>trackerField(t,val(t))).join('')}<div class="field"><label>Сон, часов</label><input class="input" name="sleepDuration" type="number" min="0" max="16" step="0.5" value="${saved.sleepDuration??''}" placeholder="необязательно"></div><div class="field"><label>Комфорт кишечника</label><select class="input" name="bowel"><option value="">Не отмечать</option><option ${saved.bowel==='комфортно'?'selected':''}>комфортно</option><option ${saved.bowel==='необычно'?'selected':''}>необычно</option></select></div><div class="field"><label>Заметка о цикле</label><input class="input" name="cycle" value="${saved.cycle??''}" placeholder="необязательно"></div><div class="field"><label>Свободная заметка</label><textarea class="input" name="note" rows="3" placeholder="Что хочется запомнить">${saved.note??''}</textarea></div></section></details><button class="btn primary full" style="margin-top:16px" type="submit">Сохранить наблюдение</button></form>
    <section class="section"><div class="section-head"><div><h2>Динамика недели</h2><p>Пустые дни не считаются неудачей</p></div></div><div class="trend-grid">${trends.map(([key,label,base,inverse])=>{const score=trackerScore(key,base,inverse);return `<article class="card trend-card"><small>${label}</small><strong>${score}/100</strong><div class="sparkline">${[.45,.62,.5,.75,.68,.82,score/100].map(x=>`<i style="height:${Math.max(10,x*100)}%"></i>`).join('')}</div></article>`}).join('')}</div></section>
    <section class="section"><h2>Недельная рефлексия</h2><div class="form-grid" style="margin-top:12px">${['Когда энергии было больше?','После каких блюд было комфортнее?','Что хочется упростить на следующей неделе?'].map((q,i)=>`<div class="field"><label>${q}</label><textarea class="input reflection" data-index="${i}" rows="2">${saved.reflection?.[i]||''}</textarea></div>`).join('')}</div></section></main>`;
}

function renderSettings() {
  const s=state.settings; const macroKcal=macroCalories(s);
  return `<div class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="dialog-head"><div><p class="eyebrow">Персонализация</p><h2 id="settings-title">Настройки плана</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icons.close}</button></div>
    <form id="settings-form" class="form-grid"><div class="field"><label>Режим</label><select class="input" name="mode"><option value="maintenance" ${s.mode==='maintenance'?'selected':''}>Поддержание — 1 800 ккал</option><option value="mild" ${s.mode==='mild'?'selected':''}>Мягкий дефицит — 1 700 ккал</option><option value="current" ${s.mode==='current'?'selected':''}>Текущий дефицит — 1 600 ккал</option><option value="custom" ${s.mode==='custom'?'selected':''}>Свои значения</option></select></div>
    <div class="field-row"><div class="field"><label>Калории</label><input class="input" name="calories" type="number" min="1200" max="3500" value="${s.calories}"></div><div class="field"><label>Текущий вес, кг</label><input class="input" name="weight" type="number" min="35" max="250" step="0.1" value="${s.weight}"></div></div>
    <div class="field-row"><div class="field"><label>Белки, г</label><input class="input" name="protein" type="number" min="30" value="${s.protein}"></div><div class="field"><label>Жиры, г</label><input class="input" name="fat" type="number" min="25" value="${s.fat}"></div></div><div class="field-row"><div class="field"><label>Углеводы, г</label><input class="input" name="carbs" type="number" min="50" value="${s.carbs}"></div><div class="field"><label>Приёмов пищи</label><select class="input" name="mealCount"><option value="4" ${s.mealCount===4?'selected':''}>4 приёма</option><option value="3" ${s.mealCount===3?'selected':''}>3 приёма</option></select></div></div>
    <div class="notice">Сумма из текущих БЖУ: <strong>${macroKcal} ккал</strong>. Если значения расходятся, ниже можно выбрать, что сохранить.</div>
    <div class="field"><label>При расхождении калорий и БЖУ</label><select class="input" name="conflict"><option value="calories">Сохранить калории и пропорционально уточнить БЖУ</option><option value="macros">Сохранить граммы БЖУ и уточнить калории</option></select></div>
    <h3>Распределение калорий</h3><div class="field-row">${Object.entries({breakfast:'Завтрак',lunch:'Обед',snack:'Перекус',dinner:'Ужин'}).map(([k,l])=>`<div class="field"><label>${l}, %</label><input class="input" name="dist-${k}" type="number" min="0" max="70" value="${s.distribution[k]}"></div>`).join('')}</div>
    <h3>Время приёмов пищи</h3><p class="lead" style="margin:0">Укажи удобный интервал — он появится на карточках и в подсказке следующего приёма.</p>${Object.entries({breakfast:'Завтрак',lunch:'Обед',snack:'Перекус',dinner:'Ужин'}).map(([k,l])=>`<div class="field"><label>${l}</label><div class="field-row"><input class="input" name="time-${k}" type="time" value="${s.times[k]}" aria-label="${l}: начало"><input class="input" name="time-end-${k}" type="time" value="${s.timeEnds[k]}" aria-label="${l}: окончание"></div></div>`).join('')}
    <div class="field"><label>Желаемый ориентир веса, кг (необязательно)</label><input class="input" name="targetWeight" type="number" min="35" max="250" step="0.1" value="${s.targetWeight}" placeholder="например, 68"></div>
    <div class="field-row"><div class="field"><label>Порций «для удовольствия» в неделю</label><input class="input" name="pleasure" type="number" min="0" max="7" value="${s.pleasurePerWeek}"></div><div class="field"><label>Клетчатка, г</label><input class="input" name="fiber" type="number" min="10" max="45" value="${s.fiber}"></div></div>
    <div class="field"><label>Исключить продукты (через запятую)</label><input class="input" name="excluded" value="${s.excluded}" placeholder="например, грибы"></div><div class="field"><label>Чаще включать</label><input class="input" name="included" value="${s.included}" placeholder="например, рыбу"></div>
    <div id="settings-error"></div><button class="btn primary full" type="submit">Пересчитать весь план</button><button class="text-btn" type="button" data-action="reset-all">Сбросить мои данные</button></form></section></div>`;
}

function renderRecipeModal() {
  const { recipeId, dayIndex, mealIndex, preview }=modalContext; const recipe=recipeMap(state).get(recipeId); if(!recipe)return '';
  const meal = dayIndex!=null && mealIndex!=null ? state.week[dayIndex].meals[mealIndex] : null; const multiplier=modalContext.multiplier ?? meal?.multiplier ?? 1; const scaled=scaleRecipe(recipe,multiplier);
  return `<div class="modal-backdrop"><article class="dialog" role="dialog" aria-modal="true"><div class="dialog-head"><div><p class="eyebrow">${recipe.categoryLabel} · 1 человек</p><h2>${recipe.title}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icons.close}</button></div><div class="hero-visual"><img src="${recipePhoto(recipe)}" alt="${recipe.title}"></div><p class="lead">${recipe.description}</p><div class="meal-data"><span>${recipe.totalTime} мин</span><span>${recipe.difficulty}</span><span>${recipe.tags.join(' · ')}</span></div>
    <div class="nutrition-strip">${[['Ккал',scaled.calories],['Белки',scaled.protein+' г'],['Жиры',scaled.fat+' г'],['Углев.',scaled.carbs+' г'],['Клетч.',scaled.fiber+' г']].map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <h3>Размер порции</h3><div class="portion-control"><button data-action="portion" data-delta="-0.05">−</button><strong>${multiplier.toFixed(2).replace('.',',')} порции</strong><button data-action="portion" data-delta="0.05">+</button></div>${multiplier<=recipe.minMultiplier||multiplier>=recipe.maxMultiplier?'<div class="notice">Достигнут практичный предел порции. Для большего изменения лучше выбрать другое блюдо или добавить гарнир.</div>':''}
    <h3>Ингредиенты</h3><div class="ingredient-list">${scaled.ingredients.map(x=>{const ing=INGREDIENTS[x.id];return `<div class="ingredient-row"><span>${ing.name}<small>${ing.basis}</small></span><strong>${x.count?`${x.count} шт. · `:''}${x.amount} ${ing.unit}</strong></div>`}).join('')}</div>
    <h3>Приготовление</h3><div class="step-list">${recipe.instructions.map((s,i)=>`<div class="step"><b>${i+1}</b><span>${s}</span></div>`).join('')}</div>
    <h3>Можно заменить</h3><p class="lead">${recipe.substitutions.join(' ')}</p><p class="footer-note">${recipe.storageNote} Значения могут немного отличаться из-за бренда и способа приготовления.</p>
    <div class="dialog-actions"><button class="btn ${state.favorites.includes(recipe.id)?'berry':'soft'}" data-action="favorite" data-id="${recipe.id}">${state.favorites.includes(recipe.id)?'В избранном ♥':'В избранное'}</button>${preview?`<button class="btn primary" data-action="back-replace">К вариантам</button>`:`<button class="btn primary" data-action="replace" data-day="${dayIndex}" data-meal="${mealIndex}">Заменить блюдо</button>`}</div></article></div>`;
}

function replacementCandidates(dayIndex, mealIndex) {
  const meal=state.week[dayIndex].meals[mealIndex], current=mealScaled(meal); const excluded=state.settings.excluded.toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
  let list=RECIPES.filter(r=>r.category===meal.type && r.id!==meal.recipeId && !r.ingredients.some(x=>excluded.some(e=>INGREDIENTS[x.id].name.toLowerCase().includes(e))));
  if(state.filters.quick) list=list.filter(r=>r.totalTime<=20); if(state.filters.fish) list=list.filter(r=>r.tags.includes('рыба')||r.tags.includes('морепродукты'));
  if(modalContext.protein && modalContext.protein!=='all') list=list.filter(r=>r.ingredients.some(x=>x.id===modalContext.protein)||(modalContext.protein==='fish'&&r.tags.includes('рыба')));
  if(modalContext.noCook) list=list.filter(r=>r.tags.includes('без готовки'));
  return list.sort((a,b)=>Math.abs(a.calories-current.calories)+Math.abs(a.protein-current.protein)*3-(state.favorites.includes(a.id)?30:0)).slice(0,8);
}

function renderReplacement() {
  const {dayIndex,mealIndex}=modalContext, meal=state.week[dayIndex].meals[mealIndex], current=mealScaled(meal), list=replacementCandidates(dayIndex,mealIndex);
  return `<div class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true"><div class="dialog-head"><div><p class="eyebrow">Ближе всего к плану</p><h2>Заменить ${mealLabels[meal.type].toLowerCase()}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icons.close}</button></div><div class="week-toolbar"><button class="chip ${state.filters.quick?'active':''}" data-action="filter" data-filter="quick">До 20 минут</button><button class="chip ${state.filters.fish?'active':''}" data-action="filter" data-filter="fish">Рыба</button><button class="chip ${modalContext.noCook?'active':''}" data-action="replacement-nocook">Без готовки</button><button class="chip ${modalContext.favoritesOnly?'active':''}" data-action="replacement-favorites">Избранное</button><select class="chip" data-replacement-protein><option value="all">Любой продукт</option><option value="chicken" ${modalContext.protein==='chicken'?'selected':''}>Курица</option><option value="beef" ${modalContext.protein==='beef'?'selected':''}>Говядина</option><option value="fish" ${modalContext.protein==='fish'?'selected':''}>Рыба</option><option value="shrimp" ${modalContext.protein==='shrimp'?'selected':''}>Креветки</option></select></div>
    <div class="replacement-list">${list.filter(r=>!modalContext.favoritesOnly||state.favorites.includes(r.id)).map(r=>{const fitted=fitRecipe(r,current.calories), dk=fitted.calories-current.calories, dp=fitted.protein-current.protein;return `<article class="card replacement"><h3>${r.title}</h3><div class="replacement-meta"><span>${fitted.calories} ккал · Б ${fitted.protein} г</span><span class="delta">${dk>=0?'+':''}${dk} ккал, ${dp>=0?'+':''}${dp} г белка</span></div><div class="replacement-actions"><button class="btn" data-action="preview-replacement" data-id="${r.id}">Посмотреть</button><button class="btn primary" data-action="confirm-replacement" data-id="${r.id}">Выбрать</button></div></article>`}).join('')||'<div class="card empty">С такими фильтрами вариантов нет. Сними один из фильтров.</div>'}</div></section></div>`;
}

const constructorGroups = {
  protein:[['chicken',150],['turkey',150],['beef',140],['shrimp',160],['cod',180],['egg',120]],
  carb:[['rice',60],['buckwheat',60],['pasta',65],['potato',230],['bread',70],['tortilla',60]],
  vegetables:[['tomato',120],['cucumber',140],['pepper',140],['zucchini',180],['broccoli',180],['mushrooms',150]],
  sauce:[['yogurt',45],['creamCheese',20],['sourCream',30],['oil',7],['cheese',25],['dorblue',20]],
  pleasure:[['chocolate',20],['chips',25],['ryeSnacks',25],['icecream',70],['cookies',25],['sausage',45]]
};

function renderConstructor() {
  modalContext.selection ||= { protein:constructorGroups.protein[0], carb:constructorGroups.carb[0], vegetables:constructorGroups.vegetables[0], sauce:constructorGroups.sauce[0] };
  const ingredients=Object.values(modalContext.selection).filter(Boolean).map(([id,amount])=>({id,amount})); const n=nutritionForIngredients(ingredients);
  return `<div class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true"><div class="dialog-head"><div><p class="eyebrow">Гибкий приём пищи</p><h2>Собери свою тарелку</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icons.close}</button></div><article class="card constructor-total"><small>Сейчас в тарелке</small><div><strong>${n.calories} ккал</strong> · Б ${n.protein} · Ж ${n.fat} · У ${n.carbs}</div></article>
    <div class="notice">Ориентир для основного приёма сейчас — около ${Math.round(state.settings.calories*.3)} ккал. Небольшое отличие нормально.</div>${Object.entries(constructorGroups).map(([group,options])=>`<section class="component-group"><h3>${{protein:'Источник белка',carb:'Гарнир',vegetables:'Овощи',sauce:'Соус или жир',pleasure:'По желанию — для удовольствия'}[group]}</h3><div class="component-options">${options.map(([id,amount])=>{const ing=INGREDIENTS[id], active=modalContext.selection[group]?.[0]===id, nut=nutritionForIngredients([{id,amount}]);return `<button class="component ${active?'active':''}" data-action="select-component" data-group="${group}" data-id="${id}" data-amount="${amount}"><strong>${ing.name}</strong><small>${amount} ${ing.unit} · ${nut.calories} ккал</small></button>`}).join('')}</div></section>`).join('')}
    <div class="dialog-actions"><button class="btn" data-action="clear-pleasure">Без удовольствия</button><button class="btn primary" data-action="save-constructor">Сохранить и добавить</button></div></section></div>`;
}

function renderModal() {
  if(state.modal==='settings')return renderSettings(); if(state.modal==='recipe')return renderRecipeModal(); if(state.modal==='replace')return renderReplacement(); if(state.modal==='constructor')return renderConstructor(); return '';
}

function render() {
  const screens={ today:renderToday, week:renderWeek, shopping:renderShopping, guide:renderGuide, trackers:renderTrackers };
  app.innerHTML=`<div class="app-shell">${screens[state.activeTab]()}</div>${nav()}${renderModal()}`;
}

function recalcWeek() {
  const distribution=effectiveDistribution(state.settings); const categories=state.settings.mealCount===3?['breakfast','lunch','dinner']:['breakfast','lunch','snack','dinner'];
  state.week.forEach((day,di)=>{
    let pleasure=day.meals.find(m=>m.type==='pleasure');
    if(di<state.settings.pleasurePerWeek && !pleasure){const r=RECIPES.filter(x=>x.category==='pleasure')[di%15];pleasure={type:'pleasure',recipeId:r.id,multiplier:1,eaten:false};}
    if(di>=state.settings.pleasurePerWeek) pleasure=null;
    const old=Object.fromEntries(day.meals.map(m=>[m.type,m])); const available=state.settings.calories-(pleasure?mealScaled(pleasure)?.calories||0:0);
    day.meals=categories.map(type=>{const original=old[type]||{type,recipeId:RECIPES.find(r=>r.category===type).id,eaten:false};const r=recipeMap(state).get(original.recipeId);return {...original,multiplier:fitRecipe(r,available*distribution[type]/100).multiplier};});
    if(pleasure)day.meals.push(pleasure);
  });
}

function regenerateDay(index) {
  const fresh=generateWeek(state.settings,Date.now()%97)[index];
  if(state.filters.quick||state.filters.budget||state.filters.protein!=='all') fresh.meals=fresh.meals.map(m=>{let candidates=RECIPES.filter(r=>r.category===m.type);if(state.filters.quick)candidates=candidates.filter(r=>r.totalTime<=20);if(state.filters.budget)candidates=candidates.filter(r=>r.ingredients.length<=6&&!r.ingredients.some(x=>['trout','shrimp','dorblue'].includes(x.id)));if(state.filters.protein!=='all')candidates=candidates.filter(r=>r.ingredients.some(x=>x.id===state.filters.protein)||(state.filters.protein==='fish'&&r.tags.includes('рыба')));if(!candidates.length)return m;const r=candidates[(index+fresh.meals.indexOf(m))%candidates.length];return {...m,recipeId:r.id,multiplier:fitRecipe(r,mealScaled(m)?.calories||r.calories).multiplier};});
  if(state.filters.fish) { const pos=fresh.meals.findIndex(m=>m.type==='lunch'||m.type==='dinner'); const fishes=RECIPES.filter(r=>(r.category===fresh.meals[pos].type)&&(r.tags.includes('рыба')||r.tags.includes('морепродукты'))); if(fishes.length){const r=fishes[index%fishes.length]; fresh.meals[pos]={...fresh.meals[pos],recipeId:r.id,multiplier:fitRecipe(r,state.settings.calories*.3).multiplier};} }
  state.week[index]=fresh;
}

function openRecipe(recipeId, dayIndex=null, mealIndex=null, preview=false) { modalContext={recipeId,dayIndex,mealIndex,preview};state.modal='recipe';render(); }

app.addEventListener('click', e=>{
  const target=e.target.closest('[data-action],[data-tab]'); if(!target)return;
  if(target.dataset.tab){state.activeTab=target.dataset.tab;state.modal=null;persist();render();window.scrollTo(0,0);return;}
  const action=target.dataset.action;
  if(action==='settings'){state.modal='settings';render();}
  if(action==='read-rec'){state.recommendationRead=[...new Set([...state.recommendationRead,target.dataset.id])];persist();const mark=target.querySelector('.brand-mark');if(mark)mark.textContent='✓';}
  if(action==='close-modal'){state.modal=null;modalContext={};render();}
  if(action==='open-recipe')openRecipe(target.dataset.id,+target.dataset.day,+target.dataset.meal);
  if(action==='toggle-eaten'){const m=state.week[+target.dataset.day].meals[+target.dataset.meal];m.eaten=!m.eaten;persist();render();}
  if(action==='replace'){modalContext={dayIndex:+target.dataset.day,mealIndex:+target.dataset.meal};state.modal='replace';render();}
  if(action==='favorite'){const id=target.dataset.id;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist();render();}
  if(action==='portion'){const recipe=recipeMap(state).get(modalContext.recipeId);const next=Math.max(recipe.minMultiplier,Math.min(recipe.maxMultiplier,(modalContext.multiplier??state.week[modalContext.dayIndex]?.meals[modalContext.mealIndex]?.multiplier??1)+Number(target.dataset.delta)));modalContext.multiplier=Math.round(next*100)/100;if(modalContext.dayIndex!=null){state.week[modalContext.dayIndex].meals[modalContext.mealIndex].multiplier=modalContext.multiplier;persist();}render();}
  if(action==='filter'){state.filters[target.dataset.filter]=!state.filters[target.dataset.filter];persist();render();}
  if(action==='regen-day'){regenerateDay(+target.dataset.day);persist();render();showToast('День обновлён');}
  if(action==='regen-week'){if(confirm('Обновить всю неделю? Текущие замены изменятся.')){state.week=generateWeek(state.settings,Date.now()%101);for(let i=0;i<7;i++)regenerateDay(i);persist();render();showToast('Неделя обновлена с учётом фильтров');}}
  if(action==='preview-replacement'){const ctx={...modalContext};openRecipe(target.dataset.id,ctx.dayIndex,ctx.mealIndex,true);modalContext.replaceContext=ctx;}
  if(action==='back-replace'){const ctx=modalContext.replaceContext||{dayIndex:modalContext.dayIndex,mealIndex:modalContext.mealIndex};modalContext=ctx;state.modal='replace';render();}
  if(action==='replacement-favorites'){modalContext.favoritesOnly=!modalContext.favoritesOnly;render();}
  if(action==='replacement-nocook'){modalContext.noCook=!modalContext.noCook;render();}
  if(action==='confirm-replacement'){const {dayIndex,mealIndex}=modalContext;const old={...state.week[dayIndex].meals[mealIndex]};const current=mealScaled(old);const r=RECIPES_BY_ID.get(target.dataset.id);state.week[dayIndex].meals[mealIndex]={...old,recipeId:r.id,multiplier:fitRecipe(r,current.calories).multiplier,eaten:false};state.undo={dayIndex,mealIndex,meal:old};state.modal=null;persist();render();showToast('Блюдо и список покупок обновлены','undo');}
  if(action==='undo'&&state.undo){const u=state.undo;state.week[u.dayIndex].meals[u.mealIndex]=u.meal;state.undo=null;persist();render();showToast('Замена отменена');}
  if(action==='shop-day'){const i=+target.dataset.day;state.grocery.selectedDays=state.grocery.selectedDays.includes(i)?state.grocery.selectedDays.filter(x=>x!==i):[...state.grocery.selectedDays,i].sort();persist();render();}
  if(action==='add-manual'){const input=document.querySelector('#manual-item');const name=input.value.trim();if(name){state.grocery.manual.push({id:`manual-${Date.now()}`,name,amount:1,unit:'шт'});persist();render();}}
  if(action==='reset-checks'&&confirm('Сбросить все отметки в списке?')){state.grocery.checked=[];persist();render();}
  if(action==='constructor'){modalContext={};state.modal='constructor';render();}
  if(action==='select-component'){const value=[target.dataset.id,+target.dataset.amount];if(target.dataset.group==='pleasure'&&modalContext.selection.pleasure?.[0]===value[0])delete modalContext.selection.pleasure;else modalContext.selection[target.dataset.group]=value;render();}
  if(action==='clear-pleasure'){delete modalContext.selection.pleasure;render();}
  if(action==='save-constructor'){saveConstructedMeal();}
  if(action==='reset-all'&&confirm('Удалить настройки, отметки и личные блюда?')){localStorage.removeItem(STORAGE_KEY);state=initialState();state.week=generateWeek(state.settings);state.modal=null;render();showToast('Личные данные сброшены');}
  if(action==='delete-weight'&&confirm('Удалить эту отметку веса?')){state.weightHistory=state.weightHistory.filter(x=>x.date!==target.dataset.date);persist();render();showToast('Отметка удалена');}
});

app.addEventListener('change', e=>{
  if(e.target.dataset.action==='shop-check'){const id=e.target.dataset.id;state.grocery.checked=e.target.checked?[...new Set([...state.grocery.checked,id])]:state.grocery.checked.filter(x=>x!==id);persist();render();}
  if(e.target.dataset.action==='hide-checked'){state.grocery.hideChecked=e.target.checked;persist();render();}
  if(e.target.matches('details[data-rec]')&&e.target.open){state.recommendationRead=[...new Set([...state.recommendationRead,e.target.dataset.rec])];persist();}
  if(e.target.name==='mode'){const presets={maintenance:1800,mild:1700,current:1600};if(presets[e.target.value])document.querySelector('[name=calories]').value=presets[e.target.value];}
  if(e.target.name==='mealCount'){const three=e.target.value==='3';const vals=three?{breakfast:30,lunch:40,snack:0,dinner:30}:{breakfast:25,lunch:35,snack:15,dinner:25};Object.entries(vals).forEach(([k,v])=>document.querySelector(`[name="dist-${k}"]`).value=v);}
  if(e.target.matches('[data-week-protein]')){state.filters.protein=e.target.value;persist();}
  if(e.target.matches('[data-replacement-protein]')){modalContext.protein=e.target.value;render();}
});

app.addEventListener('input', e=>{
  if(e.target.dataset.tracker){const output=e.target.closest('.tracker-row')?.querySelector('output');if(output)output.textContent=`${e.target.value} ${QUICK_TRACKERS.concat(EXTENDED_TRACKERS).find(t=>t.id===e.target.dataset.tracker)?.unit||''}`;}
});

app.addEventListener('submit', e=>{
  e.preventDefault();
  if(e.target.id==='settings-form')saveSettings(new FormData(e.target));
  if(e.target.id==='tracker-form')saveTrackers(e.target,new FormData(e.target));
  if(e.target.id==='weight-form')saveWeight(new FormData(e.target));
});

function saveSettings(fd) {
  let calories=+fd.get('calories'), protein=+fd.get('protein'), fat=+fd.get('fat'), carbs=+fd.get('carbs'), mealCount=+fd.get('mealCount');
  const error=document.querySelector('#settings-error'); if(calories<1200){error.innerHTML='<div class="notice error">Ниже 1 200 ккал приложение план не формирует. Такой ориентир лучше обсуждать индивидуально со специалистом.</div>';return;}
  if(calories<1400&&!confirm('Это довольно низкий ориентир для самостоятельного планирования. Сохранить его всё равно?'))return;
  const distribution={breakfast:+fd.get('dist-breakfast'),lunch:+fd.get('dist-lunch'),snack:+fd.get('dist-snack'),dinner:+fd.get('dist-dinner')};
  const relevant=mealCount===3?distribution.breakfast+distribution.lunch+distribution.dinner:Object.values(distribution).reduce((a,b)=>a+b,0);
  if(relevant!==100){error.innerHTML=`<div class="notice error">Распределение для ${mealCount} приёмов сейчас равно ${relevant}%. Нужно ровно 100%.</div>`;return;}
  const timeKeys=mealCount===3?['breakfast','lunch','dinner']:['breakfast','lunch','snack','dinner'];
  const invalidTime=timeKeys.find(k=>fd.get(`time-${k}`)>=fd.get(`time-end-${k}`));
  if(invalidTime){error.innerHTML=`<div class="notice error">Проверь интервал «${mealLabels[invalidTime]}»: время окончания должно быть позже начала.</div>`;return;}
  const calculated=macroCalories({protein,fat,carbs});
  if(Math.abs(calculated-calories)>40){if(fd.get('conflict')==='macros')calories=calculated;else{const ratio=calories/calculated;protein=Math.round(protein*ratio);fat=Math.round(fat*ratio);carbs=Math.round(carbs*ratio);}}
  state.settings={...state.settings,mode:fd.get('mode'),calories,protein,fat,carbs,weight:+fd.get('weight'),targetWeight:fd.get('targetWeight')?+fd.get('targetWeight'):'',mealCount,distribution,pleasurePerWeek:+fd.get('pleasure'),fiber:+fd.get('fiber'),excluded:fd.get('excluded'),included:fd.get('included'),times:{breakfast:fd.get('time-breakfast'),lunch:fd.get('time-lunch'),snack:fd.get('time-snack'),dinner:fd.get('time-dinner')},timeEnds:{breakfast:fd.get('time-end-breakfast'),lunch:fd.get('time-end-lunch'),snack:fd.get('time-end-snack'),dinner:fd.get('time-end-dinner')}};
  recalcWeek();
  const exclusions=state.settings.excluded.toLowerCase().split(',').map(x=>x.trim()).filter(Boolean); let replaced=0;
  if(exclusions.length) state.week.forEach((day,di)=>day.meals.forEach((meal,mi)=>{const current=recipeMap(state).get(meal.recipeId);if(current?.ingredients.some(x=>exclusions.some(term=>INGREDIENTS[x.id].name.toLowerCase().includes(term)))){const alternatives=RECIPES.filter(r=>r.category===meal.type&&!r.ingredients.some(x=>exclusions.some(term=>INGREDIENTS[x.id].name.toLowerCase().includes(term))));if(alternatives.length){const oldCalories=mealScaled(meal).calories;const next=alternatives[(di+mi)%alternatives.length];day.meals[mi]={...meal,recipeId:next.id,multiplier:fitRecipe(next,oldCalories).multiplier,eaten:false};replaced++;}}}));
  state.modal=null; persist(); render(); showToast(replaced?`План пересчитан; заменено блюд с исключениями: ${replaced}`:'План, порции и покупки пересчитаны');
}

function saveTrackers(form, fd) {
  const key=isoDay(new Date()), entry={};
  QUICK_TRACKERS.concat(EXTENDED_TRACKERS).forEach(t=>{const el=form.querySelector(`[data-tracker="${t.id}"]`);entry[t.id]=t.type==='check'?el.checked:+el.value;});
  entry.sleepDuration=fd.get('sleepDuration')?+fd.get('sleepDuration'):null; ['bowel','cycle','note'].forEach(k=>entry[k]=fd.get(k)||''); entry.reflection=[...form.querySelectorAll('.reflection')].map(x=>x.value);
  state.trackers[key]=entry; persist(); showToast('Наблюдение сохранено'); render();
}

function saveWeight(fd) {
  const date=fd.get('date'), weight=+fd.get('weight');
  if(!date||!Number.isFinite(weight)||weight<35||weight>250)return;
  const existing=state.weightHistory.find(x=>x.date===date);
  if(existing)existing.weight=weight;else state.weightHistory.push({date,weight});
  state.weightHistory.sort((a,b)=>a.date.localeCompare(b.date)); state.settings.weight=weight;
  persist(); render(); showToast(existing?'Отметка веса обновлена':'Вес добавлен в динамику');
}

function saveConstructedMeal() {
  const entries=Object.entries(modalContext.selection).filter(([,v])=>v); const ingredients=entries.map(([,v])=>({id:v[0],amount:v[1]})); const n=nutritionForIngredients(ingredients); const id=`personal-${Date.now()}`;
  const recipe={id,title:'Моя собранная тарелка',category:'lunch',categoryLabel:'Личное блюдо',description:'Собранный вручную приём пищи с точными количествами.',tags:['личное','конструктор'],basePortions:1,prepTime:10,cookTime:20,totalTime:30,difficulty:'Легко',ingredients,instructions:['Подготовьте продукты в указанных количествах.','Приготовьте белок и гарнир удобным способом без лишнего масла.','Добавьте овощи и отмеренный соус, затем подавайте.'],...n,minMultiplier:.8,maxMultiplier:1.35,suitableMealTypes:['lunch','dinner'],allergens:[],substitutions:['Любой блок можно заменить в конструкторе.'],storageNote:'Лучше приготовить перед подачей.',visual:'forest',salty:ingredients.filter(x=>INGREDIENTS[x.id].salty).length>0};
  state.personalMeals.push(recipe);state.favorites.push(id);const day=currentDay();const idx=day.meals.findIndex(m=>m.type==='lunch');day.meals[idx]={type:'lunch',recipeId:id,multiplier:1,eaten:false};state.modal=null;persist();render();showToast('Личная тарелка сохранена и добавлена в сегодня');
}

render();

