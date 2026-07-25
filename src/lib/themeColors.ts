/** Elk palet volgt dezelfde opbouw als het oorspronkelijke blauw (lichte tint op 50,
 * hoofdkleur op 500, donker op 700), zodat de rest van de app — die overal
 * bg-blue-500/text-blue-500/border-blue-400 etc. gebruikt — er zonder verdere aanpassing
 * mee kan renderen. Aura (oranje) hoort hier bewust niet bij: dat blijft een apart accent. */
export const THEME_COLORS = {
  blauw: {
    label: 'Blauw',
    50: '#F4F8FC',
    100: '#E4EEF6',
    200: '#C7DCEC',
    400: '#5D8CB3',
    500: '#3F739F',
    600: '#345E82',
    700: '#2A4C69',
  },
  groen: {
    label: 'Groen',
    50: '#F3F8F4',
    100: '#E1EEE4',
    200: '#C3DDC9',
    400: '#6FA37D',
    500: '#4F8760',
    600: '#416F4F',
    700: '#345A40',
  },
  paars: {
    label: 'Paars',
    50: '#F6F4F9',
    100: '#EAE4F1',
    200: '#D2C5E3',
    400: '#9075B3',
    500: '#78589F',
    600: '#634982',
    700: '#513C69',
  },
  framboos: {
    label: 'Framboos',
    50: '#FAF4F6',
    100: '#F2E1E7',
    200: '#E3C1CE',
    400: '#C1708F',
    500: '#A85273',
    600: '#8B435F',
    700: '#71364D',
  },
  teal: {
    label: 'Teal',
    50: '#F1F8F7',
    100: '#DFEEEC',
    200: '#BEDDD9',
    400: '#59A69C',
    500: '#3D8C81',
    600: '#33726A',
    700: '#2A5C56',
  },
  terracotta: {
    label: 'Terracotta',
    50: '#FAF5F2',
    100: '#F2E3DA',
    200: '#E4C5B4',
    400: '#C17F5C',
    500: '#A8623F',
    600: '#8B5033',
    700: '#714029',
  },
} as const

export type ThemeColorKey = keyof typeof THEME_COLORS

export const THEME_COLOR_KEYS = Object.keys(THEME_COLORS) as ThemeColorKey[]

const DEFAULT_THEME_COLOR: ThemeColorKey = 'blauw'

const SHADES = [50, 100, 200, 400, 500, 600, 700] as const

/** Overschrijft de --color-blue-*-variabelen op :root, zodat elke bg-blue-500 / text-blue-500
 * / border-blue-400 etc. in de hele app meteen het gekozen palet gebruikt. */
export function applyThemeColor(key: string | null | undefined) {
  const palette = THEME_COLORS[key as ThemeColorKey] ?? THEME_COLORS[DEFAULT_THEME_COLOR]
  const root = document.documentElement
  for (const shade of SHADES) {
    root.style.setProperty(`--color-blue-${shade}`, palette[shade])
  }
}
