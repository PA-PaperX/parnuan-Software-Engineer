'use client'

import { FormEvent, useMemo, useState } from 'react'
import { parseExpenseMessage, type Transaction } from '@/lib/expense-parser'

type EditDraft = {
  description: string
  amount: string
  category: string
  date: string
  time: string
}

const categoryOptions = ['อาหาร', 'เครื่องดื่ม', 'เดินทาง', 'ช้อปปิ้ง', 'สุขภาพ', 'บิลและสาธารณูปโภค', 'อื่น ๆ']

function formatAmount(amount: number) {
  return `฿${amount.toFixed(2)}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function createInitialTransactions(): Transaction[] {
  const now = new Date()
  const date = dateKey(now)
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const base = { date, time, timeSource: 'message' as const, warnings: [] as string[] }

  return [
    { ...base, id: '1', description: 'ข้าวมันไก่', category: 'อาหาร', amount: 50, sourceText: 'ข้าวมันไก่ 50' },
    { ...base, id: '2', description: 'น้ำเปล่า', category: 'เครื่องดื่ม', amount: 7, sourceText: 'น้ำเปล่า 7' },
    { ...base, id: '3', description: 'ช้อปปิ้ง', category: 'ช้อปปิ้ง', amount: 500, sourceText: 'ช้อปปิ้ง 500' },
  ]
}

function formatDateLabel(date: string | null) {
  if (!date) return 'ไม่ระบุวันที่'

  const today = new Date()
  if (date === dateKey(today)) return 'วันนี้'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === dateKey(yesterday)) return 'เมื่อวาน'

  return date
}

function normalizeManualTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/)
  if (!match) return null

  const hour = Number(match[1])
  if (hour > 23) return null

  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

export default function ReceiptPage() {
  const [message, setMessage] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>(createInitialTransactions)
  const [status, setStatus] = useState<'draft' | 'confirmed'>('draft')
  const [notice, setNotice] = useState('ข้อมูลยังไม่ถูกบันทึก')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({ description: '', amount: '', category: '', date: '', time: '' })

  const total = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    [transactions],
  )

  function handleSplit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTransactions = parseExpenseMessage(message)

    if (nextTransactions.length === 0) {
      setNotice('ยังแยกรายการไม่ได้ ลองใส่ชื่อรายการและจำนวนเงิน')
      return
    }

    setTransactions(nextTransactions)
    setStatus('draft')
    setNotice('ตรวจสอบรายการก่อนยืนยัน')
  }

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id)
    setEditDraft({
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category,
      date: transaction.date ?? '',
      time: transaction.time ?? '',
    })
  }

  function saveEditing() {
    const amount = Number(editDraft.amount)
    if (!editDraft.description.trim() || !Number.isFinite(amount) || amount < 0) return

    const time = editDraft.time.trim()
    const normalizedTime = time ? normalizeManualTime(time) : null
    if (time && !normalizedTime) {
      setNotice('กรุณาใส่เวลาเป็นรูปแบบ ชั่วโมง:นาที เช่น 12:00')
      return
    }

    setTransactions((current) => current.map((transaction) => (
      transaction.id === editingId
        ? {
            ...transaction,
            description: editDraft.description.trim(),
            amount,
            category: editDraft.category,
            date: editDraft.date || null,
            time: normalizedTime,
            timeSource: normalizedTime ? 'message' : transaction.timeSource,
            warnings: normalizedTime
              ? transaction.warnings.filter((warning) => !warning.includes('เวลา'))
              : transaction.warnings,
          }
        : transaction
    )))
    setEditingId(null)
    setNotice('แก้ไขรายการแล้ว ตรวจสอบอีกครั้งก่อนยืนยัน')
  }

  function deleteTransaction(id: string) {
    setTransactions((current) => current.filter((transaction) => transaction.id !== id))
    setEditingId(null)
    setNotice('ลบรายการแล้ว')
  }

  function clearTransactions() {
    setTransactions([])
    setEditingId(null)
    setStatus('draft')
    setNotice('ยังไม่มีรายการ')
  }

  function confirmTransactions() {
    if (transactions.length === 0) return
    setStatus('confirmed')
    setNotice('ยืนยันรายการแล้ว')
  }

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 text-neutral-950 sm:py-12">
      <section className="mx-auto w-full max-w-[620px] border border-neutral-300 bg-white px-6 py-9 sm:px-14">
        <header>
          <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-neutral-600">PARNUAN / EXPENSE NOTE</p>
          <h1 className="mb-1 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">รายการใช้จ่าย</h1>
          <p className="mb-8 text-sm text-neutral-600">ตรวจสอบรายการก่อนบันทึก</p>
        </header>

        <form onSubmit={handleSplit}>
          <label className="mb-2 block text-[13px] font-bold" htmlFor="expense-message">ข้อความใหม่</label>
          <textarea
            className="block w-full resize-y rounded-none border border-neutral-950 bg-neutral-50 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
            id="expense-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="เช่น ข้าวมันไก่ 50 น้ำเปล่า 7"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button className="border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-neutral-800" type="submit">
              แยกรายการ
            </button>
          </div>
        </form>

        <hr className="my-8 border-0 border-t border-dashed border-neutral-950" />

        <div className="mb-2 flex justify-between gap-4 text-xs font-bold text-neutral-600">
          <span>รายการที่พบ {transactions.length} รายการ</span>
          <span>{status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ'}</span>
        </div>

        <section aria-live="polite">
          {transactions.length === 0 ? (
            <p className="border-y border-neutral-300 py-6 text-center text-sm text-neutral-600">ยังไม่มีรายการให้ตรวจสอบ</p>
          ) : transactions.map((transaction) => (
            <article className="flex items-start justify-between gap-4 border-t border-neutral-300 py-4" key={transaction.id}>
              {editingId === transaction.id ? (
                <div className="grid w-full gap-3 sm:grid-cols-2">
                  <label className="text-[13px] font-bold sm:col-span-2">
                    รายละเอียด
                    <input
                      className="mt-1.5 block w-full rounded-none border border-neutral-950 bg-neutral-50 px-2.5 py-2 font-normal outline-none focus:ring-2 focus:ring-neutral-400"
                      value={editDraft.description}
                      onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                    />
                  </label>
                  <label className="text-[13px] font-bold">
                    จำนวนเงิน
                    <input
                      className="mt-1.5 block w-full rounded-none border border-neutral-950 bg-neutral-50 px-2.5 py-2 font-normal outline-none focus:ring-2 focus:ring-neutral-400"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDraft.amount}
                      onChange={(event) => setEditDraft({ ...editDraft, amount: event.target.value })}
                    />
                  </label>
                  <label className="text-[13px] font-bold">
                    หมวดหมู่
                    <select
                      className="mt-1.5 block w-full rounded-none border border-neutral-950 bg-neutral-50 px-2.5 py-2 font-normal outline-none focus:ring-2 focus:ring-neutral-400"
                      value={editDraft.category}
                      onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}
                    >
                      {categoryOptions.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="text-[13px] font-bold">
                    วันที่
                    <input
                      className="mt-1.5 block w-full rounded-none border border-neutral-950 bg-neutral-50 px-2.5 py-2 font-normal outline-none focus:ring-2 focus:ring-neutral-400"
                      type="date"
                      value={editDraft.date}
                      onChange={(event) => setEditDraft({ ...editDraft, date: event.target.value })}
                    />
                  </label>
                  <label className="text-[13px] font-bold">
                    เวลา
                    <input
                      className="mt-1.5 block w-full rounded-none border border-neutral-950 bg-neutral-50 px-2.5 py-2 font-normal outline-none focus:ring-2 focus:ring-neutral-400"
                      type="text"
                      inputMode="numeric"
                      placeholder="เช่น 12:00"
                      value={editDraft.time}
                      onChange={(event) => setEditDraft({ ...editDraft, time: event.target.value })}
                    />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button className="border border-neutral-950 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100" type="button" onClick={saveEditing}>บันทึก</button>
                    <button className="border border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100" type="button" onClick={() => setEditingId(null)}>ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="mb-1 text-base font-bold">{transaction.description}</h2>
                    <p className="mb-2 text-xs text-neutral-600">{transaction.category} · {formatDateLabel(transaction.date)} {transaction.time ?? 'เวลาไม่ระบุ'}</p>
                    {transaction.warnings.map((warning) => (
                      <p className="mb-2 max-w-[360px] text-[11px] text-neutral-600" key={warning}>เตือน: {warning}</p>
                    ))}
                    <div className="flex gap-2">
                      <button className="border border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100" type="button" onClick={() => startEditing(transaction)}>แก้ไข</button>
                      <button className="border border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100" type="button" onClick={() => deleteTransaction(transaction.id)}>ลบ</button>
                    </div>
                  </div>
                  <span className="shrink-0 text-[17px] font-bold tabular-nums">{formatAmount(transaction.amount)}</span>
                </>
              )}
            </article>
          ))}
        </section>

        <div className="mt-5 flex justify-between border-t-2 border-neutral-950 pt-4 text-lg font-bold">
          <span>รวมทั้งหมด</span>
          <span className="text-[22px] tabular-nums">{formatAmount(total)}</span>
        </div>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button className="flex-1 border border-neutral-950 bg-white px-4 py-2.5 text-[13px] font-bold hover:bg-neutral-100" type="button" onClick={clearTransactions}>ล้างรายการ</button>
          <button className="flex-1 border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-neutral-800" type="button" onClick={confirmTransactions}>ยืนยันรายการ</button>
        </div>

        <footer className="mt-8 flex justify-between gap-4 border-t border-dotted border-neutral-300 pt-4 text-[11px] text-neutral-600">
          <span aria-live="polite">{notice}</span>
          <span>ตรวจแล้วค่อยยืนยัน</span>
        </footer>
      </section>
    </main>
  )
}
