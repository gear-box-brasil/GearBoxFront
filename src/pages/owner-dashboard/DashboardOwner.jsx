import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { listUsers, listBudgets, listServices, createUser, updateUser, deleteUser } from '@/services/gearbox'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { KpiCards } from './components/KpiCards'
import { MechanicsComparisonChart } from './components/MechanicsComparisonChart'
import { BudgetStatusChart } from './components/BudgetStatusChart'
import { MechanicsTable } from './components/MechanicsTable'
import { MechanicDetailChart } from './components/MechanicDetailChart'
import { CreateUserModal } from './components/CreateUserModal'
import { UsersTable } from './components/UsersTable'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'

const PER_PAGE = 200

export default function DashboardOwner() {
  const { user, token, logout } = useAuth()
  const queryClient = useQueryClient()
  const [selectedMechanicId, setSelectedMechanicId] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [deletingUserId, setDeletingUserId] = useState(null)
  const { toast } = useToast()
  const isOwner = user?.role === 'dono'

  const usersQuery = useQuery({
    queryKey: ['users', token],
    queryFn: () => listUsers(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  })

  const budgetsQuery = useQuery({
    queryKey: ['budgets', token, 'owner-dashboard'],
    queryFn: () => listBudgets(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  })

  const servicesQuery = useQuery({
    queryKey: ['services', token, 'owner-dashboard'],
    queryFn: () => listServices(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  })

  const allUsers = usersQuery.data?.data ?? []
  const mechanics = useMemo(
    () => allUsers.filter((person) => person.tipo === 'mecanico' && person.ativo !== false),
    [allUsers]
  )
  const budgets = budgetsQuery.data?.data ?? []
  const services = servicesQuery.data?.data ?? []

  const metrics = useMemo(() => {
    const totalBudgets = budgets.length
    const accepted = budgets.filter((budget) => budget.status === 'aceito').length
    const acceptanceRate = totalBudgets ? ((accepted / totalBudgets) * 100).toFixed(1) : '0'
    const concludedServices = services.filter((service) => service.status === 'Concluído').length
    return [
      { label: 'Total de Mecânicos', value: mechanics.length },
      { label: 'Budgets Gerados', value: totalBudgets },
      { label: '% Médio de Aceites', value: `${acceptanceRate}%` },
      { label: 'Serviços Concluídos', value: concludedServices },
    ]
  }, [mechanics, budgets, services])

  const mechanicRows = useMemo(() => {
    const servicesByMechanic = services.reduce((acc, service) => {
      if (!service.userId) return acc
      acc[service.userId] = acc[service.userId] ?? []
      acc[service.userId].push(service)
      return acc
    }, {})

    const budgetsByMechanic = budgets.reduce((acc, budget) => {
      if (!budget.userId) return acc
      acc[budget.userId] = acc[budget.userId] ?? []
      acc[budget.userId].push(budget)
      return acc
    }, {})

    return mechanics.map((mechanic) => {
      const mechanicBudgets = budgetsByMechanic[mechanic.id] ?? []
      const mechanicServices = servicesByMechanic[mechanic.id] ?? []
      const budgetsAccepted = mechanicBudgets.filter((budget) => budget.status === 'aceito').length
      const budgetsCancelled = mechanicBudgets.filter((budget) => budget.status === 'cancelado').length
      const budgetsOpen = mechanicBudgets.filter((budget) => budget.status === 'aberto').length
      const budgetsTotal = mechanicBudgets.length
      const servicesCompleted = mechanicServices.filter((service) => service.status === 'Concluído').length
      const acceptRate = budgetsTotal ? Math.round((budgetsAccepted / budgetsTotal) * 100) : 0
      const cancelRate = budgetsTotal ? Math.round((budgetsCancelled / budgetsTotal) * 100) : 0
      return {
        id: mechanic.id,
        nome: mechanic.nome,
        budgetsTotal,
        budgetsAccepted,
        budgetsCancelled,
        budgetsOpen,
        servicesCompleted,
        acceptRate,
        cancelRate,
      }
    })
  }, [mechanics, budgets, services])

  const comparisonData = useMemo(
    () =>
      mechanicRows.map((row) => ({
        name: row.nome,
        budgets: row.budgetsTotal,
        services: row.servicesCompleted,
      })),
    [mechanicRows]
  )

  const statusData = useMemo(() => {
    const summary = ['aberto', 'aceito', 'cancelado', 'recusado'].map((status) => ({
      status,
      value: budgets.filter((budget) => budget.status === status).length,
    }))
    return summary
      .filter((item) => item.value > 0)
      .map((item) => ({
        label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
        value: item.value,
      }))
  }, [budgets])

  const selectedMechanic = mechanics.find((mechanic) => mechanic.id === selectedMechanicId) ?? null

  const detailData = useMemo(() => {
    if (!selectedMechanic) return []
    const map = new Map()

    const addPoint = (key) => {
      if (!map.has(key)) {
        map.set(key, { period: key, created: 0, accepted: 0, services: 0 })
      }
      return map.get(key)
    }

    budgets.forEach((budget) => {
      if (budget.userId !== selectedMechanic.id) return
      const period = formatPeriod(budget.createdAt)
      const node = addPoint(period)
      node.created += 1
      if (budget.status === 'aceito') node.accepted += 1
    })

    services.forEach((service) => {
      if (service.userId !== selectedMechanic.id) return
      const period = formatPeriod(service.createdAt)
      const node = addPoint(period)
      if (service.status === 'Concluído') node.services += 1
    })

    return Array.from(map.values()).sort((a, b) => new Date(a.period) - new Date(b.period))
  }, [selectedMechanic, budgets, services])

  const createUserMutation = useMutation({
    mutationFn: (payload) => createUser(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUser(token, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: ({ id, transferToUserId }) =>
      deleteUser(token, id, transferToUserId ? { transferToUserId } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleCreateUser = (payload) => createUserMutation.mutateAsync(payload)
  const handleUpdateUser = (id, payload) => updateUserMutation.mutateAsync({ id, payload })
  const handleDeleteUser = async (userToDelete, options = {}) => {
    const isSelfDeletion = userToDelete.id === user?.id
    if (userToDelete.tipo === 'dono' && userToDelete.id !== user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você só pode excluir a sua própria conta de dono.',
        variant: 'destructive',
      })
      return
    }
    try {
      setDeletingUserId(userToDelete.id)
      await deleteUserMutation.mutateAsync({
        id: userToDelete.id,
        transferToUserId: options.transferToUserId,
      })
      if (isSelfDeletion) {
        toast({
          title: 'Conta removida',
          description: 'Sua sessão será finalizada.',
        })
        await logout()
        return
      }
      toast({
        title: userToDelete.tipo === 'mecanico' ? 'Mecânico desativado' : 'Usuário removido',
      })
    } catch (error) {
      toast({
        title: 'Erro ao remover usuário',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleActivateMechanic = async (mechanic) => {
    try {
      setDeletingUserId(mechanic.id)
      await updateUserMutation.mutateAsync({ id: mechanic.id, payload: { ativo: true } })
      toast({ title: 'Mecânico reativado' })
    } catch (error) {
      toast({
        title: 'Erro ao reativar mecânico',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  if (!isOwner) {
    return (
      <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-8">
        <EmptyState title="Acesso restrito" description="Somente donos podem visualizar este painel." />
      </div>
    )
  }

  const isLoading = usersQuery.isLoading || budgetsQuery.isLoading || servicesQuery.isLoading
  const hasError = usersQuery.isError || budgetsQuery.isError || servicesQuery.isError

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          eyebrow="Painel Executivo"
          title="Dashboard do Dono"
          subtitle="Visão consolidada de budgets, serviços e performance dos mecânicos."
        />
        <CreateUserModal onSubmit={handleCreateUser} />
      </div>

      {isLoading ? (
        <Card className="p-10 flex items-center justify-center bg-card/70">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </Card>
      ) : hasError ? (
        <EmptyState title="Erro ao carregar dados" description="Verifique sua conexão e tente novamente." />
      ) : (
        <>
          <KpiCards metrics={metrics} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MechanicsComparisonChart data={comparisonData} />
            <BudgetStatusChart data={statusData} />
            <MechanicDetailChart mechanic={selectedMechanic} data={detailData} />
          </div>

          <MechanicsTable
            data={mechanicRows}
            selectedId={selectedMechanicId}
            onSelect={(id) => setSelectedMechanicId(id)}
          />

          <UsersTable
            users={filterUsers(allUsers, userSearch)}
            search={userSearch}
            onSearchChange={setUserSearch}
            deletingId={deletingUserId}
            renderEdit={(currentUser) => (
              currentUser.tipo === 'dono' ? null : (
                <CreateUserModal
                  mode="edit"
                  initialData={{
                    nome: currentUser.nome,
                    email: currentUser.email,
                    tipo: currentUser.tipo,
                  }}
                  onSubmit={(payload) => handleUpdateUser(currentUser.id, payload)}
                  renderTrigger={({ open }) => (
                    <Button
                      size="sm"
                      className="bg-gradient-accent hover:opacity-90"
                      onClick={open}
                    >
                      Editar
                    </Button>
                  )}
                />
              )
            )}
            onDelete={handleDeleteUser}
            onDeactivateMechanic={(mechanic, payload) => handleDeleteUser(mechanic, payload)}
            onActivateMechanic={handleActivateMechanic}
          />
        </>
      )}
    </div>
  )
}

function formatPeriod(dateInput) {
  if (!dateInput) return 'Sem data'
  const date = new Date(dateInput)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function filterUsers(users, term) {
  if (!term) return users
  const normalized = term.toLowerCase()
  return users.filter(
    (user) =>
      user.nome?.toLowerCase().includes(normalized) || user.email?.toLowerCase().includes(normalized)
  )
}
