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

const vehicleSchema = z.object({
  brandCode: z.string().min(1, "Selecione uma marca"),
  modelCode: z.string().min(1, "Selecione um modelo"),
  yearCode: z.string().min(1, "Selecione um ano"),
  plate: z.string().min(7, "Placa inválida").max(8, "Placa inválida"),
  color: z.string().min(1, "Selecione uma cor"),
  owner: z.string().min(1, "Nome do proprietário é obrigatório"),
  km: z.string().min(1, "Quilometragem é obrigatória"),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colors = [
  "Preto", "Branco", "Prata", "Cinza", "Vermelho", 
  "Azul", "Verde", "Amarelo", "Laranja", "Marrom", "Bege"
];

export default function VehicleFormDialog({ open, onOpenChange }: VehicleFormDialogProps) {
  const [brandCode, setBrandCode] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { brands, loading: brandsLoading } = useFipeBrands();
  const { models, loading: modelsLoading } = useFipeModels(brandCode);
  const { years, loading: yearsLoading } = useFipeYears(brandCode, modelCode);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brandCode: "",
      modelCode: "",
      yearCode: "",
      plate: "",
      color: "",
      owner: "",
      km: "",
    },
  });

  async function onSubmit(values: VehicleFormValues) {
    setSubmitting(true);
    try {
      const vehicleDetails = await getFipeVehicleDetails(
        values.brandCode,
        values.modelCode,
        values.yearCode
      );

      if (vehicleDetails) {
        console.log("Veículo criado:", {
          ...values,
          brand: vehicleDetails.Marca,
          model: vehicleDetails.Modelo,
          year: vehicleDetails.AnoModelo,
          fipeValue: vehicleDetails.Valor,
        });
        
        toast.success("Veículo cadastrado com sucesso!");
        form.reset();
        setBrandCode(null);
        setModelCode(null);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Erro ao cadastrar veículo");
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
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
                      placeholder="ABC-1234" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proprietário</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do proprietário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="km"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quilometragem</FormLabel>
                  <FormControl>
                    <Input placeholder="50000" type="number" {...field} />
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
              <Button type="submit" disabled={submitting} className="flex-1">
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
