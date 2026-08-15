import { describe, expect, it } from 'vitest'
import { parseExpenseMessage } from './expense-parser'

const now = new Date(2026, 7, 15, 13, 58)

describe('parseExpenseMessage', () => {
  it('แยกรายการเดียวพร้อมจำนวนเงิน', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 50', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50, category: 'อาหาร', time: '13:58' },
    ])
  })

  it('แยกหลายรายการและตัดคำเชื่อมออก', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 50 น้ำเปล่า 7 แล้วก็ช้อปปิ้ง 500', { now }))
      .toMatchObject([
        { description: 'ข้าวมันไก่', amount: 50 },
        { description: 'น้ำเปล่า', amount: 7, category: 'เครื่องดื่ม' },
        { description: 'ช้อปปิ้ง', amount: 500, category: 'ช้อปปิ้ง' },
      ])
  })

  it('คืนค่าว่างเมื่อยังไม่มีจำนวนเงิน', () => {
    expect(parseExpenseMessage('ซื้อของ', { now })).toEqual([])
  })

  it('อ่านเวลาหลายรูปแบบและไม่เอาเลขเวลาไปนับเป็นเงิน', () => {
    expect(parseExpenseMessage('บ่าย 3 ข้าวมันไก่ 50', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50, time: '15:00', timeSource: 'message' },
    ])
    expect(parseExpenseMessage('เมื่อวานตอน 5 โมงครึ่ง ข้าวมันไก่ 50', { now }))
      .toMatchObject([{ description: 'ข้าวมันไก่', date: '2026-08-14', time: '17:30' }])
  })

  it('อ่านเที่ยงและเที่ยงคืน', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 50 เที่ยง', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50, time: '12:00', timeSource: 'message' },
    ])
    expect(parseExpenseMessage('ข้าวมันไก่ 50 ตอนเที่ยงคืน', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50, time: '00:00', timeSource: 'message' },
    ])
  })

  it('แจ้งเตือนเมื่อเวลา 6 โมงยังไม่ชัดเจน', () => {
    expect(parseExpenseMessage('6 โมง ข้าวมันไก่ 50', { now })).toMatchObject([
      {
        description: 'ข้าวมันไก่',
        time: null,
        timeSource: 'ambiguous',
        warnings: ['เวลา 6 โมงยังไม่ชัดว่าเช้าหรือเย็น'],
      },
    ])
  })

  it('แปลงเลขไทยเป็นจำนวนเงิน', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ ๕๐', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 50 },
    ])
  })

  it('รองรับรูปแบบจำนวนเงินที่เขียนต่างกัน', () => {
    expect(parseExpenseMessage('ข้าวมันไก่ 10บาท', { now })).toMatchObject([
      { description: 'ข้าวมันไก่', amount: 10 },
    ])
    expect(parseExpenseMessage('น้ำเปล่า 10 บาท', { now })).toMatchObject([
      { description: 'น้ำเปล่า', amount: 10 },
    ])
    expect(parseExpenseMessage('กาแฟ ฿10.50', { now })).toMatchObject([
      { description: 'กาแฟ', amount: 10.5 },
    ])
    expect(parseExpenseMessage('ของใช้ 1,000 บาท', { now })).toMatchObject([
      { description: 'ของใช้', amount: 1000 },
    ])
  })
})
