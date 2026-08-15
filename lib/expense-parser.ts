export type Transaction = {
  id: string
  description: string
  category: string
  amount: number
  time: string
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

export function parseExpenseMessage(message: string): Transaction[] {
  const matches = [...message.matchAll(/([^\d]+?)\s*(\d+(?:\.\d+)?)/g)]

  return matches
    .map((match, index) => ({
      id: `${Date.now()}-${index}`,
      description: cleanDescription(match[1]),
      category: categoryFor(match[1]),
      amount: Number(match[2]),
      time: 'วันนี้ 13:58',
    }))
    .filter((transaction) => transaction.description.length > 0)
}
