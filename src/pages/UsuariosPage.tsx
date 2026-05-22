import { useEffect, useMemo, useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { DataTable, Column } from "../components/tables/DataTable";
import { TableToolbar } from "../components/tables/TableToolbar";
import { RowActions } from "../components/tables/RowActions";
import { InputField } from "../components/forms/FormFields";
import { UserFormDrawer } from "../components/forms/UserFormDrawer";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { AppUser, ROLE_LABELS, UserMutationInput } from "../types/models";
import { UsersService } from "../services/auth.service";

export const UsuariosPage = () => {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [data, setData] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<AppUser | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const users = await UsersService.getAll(search);
      setData(users);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudieron cargar usuarios",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [search]);

  const handleCreate = async (input: UserMutationInput) => {
    try {
      await UsersService.create(input);
      await loadData();
      toast("Usuario creado", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo crear el usuario",
        "error",
      );
    }
  };

  const handleUpdate = async (input: UserMutationInput) => {
    if (!editingItem) return;

    try {
      await UsersService.update(editingItem.id, input);
      refreshUser();
      await loadData();
      toast("Usuario actualizado", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el usuario",
        "error",
      );
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    try {
      await UsersService.toggleActive(user.id);
      refreshUser();
      await loadData();
      toast(
        user.isActive ? "Usuario desactivado" : "Usuario activado",
        "success",
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del usuario",
        "error",
      );
    }
  };

  const columns = useMemo<Column<AppUser>[]>(() => {
    return [
      {
        header: "Usuario",
        cell: (user) => (
          <div>
            <div className="font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">
              @{user.username} · {user.email}
            </div>
          </div>
        ),
      },
      {
        header: "Rol",
        cell: (user) => ROLE_LABELS[user.role],
      },
      {
        header: "Estado",
        cell: (user) => (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              user.isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {user.isActive ? "Activo" : "Inactivo"}
          </span>
        ),
      },
      {
        header: "Acciones",
        className: "text-right",
        cell: (user) => (
          <RowActions
            onEdit={() => {
              setEditingItem(user);
              setIsDrawerOpen(true);
            }}
            customActions={
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleToggleActive(user);
                }}
                className={`rounded-lg p-2 transition-colors ${
                  user.isActive
                    ? "text-amber-600 hover:bg-amber-50"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
                title={user.isActive ? "Desactivar" : "Activar"}
              >
                {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
              </button>
            }
          />
        ),
      },
    ];
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
          <p className="text-sm text-slate-500">
            Administración de acceso, roles y credenciales.
          </p>
        </div>
        <div className="w-full md:w-80">
          <InputField
            label="Buscar usuario"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, username, correo o rol"
          />
        </div>
      </div>

      <TableToolbar
        title={`Usuarios (${data.length})`}
        onCreated={() => {
          setEditingItem(undefined);
          setIsDrawerOpen(true);
        }}
        actionLabel="Nuevo Usuario"
      />

      <DataTable data={data} columns={columns} isLoading={loading} />

      <UserFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        initialData={editingItem}
      />
    </div>
  );
};
