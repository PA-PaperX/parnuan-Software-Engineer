import { describe, expect, it } from 'vitest'
import { parseExpenseMessage } from './expense-parser'

describe('parseExpenseMessage', () => {
  it('แยกรายการเดียวพร้อมจำนวนเงิน', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 50')).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50, category: 'อาหาร' },
    ])
  })

  it('แยกหลายรายการและตัดคำเชื่อมออก', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 50 น้ำเปล่า 7 แล้วก็ช้อปปิ้ง 500'))
      .toMatchObject([
        { description: 'ข้าวมันไก่', amount: 50 },
        { description: 'น้ำเปล่า', amount: 7, category: 'เครื่องดื่ม' },
        { description: 'ช้อปปิ้ง', amount: 500, category: 'ช้อปปิ้ง' },
      ])
  })

  it('คืนค่าว่างเมื่อยังไม่มีจำนวนเงิน', () => {
    expect(parseExpenseMessage('ซื้อของ')).toEqual([])
  })
})
