import assert from 'node:assert/strict';
import { RECIPES, RECIPE_COUNTS, RECIPES_BY_ID } from '../src/data/recipes.js';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { aggregateGroceries, fitRecipe, macroCalories, nutritionForIngredients, scaleRecipe } from '../src/utils/calculations.js';

assert.equal(RECIPES.length, 100, 'Каталог должен содержать ровно 100 блюд');
assert.deepEqual(RECIPE_COUNTS, { breakfast:20, lunch:25, dinner:25, snack:15, pleasure:15 });
assert.equal(new Set(RECIPES.map(r=>r.id)).size, 100, 'ID должны быть уникальными');
assert.equal(new Set(RECIPES.map(r=>r.title)).size, 100, 'Названия должны быть уникальными');

for (const recipe of RECIPES) {
  for (const key of ['id','title','category','description','tags','basePortions','prepTime','cookTime','totalTime','difficulty','ingredients','instructions','calories','protein','fat','carbs','fiber','minMultiplier','maxMultiplier','suitableMealTypes','allergens','substitutions','storageNote','visual']) {
    assert.notEqual(recipe[key], undefined, `${recipe.title}: отсутствует ${key}`);
  }
  assert.equal(recipe.basePortions, 1);
  assert.ok(recipe.ingredients.length >= 1);
  assert.ok(recipe.instructions.length >= 2);
  recipe.ingredients.forEach(x=>assert.ok(INGREDIENTS[x.id], `${recipe.title}: неизвестный ингредиент ${x.id}`));
  assert.deepEqual(nutritionForIngredients(recipe.ingredients), { calories:recipe.calories, protein:recipe.protein, fat:recipe.fat, carbs:recipe.carbs, fiber:recipe.fiber });
  assert.ok(recipe.calories > 50 && recipe.calories < 1000, `${recipe.title}: неправдоподобная калорийность`);
}

const sample=RECIPES[0];
const scaled=scaleRecipe(sample,1.2);
assert.ok(scaled.calories>sample.calories);
assert.ok(scaled.multiplier<=sample.maxMultiplier);
const fitted=fitRecipe(sample,500);
assert.ok(fitted.multiplier>=sample.minMultiplier && fitted.multiplier<=sample.maxMultiplier);
assert.equal(macroCalories({protein:115,fat:55,carbs:160}),1595);

const week=Array.from({length:7},(_,i)=>({date:`2026-09-${String(i+7).padStart(2,'0')}`,meals:[{recipeId:sample.id,multiplier:1}]}));
const groceries=aggregateGroceries(week,RECIPES_BY_ID,[0,1]);
assert.equal(groceries[0].amount, sample.ingredients.find(x=>x.id===groceries[0].id).amount*2);

console.log(`✓ ${RECIPES.length} блюд: 20 завтраков, 25 обедов, 25 ужинов, 15 перекусов, 15 для удовольствия`);
console.log('✓ Полнота данных, нутриенты, масштабирование и агрегация покупок проверены');

