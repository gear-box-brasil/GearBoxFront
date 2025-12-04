/*
 * Gear Box – Sistema de Gestão para Oficinas Mecânicas
 * Copyright (C) 2025 Gear Box
 *
 * Este arquivo é parte do Gear Box.
 * O Gear Box é software livre: você pode redistribuí-lo e/ou modificá-lo
 * sob os termos da GNU Affero General Public License, versão 3,
 * conforme publicada pela Free Software Foundation.
 *
 * Este programa é distribuído na esperança de que seja útil,
 * mas SEM QUALQUER GARANTIA; sem mesmo a garantia implícita de
 * COMERCIABILIDADE ou ADEQUAÇÃO A UM DETERMINADO FIM.
 * Consulte a GNU AGPLv3 para mais detalhes.
 *
 * Você deve ter recebido uma cópia da GNU AGPLv3 junto com este programa.
 * Caso contrário, veja <https://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_VALUES = { nome: "", email: "", senha: "", tipo: "mecanico" };

const areFormValuesEqual = (nextValues, currentValues) => {
  const nextKeys = Object.keys(nextValues);
  const currentKeys = Object.keys(currentValues);

  if (nextKeys.length !== currentKeys.length) return false;

  return nextKeys.every((key) => nextValues[key] === currentValues[key]);
};

export function CreateUserModal({
  onSubmit,
  mode = "create",
  initialData,
  renderTrigger,
  triggerLabel = "Criar novo usuário",
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const buildInitialForm = () => ({ ...DEFAULT_VALUES, ...(initialData ?? {}) });
  const [form, setForm] = useState(buildInitialForm);
  const { toast } = useToast();

  const title = mode === "edit" ? "Editar usuário" : "Novo usuário";
  const submitLabel = loading
    ? "Salvando..."
    : mode === "edit"
      ? "Salvar alterações"
      : "Criar usuário";
  const passwordRequired = mode === "create";

  const resetForm = () => setForm(buildInitialForm());

  const handleChange = (key, value) => {
    setForm((state) => ({ ...state, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.senha) delete payload.senha;
      await onSubmit?.(payload);
      toast({
        title:
          mode === "edit" ? "Usuário atualizado" : "Usuário criado com sucesso",
      });
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Operação não concluída",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextFormValues = buildInitialForm();

    setForm((currentForm) =>
      areFormValuesEqual(nextFormValues, currentForm)
        ? currentForm
        : nextFormValues,
    );
  }, [initialData]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      {renderTrigger ? (
        renderTrigger({ open: () => setOpen(true) })
      ) : (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90">
            <Plus className="w-4 h-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(event) => handleChange("nome", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={form.senha}
              onChange={(event) => handleChange("senha", event.target.value)}
              placeholder={mode === "edit" ? "Deixe em branco para manter" : ""}
              required={passwordRequired}
            />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select
              value={form.tipo}
              onValueChange={(value) => handleChange("tipo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mecanico">Mecânico</SelectItem>
                <SelectItem value="dono">Administrador</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
