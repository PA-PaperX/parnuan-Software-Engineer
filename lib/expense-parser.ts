import { z } from 'zod'

export const transactionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().nonnegative(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  timeSource: z.enum(['message', 'default', 'ambiguous']),
  warnings: z.array(z.string()),
  sourceText: z.string().min(1),
})

export type Transaction = z.infer<typeof transactionSchema>

type ParseOptions = {
  now?: Date
}

type TemporalInfo = {
  date: string | null
  time: string | null
  timeSource: Transaction['timeSource']
  warnings: string[]
  matchedText: string
}

const thaiDigits: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
}

function normalizeDigits(value: string) {
  return value.replace(/[๐-๙]/g, (digit) => thaiDigits[digit])
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDate(date: Date, days: number) {
  const shifted = new Date(date)
  shifted.setDate(shifted.getDate() + days)
  return dateKey(shifted)
}

function currentTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function cleanDescription(value: string) {
  return value.trim().replace(/^(แล้วก็|และ|,)+\s*/i, '').trim()
}

function categoryFor(description: string) {
  if (/น้ำ|กาแฟ|ชา|ดื่ม/i.test(description)) return 'เครื่องดื่ม'
  if (/เสื้อ|ของใช้|สำอาง|ครีม|ช้อป/i.test(description)) return 'ช้อปปิ้ง'
  if (/รถ|แท็กซี่|เดินทาง|น้ำมัน/i.test(description)) return 'เดินทาง'
  if (/ยา|หมอ|โรงพยาบาล/i.test(description)) return 'สุขภาพ'
  if (/ข้าว|อาหาร|ก๋วยเตี๋ยว|ขนม|ไก่|หมู|ปิ้ง|ปลา/i.test(description)) return 'อาหาร'
  return 'อื่น ๆ'
}

function toClock(hour: number, minute: number, period?: string) {
  if (hour > 23 || minute > 59) return null

  let normalizedHour = hour
  if (/บ่าย|เย็น|ค่ำ/.test(period ?? '') && normalizedHour < 12) normalizedHour += 12
  if (/เที่ยง/.test(period ?? '')) normalizedHour = 12
  if (/เที่ยงคืน/.test(period ?? '')) normalizedHour = 0

  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseTemporal(message: string, now: Date): TemporalInfo {
  const explicitTime = message.match(/(?:(วันนี้|เมื่อวาน|พรุ่งนี้)\s*)?(?:ตอน\s*)?(\d{1,2}):(\d{2})/)
  const hourTime = message.match(
    /(?:(วันนี้|เมื่อวาน|พรุ่งนี้)\s*)?(?:(ตอน)\s*)?(?:(เช้า|สาย|บ่าย|เย็น|ค่ำ)\s*)?(\d{1,2})(?:\s*โมง)?(?:\s*(ครึ่ง))?(?:\s*(เช้า|สาย|บ่าย|เย็น|ค่ำ))?/,
  )
  const dateReference = message.match(/วันนี้|เมื่อวาน|พรุ่งนี้/)
  const dateOffset = dateReference?.[0] === 'เมื่อวาน' ? -1 : dateReference?.[0] === 'พรุ่งนี้' ? 1 : 0
  const date = dateReference ? shiftDate(now, dateOffset) : dateKey(now)

  if (explicitTime) {
    const time = toClock(Number(explicitTime[2]), Number(explicitTime[3]))
    return {
      date,
      time,
      timeSource: time ? 'message' : 'ambiguous',
      warnings: time ? [] : ['เวลาที่ระบุไม่ถูกต้อง'],
      matchedText: explicitTime[0],
    }
  }

  const noonTime = message.match(/(?:ตอน\s*)?(เที่ยงคืน|เที่ยง)/)
  if (noonTime) {
    return {
      date,
      time: noonTime[1] === 'เที่ยงคืน' ? '00:00' : '12:00',
      timeSource: 'message',
      warnings: [],
      matchedText: noonTime[0],
    }
  }

  if (hourTime) {
    const prefix = hourTime[3]
    const hour = Number(hourTime[4])
    const hasHalf = Boolean(hourTime[5])
    const suffix = hourTime[6]
    const hasTimeCue = Boolean(prefix || suffix || hasHalf || hourTime[0].includes('โมง') || hourTime[2])

    if (hasTimeCue) {
      const isConversationalHalfHour = hasHalf && Boolean(hourTime[2]) && !prefix && !suffix
      const time = isConversationalHalfHour
        ? toClock(hour, 30, 'เย็น')
        : toClock(hour, hasHalf ? 30 : 0, suffix ?? prefix)
      const isAmbiguous = !prefix && !suffix && !isConversationalHalfHour

      return {
        date,
        time: isAmbiguous ? null : time,
        timeSource: isAmbiguous ? 'ambiguous' : 'message',
        warnings: isAmbiguous ? [`เวลา ${hour} โมงยังไม่ชัดว่าเช้าหรือเย็น`] : [],
        matchedText: hourTime[0],
      }
    }
  }

  return {
    date,
    time: currentTime(now),
    timeSource: 'default',
    warnings: ['ไม่ได้ระบุเวลา ระบบใช้เวลาที่รับข้อความเป็นค่าเริ่มต้น'],
    matchedText: dateReference?.[0] ?? '',
  }
}

export function parseExpenseMessage(message: string, options: ParseOptions = {}): Transaction[] {
  const now = options.now ?? new Date()
  const normalizedMessage = normalizeDigits(message)
  const temporal = parseTemporal(normalizedMessage, now)
  const transactionText = temporal.matchedText
    ? normalizedMessage.replace(temporal.matchedText, ' ')
    : normalizedMessage
  const matches = [...transactionText.matchAll(/([^\d]+?)\s*(\d+(?:\.\d+)?)/g)]

  return matches
    .map((match, index) => transactionSchema.parse({
      id: `${Date.now()}-${index}`,
      description: cleanDescription(match[1]),
      category: categoryFor(match[1]),
      amount: Number(match[2]),
      date: temporal.date,
      time: temporal.time,
      timeSource: temporal.timeSource,
      warnings: temporal.warnings,
      sourceText: match[0].trim(),
    }))
    .filter((transaction) => transaction.description.length > 0)
}
