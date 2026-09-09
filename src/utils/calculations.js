import { INGREDIENTS } from '../data/ingredients.js';

export const roundTo = (value, step = 1) => Math.round(value / step) * step;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function nutritionForIngredients(list, multiplier = 1) {
  const total = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  list.forEach(({ id, amount }) => {
    const item = INGREDIENTS[id];
    if (!item) return;
    const scaled = roundTo(amount * multiplier, item.round);
    ['calories', 'protein', 'fat', 'carbs', 'fiber'].forEach((key, index) => {
      total[key] += item.per100[index] * scaled / 100;
    });
  });
  return Object.fromEntries(Object.entries(total).map(([key, value]) => [key, Math.round(value)]));
}

export function scaleRecipe(recipe, multiplier) {
  const safe = clamp(multiplier, recipe.minMultiplier, recipe.maxMultiplier);
  const ingredients = recipe.ingredients.map(item => {
    const ref = INGREDIENTS[item.id];
    const amount = roundTo(item.amount * safe, ref.round);
    const count = item.count ? Math.max(1, Math.round(item.count * safe)) : null;
    return { ...item, amount, ...(count ? { count } : {}) };
  });
  return { ...recipe, multiplier: safe, ingredients, ...nutritionForIngredients(ingredients) };
}

export function fitRecipe(recipe, targetCalories) {
  return scaleRecipe(recipe, targetCalories / Math.max(1, recipe.calories));
}

export function macroCalories({ protein, fat, carbs }) {
  return protein * 4 + fat * 9 + carbs * 4;
}

export function aggregateGroceries(week, recipesById, selectedDays = [0,1,2,3,4,5,6]) {
  const totals = new Map();
  week.forEach((day, dayIndex) => {
    if (!selectedDays.includes(dayIndex)) return;
    day.meals.forEach(meal => {
      const recipe = recipesById.get(meal.recipeId);
      if (!recipe) return;
      scaleRecipe(recipe, meal.multiplier).ingredients.forEach(item => {
        const ref = INGREDIENTS[item.id];
        const previous = totals.get(item.id) || { id: item.id, name: ref.name, category: ref.category, unit: ref.unit, amount: 0 };
        previous.amount += item.amount;
        totals.set(item.id, previous);
      });
    });
  });
  return [...totals.values()].map(item => ({
    ...item,
    amount: Math.round(item.amount),
    purchaseAmount: item.unit === 'мл' ? Math.ceil(item.amount / 100) * 100 : Math.ceil(item.amount / 50) * 50
  })).sort((a,b) => a.category.localeCompare(b.category, 'ru') || a.name.localeCompare(b.name, 'ru'));
}

export const sumNutrition = items => items.reduce((sum, item) => {
  ['calories','protein','fat','carbs','fiber'].forEach(key => sum[key] += item[key] || 0);
  return sum;
}, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

