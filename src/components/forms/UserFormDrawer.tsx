import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  APP_ROLES,
  AppRole,
  AppUser,
  ROLE_LABELS,
  UserMutationInput,
} from "../../types/models";

const generateUsernameFromName = (value: string) => {
  const normalized = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const words = normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0];

  return `${words[0][0]}${words[1]}`;
};

interface UserFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (user: UserMutationInput) => void;
  initialData?: AppUser;
}

interface UserFormState extends UserMutationInput {
  password: string;
}

const emptyForm: UserFormState = {
  username: "",
  name: "",
  email: "",
  role: "comercial",
  password: "",
  isActive: true,
};

export const UserFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: UserFormDrawerProps) => {
  const [formData, setFormData] = useState<UserFormState>(emptyForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: generateUsernameFromName(initialData.name),
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        password: "",
        isActive: initialData.isActive,
      });
      return;
    }

    setFormData(emptyForm);
  }, [initialData, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      username: formData.username,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      password: formData.password,
      isActive: formData.isActive,
    });
    onClose();
  };

  const handleChange = <K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Usuario" : "Nuevo Usuario"}
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Nombre completo"
          value={formData.name}
          onChange={(event) => {
            const name = event.target.value;
            setFormData((current) => ({
              ...current,
              name,
              username: generateUsernameFromName(name),
            }));
          }}
          required
        />
        <InputField
          label="Username"
          value={formData.username}
          readOnly
          className="opacity-80"
          placeholder="Se genera automáticamente"
          disabled
        />

        <InputField
          label={initialData ? "Nueva contraseña" : "Contraseña"}
          type="password"
          value={formData.password}
          onChange={(event) => handleChange("password", event.target.value)}
          placeholder={
            initialData ? "Déjala vacía para conservar la actual" : ""
          }
          required={!initialData}
        />

        <InputField
          label="Correo"
          type="email"
          value={formData.email}
          onChange={(event) => handleChange("email", event.target.value)}
          required
        />

        <SelectField
          label="Rol"
          value={formData.role}
          onChange={(event) =>
            handleChange("role", event.target.value as AppRole)
          }
          options={APP_ROLES.map((role) => ({
            value: role,
            label: ROLE_LABELS[role],
          }))}
        />

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(event) => handleChange("isActive", event.target.checked)}
          />
          Usuario activo
        </label>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
          >
            {initialData ? "Actualizar" : "Crear Usuario"}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
