export const QUICK_TRACKERS = [
  { id: 'water', label: 'Вода', min: 0, max: 2000, step: 250, unit: 'мл', default: 1000 },
  { id: 'meals', label: 'Приёмы пищи', min: 0, max: 4, step: 1, unit: 'из 4', default: 3 },
  { id: 'protein', label: 'Белок регулярно', type: 'check', default: false },
  { id: 'produce', label: 'Овощи и фрукты', min: 0, max: 5, step: 1, unit: 'порций', default: 3 },
  { id: 'pleasure', label: 'Запланированное удовольствие', type: 'check', default: false },
  { id: 'hunger', label: 'Голод перед едой', min: 0, max: 10, step: 1, unit: '/10', default: 5 },
  { id: 'craving', label: 'Тяга к сладкому', min: 0, max: 10, step: 1, unit: '/10', default: 5 },
  { id: 'energyDay', label: 'Энергия днём', min: 0, max: 10, step: 1, unit: '/10', default: 5 },
  { id: 'bloating', label: 'Вздутие', min: 0, max: 10, step: 1, unit: '/10', default: 3 },
  { id: 'sleepQuality', label: 'Качество сна', min: 0, max: 10, step: 1, unit: '/10', default: 5 }
];

export const EXTENDED_TRACKERS = [
  ['energyMorning','Энергия утром'],['energyEvening','Энергия вечером'],['sleepiness','Сонливость после еды'],['stress','Стресс'],['mood','Настроение'],['heaviness','Тяжесть после еды'],['puffiness','Отёчность']
].map(([id,label]) => ({ id, label, min: 0, max: 10, step: 1, unit: '/10', default: 5 }));

