import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSite } from '../../context/SiteContext';
import { errorMessage, post } from '../../services/api';
import { formatINR, today } from '../../utils/format';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Form';

/** Record an offline (cash / UPI / other) payment or refund against a booking. */
export function RecordPaymentForm({ booking, onSaved }) {
  const { settings } = useSite() || {};
  const methods = settings?.paymentMethods?.length ? settings.paymentMethods : ['Cash', 'UPI'];
  const pending = booking.payment?.pendingAmount ?? 0;
  const { register, handleSubmit, reset, watch, formState } = useForm({
    defaultValues: { type: 'payment', amount: pending || '', method: methods[0], paidAt: today(), reference: '', collectedBy: '', notes: '' },
  });
  const type = watch('type');

  const onSubmit = handleSubmit(async (v) => {
    try {
      const res = await post('/admin/payments', { ...v, booking: booking._id, amount: Number(v.amount) });
      toast.success(type === 'refund' ? 'Refund recorded' : 'Payment recorded');
      reset({ ...v, amount: res.booking.payment.pendingAmount || '', reference: '', notes: '' });
      onSaved?.(res.booking);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Type">
        <Select
          {...register('type')}
          options={[
            { value: 'payment', label: 'Payment received' },
            { value: 'refund', label: 'Refund given' },
          ]}
        />
      </Field>
      <Field label="Amount (₹)" error={formState.errors.amount?.message} hint={type === 'payment' && pending ? `Pending: ${formatINR(pending)}` : undefined}>
        <Input type="number" min="1" step="any" {...register('amount', { required: 'Enter an amount', min: { value: 1, message: 'Must be > 0' } })} />
      </Field>
      <Field label="Method">
        <Select {...register('method')} options={methods.map((m) => ({ value: m, label: m }))} />
      </Field>
      <Field label="Date">
        <Input type="date" {...register('paidAt')} />
      </Field>
      <Field label="Reference / UPI txn ID">
        <Input {...register('reference')} placeholder="Optional" />
      </Field>
      <Field label="Collected by">
        <Input {...register('collectedBy')} placeholder="Driver / office" />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea rows={2} {...register('notes')} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={formState.isSubmitting}>
          {type === 'refund' ? 'Record refund' : 'Record payment'}
        </Button>
      </div>
    </form>
  );
}
