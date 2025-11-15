import { useEffect, useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';

type ClientFormValues = {
  nome: string;
  telefone: string;
  email: string;
};

type ClientFormDialogProps = {
  mode?: 'create' | 'edit';
  initialValues?: Partial<ClientFormValues>;
  triggerLabel?: string;
  renderTrigger?: (props: { open: () => void; disabled: boolean }) => ReactNode;
  onSubmit?: (values: { nome: string; telefone: string; email?: string }) => Promise<void>;
};

const DEFAULT_VALUES: ClientFormValues = {
  nome: '',
  telefone: '',
  email: '',
};

export function ClientFormDialog({
  mode = 'create',
  initialValues,
  triggerLabel = 'Registrar cliente',
  renderTrigger,
  onSubmit,
}: ClientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ClientFormValues>(() => normalizeInitialValues(initialValues));
  const { toast } = useToast();

  useEffect(() => {
    setForm(normalizeInitialValues(initialValues));
  }, [initialValues]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmit) return;
    setIsSaving(true);
    try {
      await onSubmit({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() ? form.email.trim() : undefined,
      });
      toast({
        title: mode === 'edit' ? 'Cliente atualizado' : 'Cliente registrado',
        description:
          mode === 'edit'
            ? 'As informações foram atualizadas com sucesso.'
            : 'Novo cliente cadastrado e disponível na lista.',
      });
      setOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Não foi possível salvar o cliente',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const dialogTrigger = renderTrigger ? (
    renderTrigger({ open: () => setOpen(true), disabled: isSaving })
  ) : (
    <DialogTrigger asChild>
      <Button className="bg-gradient-accent hover:opacity-90" disabled={isSaving}>
        {triggerLabel}
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(normalizeInitialValues(initialValues));
        }
      }}
    >
      {dialogTrigger}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome completo</Label>
            <Input
              id="client-name"
              value={form.nome}
              onChange={(event) => setForm((state) => ({ ...state, nome: event.target.value }))}
              placeholder="Ex: João da Silva"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Telefone</Label>
            <Input
              id="client-phone"
              value={form.telefone}
              onChange={(event) => setForm((state) => ({ ...state, telefone: event.target.value }))}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">E-mail (opcional)</Label>
            <Input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="cliente@email.com"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving || !form.nome.trim() || !form.telefone.trim()}>
              {isSaving ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Registrar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function normalizeInitialValues(values?: Partial<ClientFormValues>): ClientFormValues {
  return {
    nome: values?.nome ?? DEFAULT_VALUES.nome,
    telefone: values?.telefone ?? DEFAULT_VALUES.telefone,
    email: values?.email ?? DEFAULT_VALUES.email,
  };
}
