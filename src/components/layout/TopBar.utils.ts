export function isReturnToTopIgnoredTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('a, input, textarea, select, label, [role="menuitem"], [data-topbar-ignore-return]') !== null
  );
}

export function isTextInputTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [role="menuitem"]') !== null
  );
}
