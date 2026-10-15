/** Petit helper pour la toast globale (#toast) définie dans le layout. */
export function toast(message: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  const timerKey = "_timer" as keyof HTMLElement;
  clearTimeout(el[timerKey] as unknown as number);
  (el as unknown as Record<string, number>)._timer = window.setTimeout(
    () => el.classList.remove("show"),
    2400
  );
}
