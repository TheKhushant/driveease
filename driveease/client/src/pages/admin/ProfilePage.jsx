import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { errorMessage, put, tokenStore } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { PageHeader } from '../../components/ui/Misc';
import { formatDateTime, titleCase } from '../../utils/format';

export default function ProfilePage() {
  const { admin, setAdmin } = useAuth();
  const profile = useForm({ defaultValues: { name: admin.name, email: admin.email, phone: admin.phone || '' } });
  const pwd = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const saveProfile = profile.handleSubmit(async (v) => {
    try {
      setAdmin(await put('/auth/profile', v));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const savePassword = pwd.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      const { token } = await put('/auth/password', { currentPassword, newPassword });
      tokenStore.set(token);
      pwd.reset();
      toast.success('Password changed');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Admin Profile" description={`${titleCase(admin.role)} · last login ${formatDateTime(admin.lastLoginAt)}`} />
      <form onSubmit={saveProfile} className="card space-y-4 p-5" noValidate>
        <h3 className="text-base font-semibold">Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={profile.formState.errors.name?.message}>
            <Input {...profile.register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} />
          </Field>
          <Field label="Email" error={profile.formState.errors.email?.message}>
            <Input type="email" {...profile.register('email', { required: 'Email is required' })} />
          </Field>
          <Field label="Phone">
            <Input {...profile.register('phone')} />
          </Field>
        </div>
        <Button type="submit" loading={profile.formState.isSubmitting}>Save profile</Button>
      </form>
      <form onSubmit={savePassword} className="card space-y-4 p-5" noValidate>
        <h3 className="text-base font-semibold">Change password</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password" error={pwd.formState.errors.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" {...pwd.register('currentPassword', { required: 'Required' })} />
          </Field>
          <Field label="New password" error={pwd.formState.errors.newPassword?.message} hint="8+ characters with letters and numbers">
            <Input
              type="password"
              autoComplete="new-password"
              {...pwd.register('newPassword', {
                required: 'Required',
                minLength: { value: 8, message: 'At least 8 characters' },
                validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use letters and numbers',
              })}
            />
          </Field>
          <Field label="Confirm new password" error={pwd.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...pwd.register('confirm', { validate: (v, all) => v === all.newPassword || 'Passwords do not match' })} />
          </Field>
        </div>
        <Button type="submit" loading={pwd.formState.isSubmitting}>Change password</Button>
      </form>
    </div>
  );
}
