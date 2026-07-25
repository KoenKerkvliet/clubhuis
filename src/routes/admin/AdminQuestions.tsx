import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Pill } from '@/components/ui/Pill'

interface Question {
  id: string
  key: string
  label: string
  sort_order: number
  active: boolean
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('profile_questions')
      .select('id, key, label, sort_order, active')
      .order('sort_order')
    setQuestions((data as Question[]) ?? [])
  }

  async function addQuestion(e: FormEvent) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return

    const key = slugify(label)
    if (!key) {
      setError('Geef de vraag een gewone naam met letters.')
      return
    }

    const highest = questions?.reduce((max, q) => Math.max(max, q.sort_order), 0) ?? 0
    const { error: insertError } = await supabase
      .from('profile_questions')
      .insert({ key, label, sort_order: highest + 10 })

    if (insertError) {
      setError(
        insertError.message.includes('duplicate')
          ? 'Deze vraag bestaat al.'
          : 'Toevoegen lukte niet. Probeer het nog eens.',
      )
      return
    }

    setNewLabel('')
    setError(null)
    load()
  }

  async function rename(id: string, label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    await supabase.from('profile_questions').update({ label: trimmed }).eq('id', id)
    setQuestions((prev) => prev?.map((q) => (q.id === id ? { ...q, label: trimmed } : q)) ?? null)
  }

  async function toggleActive(question: Question) {
    await supabase.from('profile_questions').update({ active: !question.active }).eq('id', question.id)
    setQuestions((prev) => prev?.map((q) => (q.id === question.id ? { ...q, active: !q.active } : q)) ?? null)
  }

  async function move(question: Question, direction: -1 | 1) {
    if (!questions) return
    const index = questions.findIndex((q) => q.id === question.id)
    const swapWith = questions[index + direction]
    if (!swapWith) return

    await Promise.all([
      supabase.from('profile_questions').update({ sort_order: swapWith.sort_order }).eq('id', question.id),
      supabase.from('profile_questions').update({ sort_order: question.sort_order }).eq('id', swapWith.id),
    ])

    const next = [...questions]
    next[index] = { ...swapWith, sort_order: question.sort_order }
    next[index + direction] = { ...question, sort_order: swapWith.sort_order }
    setQuestions(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Vriendenboekje</h1>
        <p className="mt-1 text-ink-400">
          De vragen die kinderen op hun profiel kunnen invullen. Uitzetten verbergt een vraag zonder antwoorden te
          verwijderen.
        </p>
      </div>

      <Card>
        <form onSubmit={addQuestion} className="flex flex-col gap-3">
          <Field
            id="new-question"
            label="Nieuwe vraag"
            placeholder="bijv. Mooiste vakantie"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          {error && <p className="text-sm font-bold text-warn-text">{error}</p>}
          <Button type="submit" disabled={!newLabel.trim()}>
            Vraag toevoegen
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {questions === null && <p className="text-sm text-ink-400">Even ophalen...</p>}

        {questions?.map((question, index) => (
          <Card key={question.id} className={question.active ? '' : 'opacity-70'}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(question, -1)}
                  disabled={index === 0}
                  aria-label="Omhoog"
                  className="h-7 w-7 rounded-lg bg-neutral-badge font-extrabold text-ink-500 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(question, 1)}
                  disabled={index === questions.length - 1}
                  aria-label="Omlaag"
                  className="h-7 w-7 rounded-lg bg-neutral-badge font-extrabold text-ink-500 disabled:opacity-40"
                >
                  ↓
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent font-extrabold text-ink-900 outline-none"
                  defaultValue={question.label}
                  onBlur={(e) => rename(question.id, e.target.value)}
                />
                <p className="truncate text-xs font-semibold text-ink-400">{question.key}</p>
              </div>

              <Pill
                className={
                  question.active ? 'bg-avatar-green-bg text-avatar-green-text' : 'bg-neutral-badge text-ink-500'
                }
              >
                {question.active ? 'Actief' : 'Uit'}
              </Pill>
            </div>

            <Button variant="ghost" className="mt-3" onClick={() => toggleActive(question)}>
              {question.active ? 'Uitzetten' : 'Weer aanzetten'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
