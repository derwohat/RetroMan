// Codebook docs/product-standards.md, "Zeilen-Aktionen als Icon-Buttons":
// the icon mapping is taken from the existing projects rather than invented —
// edit = pencil, delete = bin (always in the warning colour), reset password =
// key, deactivate/reactivate = power, reset 2FA = shield with a cross.
//
// Every one carries a title and an aria-label at the call site: an icon
// without a name is a guess, and a screen reader hears nothing at all.

type IconProps = { className?: string };

const BASE = "h-4 w-4";

export function IconKey({ className = BASE }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912l-2.72 2.72a2.25 2.25 0 01-1.591.659H9v1.5a.75.75 0 01-.75.75H6.75v1.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-2.69c0-.597.237-1.17.659-1.591l6.459-6.459A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

export function IconShieldOff({ className = BASE }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 2.5v5.75c0 4.5-3.2 7.9-7.5 9.25-4.3-1.35-7.5-4.75-7.5-9.25V5.5L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 10.5l4.5 4.5m0-4.5l-4.5 4.5" />
    </svg>
  );
}

export function IconPower({ className = BASE }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9m5.66-6.66a8 8 0 11-11.32 0" />
    </svg>
  );
}

export function IconTrash({ className = BASE }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
