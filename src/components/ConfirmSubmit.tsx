"use client";

export function ConfirmSubmit({
  message,
  className,
  title,
  formAction,
  children,
}: {
  message: string;
  className?: string;
  title?: string;
  /** Позволяет отправить ту же форму в другое серверное действие (например, удаление). */
  formAction?: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      title={title}
      className={className}
      formAction={formAction}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
