import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFipeBrands, useFipeModels, useFipeYears, getFipeVehicleDetails } from "@/hooks/useFipeApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Client } from "@/types/api";
import { createCar } from "@/services/gearbox";

const vehicleSchema = z.object({
  clientId: z.string().uuid({ message: "Selecione um cliente" }),
  brandCode: z.string().min(1, "Selecione uma marca"),
  modelCode: z.string().min(1, "Selecione um modelo"),
  yearCode: z.string().min(1, "Selecione um ano"),
  plate: z
    .string()
    .min(7, "Placa inválida")
    .max(8, "Placa inválida")
    .regex(/^[A-Za-z0-9-]+$/, "Placa inválida"),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onCreated?: () => void;
}

export default function VehicleFormDialog({ open, onOpenChange, clients, onCreated }: VehicleFormDialogProps) {
  const [brandCode, setBrandCode] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { token } = useAuth();

  const { brands, loading: brandsLoading } = useFipeBrands();
  const { models, loading: modelsLoading } = useFipeModels(brandCode);
  const { years, loading: yearsLoading } = useFipeYears(brandCode, modelCode);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      clientId: "",
      brandCode: "",
      modelCode: "",
      yearCode: "",
      plate: "",
    },
  });

  async function onSubmit(values: VehicleFormValues) {
    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    setSubmitting(true);
    try {
      const vehicleDetails = await getFipeVehicleDetails(
        values.brandCode,
        values.modelCode,
        values.yearCode
      );

      if (!vehicleDetails) {
        throw new Error("Não foi possível obter os dados da FIPE.");
      }

      const sanitizedPlate = values.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      await createCar(token, {
        clientId: values.clientId,
        placa: sanitizedPlate,
        marca: vehicleDetails.Marca,
        modelo: vehicleDetails.Modelo,
        ano: Number(vehicleDetails.AnoModelo),
      });

      toast.success("Veículo cadastrado com sucesso!");
      form.reset();
      setBrandCode(null);
      setModelCode(null);
      onCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar veículo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Veículo</DialogTitle>
          <DialogDescription>
            Preencha os dados do veículo utilizando a tabela FIPE
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!clients.length}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={clients.length ? "Selecione o cliente" : "Sem clientes cadastrados"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nome}
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
              name="brandCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setBrandCode(value);
                      setModelCode(null);
                      form.setValue("modelCode", "");
                      form.setValue("yearCode", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={brandsLoading ? "Carregando..." : "Selecione a marca"} />
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
                      field.onChange(value);
                      setModelCode(value);
                      form.setValue("yearCode", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            !brandCode 
                              ? "Selecione a marca primeiro" 
                              : modelsLoading 
                              ? "Carregando..." 
                              : "Selecione o modelo"
                          } 
                        />
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
                    disabled={!modelCode || yearsLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            !modelCode 
                              ? "Selecione o modelo primeiro" 
                              : yearsLoading 
                              ? "Carregando..." 
                              : "Selecione o ano"
                          } 
                        />
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
                      placeholder="ABC1234"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !clients.length} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Veículo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
