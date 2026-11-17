import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Car, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { errorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';

export default function LoginPage() {
  const { admin, login } = useAuth();
  const { company } = useSite() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm();

  if (admin) return <Navigate to={location.state?.from || '/admin'} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError('');
    try {
      const a = await login(email.trim(), password);
      toast.success(`Welcome back, ${a.name}`);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="hero-pattern absolute inset-0" />
        <div className="absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary">
              <Car className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">{company}</span>
          </div>
          <div>
            <h1 className="max-w-md font-display text-4xl font-semibold leading-tight text-white">Run your fleet, bookings and website from one place.</h1>
            <p className="mt-4 max-w-md text-slate-300">Bookings, pricing, drivers, availability and content — all in the admin panel.</p>
          </div>
          <p className="text-xs text-slate-500">Authorised staff only.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5" noValidate>
          <div>
            <h2 className="text-2xl font-semibold">Admin sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use the credentials created with the setup script.</p>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email" error={formState.errors.email?.message}>
            <Input icon={Mail} type="email" autoComplete="username" placeholder="admin@company.com" {...register('email', { required: 'Email is required' })} />
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            <Input icon={Lock} type="password" autoComplete="current-password" placeholder="••••••••" {...register('password', { required: 'Password is required' })} />
          </Field>
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
