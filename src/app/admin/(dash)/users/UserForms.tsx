"use client";

import { useActionState } from "react";
import {
  changeOwnPassword,
  createUser,
  resetUserPassword,
  type UserFormState,
} from "../../actions";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

function Message({ state }: { state: UserFormState }) {
  if (state.error) {
    return (
      <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
    );
  }
  if (state.ok) {
    return (
      <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
    );
  }
  return null;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUser, {});

  return (
    <form action={action} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
        Добавить пользователя
      </h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="name" placeholder="Имя" className={field} autoComplete="off" />
        <input name="email" type="email" placeholder="email" className={field} autoComplete="off" />
        <input
          name="password"
          type="password"
          placeholder="пароль (мин. 8)"
          className={field}
          autoComplete="new-password"
        />
        <select name="role" defaultValue="EDITOR" className={field}>
          <option value="EDITOR">Редактор</option>
          <option value="ADMIN">Администратор</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Создаём…" : "Создать"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ResetPasswordForm({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(
    resetUserPassword,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input
        name="password"
        type="password"
        placeholder={`новый пароль для ${email}`}
        className={`${field} max-w-xs`}
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {pending ? "…" : "Сменить пароль"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ChangeOwnPasswordForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(
    changeOwnPassword,
    {},
  );

  return (
    <form action={action} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
        Мой пароль
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="current"
          type="password"
          placeholder="текущий пароль"
          className={field}
          autoComplete="current-password"
        />
        <input
          name="password"
          type="password"
          placeholder="новый пароль (мин. 8)"
          className={field}
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {pending ? "Меняем…" : "Сменить свой пароль"}
      </button>
      <Message state={state} />
    </form>
  );
}
