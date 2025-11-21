import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/SearchInput";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OWNER_CONFIRMATION_PHRASE = "excluir minha conta";
const MECHANIC_DEACTIVATION_PHRASE = "desativar";

export function UsersTable({
  users = [],
  search,
  onSearchChange,
  renderEdit,
  onDelete,
  deletingId,
  onDeactivateMechanic,
  onActivateMechanic,
}) {
  const activeMechanics = useMemo(
    () =>
      users.filter((user) => user.tipo === "mecanico" && user.ativo !== false),
    [users]
  );

  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-lg">Usuários do sistema</CardTitle>
        <SearchInput
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(event) => onSearchChange?.(event.target.value)}
          wrapperClassName="w-full md:w-72"
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[880px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="align-middle">
                  <TableCell className="align-middle font-medium">
                    {user.nome}
                  </TableCell>
                  <TableCell className="align-middle">{user.email}</TableCell>
                  <TableCell className="align-middle capitalize">
                    {user.tipo}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge
                      variant={user.ativo !== false ? "secondary" : "outline"}
                    >
                      {user.ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {renderEdit?.(user)}
                      {user.tipo === "mecanico" ? (
                        <MechanicStatusButton
                          user={user}
                          deletingId={deletingId}
                          mechanics={activeMechanics}
                          onDeactivate={onDeactivateMechanic}
                          onActivate={onActivateMechanic}
                        />
                      ) : (
                        <DeleteUserButton
                          user={user}
                          deletingId={deletingId}
                          onConfirm={onDelete}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DeleteUserButton({ user, onConfirm, deletingId }) {
  const [open, setOpen] = useState(false);
  const [ownerConfirmation, setOwnerConfirmation] = useState("");
  const isOwner = user.tipo === "dono";
  const isDeleting = deletingId === user.id;
  const confirmationMatches =
    ownerConfirmation.trim().toLowerCase() ===
    OWNER_CONFIRMATION_PHRASE.toLowerCase();
  const canConfirm = !isOwner || confirmationMatches;

  const resetState = () => {
    setOwnerConfirmation("");
  };

  const handleOpenChange = (value) => {
    setOpen(value);
    if (!value) resetState();
  };

  const handleConfirm = () => {
    if (!canConfirm || isDeleting) return;
    onConfirm?.(user);
    setOpen(false);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isDeleting}>
          {isDeleting ? "Processando..." : "Excluir"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover {user.nome}? Essa ação não poderá ser
            desfeita.
          </DialogDescription>
        </DialogHeader>
        {isOwner && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Para remover sua própria conta de administrador digite
              <span className="font-semibold">
                {" "}
                {OWNER_CONFIRMATION_PHRASE}{" "}
              </span>
              abaixo.
            </p>
            <Input
              value={ownerConfirmation}
              onChange={(event) => setOwnerConfirmation(event.target.value)}
              placeholder={OWNER_CONFIRMATION_PHRASE}
              autoFocus
            />
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Processando..." : "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MechanicStatusButton({
  user,
  deletingId,
  mechanics,
  onDeactivate,
  onActivate,
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const isActive = user.ativo !== false;
  const isPending = deletingId === user.id;
  const transferOptions = mechanics.filter(
    (mechanic) => mechanic.id !== user.id
  );
  const confirmationMatches =
    confirmation.trim().toLowerCase() ===
    MECHANIC_DEACTIVATION_PHRASE.toLowerCase();

  const resetState = () => {
    setConfirmation("");
    setTransferTo("");
  };

  const handleOpenChange = (value) => {
    setOpen(value);
    if (!value) resetState();
  };

  const handleDeactivate = () => {
    if (!confirmationMatches || isPending) return;
    onDeactivate?.(user, { transferToUserId: transferTo || undefined });
    setOpen(false);
    resetState();
  };

  const handleActivate = () => {
    if (isPending) return;
    if (window.confirm(`Reativar ${user.nome}?`)) {
      onActivate?.(user);
    }
  };

  if (!isActive) {
    return (
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={handleActivate}
      >
        {isPending ? "Processando..." : "Ativar"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="border-destructive/30 bg-destructive-light text-destructive hover:bg-destructive-light/80"
        >
          {isPending ? "Processando..." : "Desativar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar mecânico</DialogTitle>
          <DialogDescription>
            {`Digite "${MECHANIC_DEACTIVATION_PHRASE}" para confirmar a desativação de ${user.nome}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={MECHANIC_DEACTIVATION_PHRASE}
            autoFocus
          />
        </div>
        {transferOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Opcional: transfira budgets e serviços para outro mecânico ativo.
            </p>
            <Select
              value={transferTo || "__none"}
              onValueChange={(value) =>
                setTransferTo(value === "__none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um mecânico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Não transferir</SelectItem>
                {transferOptions.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmationMatches || isPending}
            onClick={handleDeactivate}
          >
            {isPending ? "Processando..." : "Confirmar desativação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
