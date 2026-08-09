"use client";

import { useActionState } from "react";
import { answerQuestion, type QuestionState } from "../../actions";

export function AnswerForm({ questionId }: { questionId: string }) {
  const [state, action, pending] = useActionState<QuestionState, FormData>(
    answerQuestion,
    {},
  );

  return (
    <form action={action} key={questionId}>
      <input type="hidden" name="id" value={questionId} />
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={2}
          placeholder="Ответ консультанта…"
          className="min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-base focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Ответить"
          title="Ответить"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
          </svg>
        </button>
      </div>
      {state.error ? <p className="mt-1 text-xs text-accent">{state.error}</p> : null}
      {state.ok ? <p className="mt-1 text-xs text-emerald-700">{state.ok}</p> : null}
    </form>
  );
}
