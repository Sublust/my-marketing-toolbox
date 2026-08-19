export const NAME_STANDARDIZATION_MAP: Record<string, string> = {
  'аня': 'Аня Джура',
  'аня джура': 'Аня Джура',
  'влад': 'Влад Гула',
  'влад гула': 'Влад Гула',
  'макс': 'Максим Дерій',
  'максим': 'Максим Дерій',
  'максим дерій': 'Максим Дерій',
  'оксана': 'Оксана Харкава',
  'оксана харкава': 'Оксана Харкава',
  'таня': 'Тетяна Мельник',
  'тетяна': 'Тетяна Мельник',
  'тетяна мельник': 'Тетяна Мельник',
  'ярослав': 'Ярослав Кишко',
  'ярослав кишко': 'Ярослав Кишко',
  'вова': 'Володимир Пліуто',
  'вова pm': 'Володимир Пліуто',
  'володимир': 'Володимир Пліуто',
  'володимир пліуто': 'Володимир Пліуто',
  'ксюша': 'Ксюша Бородій',
  'ксюша pm': 'Ксюша Бородій',
  'ксюша бородій': 'Ксюша Бородій',
  'слава': 'Слава Пасічник',
  'слава пасічник': 'Слава Пасічник',
}

/**
 * Returns the standardized canonical Full Name (First Name + Last Name)
 */
export function getCanonicalFullName(name: string | null | undefined): string {
  if (!name) return ''
  const trimmed = name.trim()
  const lower = trimmed.toLowerCase()
  return NAME_STANDARDIZATION_MAP[lower] || trimmed
}

/**
 * Flexible matching function checking if two names refer to the same person
 */
export function areSamePerson(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  if (!nameA || !nameB) return false
  const canonA = getCanonicalFullName(nameA).toLowerCase()
  const canonB = getCanonicalFullName(nameB).toLowerCase()
  if (canonA === canonB) return true

  const a = nameA.trim().toLowerCase()
  const b = nameB.trim().toLowerCase()
  if (a === b) return true

  const firstA = a.split(' ')[0]
  const firstB = b.split(' ')[0]
  if (firstA && firstB) {
    if (firstA === firstB) return true
    if (a.includes(firstB) || b.includes(firstA)) return true
    if (firstA.slice(0, 3) === firstB.slice(0, 3)) return true
  }
  return false
}
