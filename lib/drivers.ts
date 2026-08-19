// Водители демо-парка: имя, фамилия, телефон, стаж.
//
// Держим в одном месте, чтобы карточка заявки, автопарк и контакты
// показывали одного и того же человека, а не расходились в написании.

export type Driver = {
  /** Как записан в vehicles.driver и orders.driver. */
  key: string
  firstName: string
  lastName: string
  patronymic: string
  phone: string
  /** Стаж работы на грузовых, лет. */
  experienceYears: number
  license: string
}

export const DRIVERS: Driver[] = [
  { key: "Ахмет С.", firstName: "Ахмет", lastName: "Сарсенов", patronymic: "Бекболатұлы", phone: "+7 701 342 18 05", experienceYears: 12, license: "C, CE" },
  { key: "Батыр Ж.", firstName: "Батыр", lastName: "Жумагулов", patronymic: "Ерланұлы", phone: "+7 705 219 44 71", experienceYears: 8, license: "C, CE" },
  { key: "Нурлан Б.", firstName: "Нурлан", lastName: "Бекжанов", patronymic: "Сериковичс", phone: "+7 702 883 90 26", experienceYears: 15, license: "C, CE, D" },
  { key: "Арман Т.", firstName: "Арман", lastName: "Турсынов", patronymic: "Маратұлы", phone: "+7 747 561 07 33", experienceYears: 6, license: "C" },
  { key: "Серик К.", firstName: "Серик", lastName: "Кенжебаев", patronymic: "Нурланұлы", phone: "+7 708 130 55 92", experienceYears: 19, license: "C, CE" },
  { key: "Дауит М.", firstName: "Дауит", lastName: "Муратов", patronymic: "Асқарұлы", phone: "+7 700 924 76 48", experienceYears: 4, license: "C" },
]

const BY_KEY = new Map(DRIVERS.map((d) => [d.key, d]))

/** Ищет водителя по короткой записи вида «Ахмет С.». */
export function findDriver(key: string | null | undefined): Driver | null {
  if (!key) return null
  const direct = BY_KEY.get(key.trim())
  if (direct) return direct
  // Строка вида «A 123 BCA 16 · Актау → Жанаозен · Ахмет С.» — берём хвост
  const tail = key.split("·").at(-1)?.trim()
  return tail ? BY_KEY.get(tail) ?? null : null
}

/** «Сарсенов Ахмет Бекболатұлы» */
export function fullName(d: Driver): string {
  return `${d.lastName} ${d.firstName} ${d.patronymic}`
}

/** «АС» — для аватара. */
export function driverInitials(d: Driver): string {
  return `${d.lastName[0]}${d.firstName[0]}`
}
