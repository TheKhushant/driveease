import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/30',
  secondary: 'bg-secondary text-ink hover:bg-secondary-dark shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  dark: 'bg-ink text-white hover:bg-slate-800',
  whatsapp: 'bg-[#25D366] text-white hover:bg-[#1ebe5a] shadow-sm',
};
const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
  icon: 'h-9 w-9 rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, icon: Icon, children, className = '', to, href, ...rest }) {
  const cls = `inline-flex select-none items-center justify-center font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>;
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
