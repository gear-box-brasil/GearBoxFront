import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Car, Client } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';

type BudgetFormValues = {
  clientId: string;
  carId: string;
  description: string;
  amount: string;
};

type BudgetFormDialogProps = {
  mode?: 'create' | 'edit';
  initialValues?: Partial<BudgetFormValues>;
  clients: Client[];
  cars: Car[];
  triggerLabel?: string;
  renderTrigger?: (props: { open: () => void; disabled: boolean }) => ReactNode;
  onSubmit?: (values: { clientId: string; carId: string; description: string; amount: number }) => Promise<void>;
};

const DEFAULT_VALUES: BudgetFormValues = {
  clientId: '',
  carId: '',
  description: '',
  amount: '',
};

export function BudgetFormDialog({
  mode = 'create',
  clients,
  cars,
  initialValues,
  triggerLabel = 'Registrar novo orçamento',
  renderTrigger,
  onSubmit,
}: BudgetFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<BudgetFormValues>(() => normalizeInitialValues(initialValues));
  const { toast } = useToast();

  const availableCars = useMemo(() => {
    if (!form.clientId) return [];
    return cars.filter((car) => car.clientId === form.clientId);
  }, [cars, form.clientId]);

  useEffect(() => {
    setForm(normalizeInitialValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    if (!form.carId) return;
    if (availableCars.length === 0) return;
    const isValidCar = availableCars.some((car) => car.id === form.carId);
    if (!isValidCar) {
      setForm((current) => ({ ...current, carId: '' }));
    }
  }, [availableCars, form.carId]);

  const closeAndReset = () => {
    setOpen(false);
    setForm(normalizeInitialValues(initialValues));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmit) return;
    setIsSaving(true);
    try {
      await onSubmit({
        clientId: form.clientId,
        carId: form.carId,
        description: form.description.trim(),
        amount: Number(form.amount),
      });
      toast({
        title: mode === 'edit' ? 'Orçamento atualizado' : 'Orçamento registrado',
        description:
          mode === 'edit'
            ? 'As informações do orçamento foram atualizadas com sucesso.'
            : 'Novo orçamento registrado. Você pode acompanhar pela lista.',
      });
      closeAndReset();
    } catch (error: unknown) {
      toast({
        title: 'Não foi possível salvar o orçamento',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setForm(normalizeInitialValues(initialValues));
        }
      }}
    >
      {renderTrigger ? (
        renderTrigger({ open: () => setOpen(true), disabled: isSaving })
      ) : (
        <DialogTrigger asChild>
          <Button className="bg-gradient-accent hover:opacity-90" disabled={isSaving}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar orçamento' : 'Registrar novo orçamento'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <Select
                value={form.clientId}
                onValueChange={(value) => setForm((current) => ({ ...current, clientId: value }))}
                required
                disabled={clients.length === 0}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="carId">Veículo</Label>
              <Select
                value={form.carId}
                onValueChange={(value) => setForm((current) => ({ ...current, carId: value }))}
                required
                disabled={!form.clientId || availableCars.length === 0}
              >
                <SelectTrigger id="carId">
                  <SelectValue placeholder={form.clientId ? 'Selecione o veículo' : 'Selecione um cliente primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.marca} {car.modelo} · {car.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Detalhe o serviço, peças e prazo estimado"
              minLength={3}
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor estimado (R$)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving || !isFormValid(form)}>
              {isSaving ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Registrar orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function normalizeInitialValues(initialValues?: Partial<BudgetFormValues>): BudgetFormValues {
  if (!initialValues) return { ...DEFAULT_VALUES };
  return {
    clientId: initialValues.clientId ?? DEFAULT_VALUES.clientId,
    carId: initialValues.carId ?? DEFAULT_VALUES.carId,
    description: initialValues.description ?? DEFAULT_VALUES.description,
    amount: typeof initialValues.amount === 'number'
      ? String(initialValues.amount)
      : initialValues.amount ?? DEFAULT_VALUES.amount,
  };
}

function isFormValid(values: BudgetFormValues) {
  return Boolean(values.clientId && values.carId && values.description.trim().length >= 3 && Number(values.amount) > 0);
}
