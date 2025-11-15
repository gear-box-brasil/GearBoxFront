import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFipeBrands, useFipeModels, useFipeYears, getFipeVehicleDetails } from '@/hooks/useFipeApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const carSchema = z.object({
  brandCode: z.string().min(1, 'Selecione uma marca'),
  modelCode: z.string().min(1, 'Selecione um modelo'),
  yearCode: z.string().min(1, 'Selecione um ano'),
  plate: z
    .string()
    .min(7, 'Placa inválida')
    .max(8, 'Placa inválida')
    .regex(/^[A-Za-z0-9-]+$/, 'Placa inválida'),
});

type ClientCarFormValues = z.infer<typeof carSchema>;

type ClientCarDialogProps = {
  clientId: string;
  clientName: string;
  renderTrigger?: (props: { open: () => void; disabled: boolean }) => ReactNode;
  onSubmit?: (values: { clientId: string; placa: string; marca: string; modelo: string; ano: number }) => Promise<void>;
};

export function ClientCarDialog({ clientId, clientName, renderTrigger, onSubmit }: ClientCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [brandCode, setBrandCode] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const { brands, loading: brandsLoading } = useFipeBrands();
  const { models, loading: modelsLoading } = useFipeModels(brandCode);
  const { years, loading: yearsLoading } = useFipeYears(brandCode, modelCode);

  const form = useForm<ClientCarFormValues>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      brandCode: '',
      modelCode: '',
      yearCode: '',
      plate: '',
    },
  });

  const handleSubmit = async (values: ClientCarFormValues) => {
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      const details = await getFipeVehicleDetails(values.brandCode, values.modelCode, values.yearCode);
      if (!details) {
        throw new Error('Não foi possível obter os dados da FIPE.');
      }
      const sanitizedPlate = values.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      await onSubmit({
        clientId,
        placa: sanitizedPlate,
        marca: details.Marca,
        modelo: details.Modelo,
        ano: Number(details.AnoModelo),
      });
      toast({
        title: 'Veículo cadastrado',
        description: `${details.Marca} ${details.Modelo} vinculado a ${clientName}.`,
      });
      form.reset();
      setBrandCode(null);
      setModelCode(null);
      setOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Não foi possível cadastrar o veículo',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = renderTrigger ? (
    renderTrigger({ open: () => setOpen(true), disabled: submitting })
  ) : (
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" disabled={submitting}>
        Adicionar carro
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      {trigger}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar veículo</DialogTitle>
          <DialogDescription>Dados puxados da FIPE para {clientName}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => handleSubmit(values))}
          >
            <FormField
              control={form.control}
              name="brandCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      setBrandCode(value)
                      setModelCode(null)
                      form.setValue('modelCode', '')
                      form.setValue('yearCode', '')
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={brandsLoading ? 'Carregando marcas...' : 'Selecione a marca'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.codigo} value={brand.codigo}>
                          {brand.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <Select
                    disabled={!brandCode || modelsLoading}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setModelCode(value)
                      form.setValue('yearCode', '')
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!brandCode ? 'Escolha primeiro a marca' : modelsLoading ? 'Carregando modelos...' : 'Selecione o modelo'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.codigo} value={String(model.codigo)}>
                          {model.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="yearCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <Select
                    disabled={!brandCode || !modelCode || yearsLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!modelCode ? 'Selecione o modelo primeiro' : yearsLoading ? 'Carregando anos...' : 'Selecione o ano'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.codigo} value={year.codigo}>
                          {year.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ABC1D23"
                      maxLength={8}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Adicionar veículo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
