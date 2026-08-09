"use client";

import { useActionState } from "react";
import { answerQuestion, type QuestionState } from "../../actions";

export function AnswerForm({ questionId }: { questionId: string }) {
  const [state, action, pending] = useActionState<QuestionState, FormData>(
    answerQuestion,
    {},
  );

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={questionId} />
      <textarea
        name="body"
        rows={3}
        placeholder="Ответ консультанта…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base focus:border-accent focus:outline-none"
      />
      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{state.ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Отправляем…" : "Ответить"}
      </button>
    </form>
  );
}
