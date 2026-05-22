import { AppRole, AppUser, PermissionMap } from "../types/models";

const NO_METAS = { view: false, create: false, edit: false };

export const PERMISSIONS_BY_ROLE: Record<AppRole, PermissionMap> = {
  admin: {
    dashboard: true,
    ventas: { view: true, create: true, edit: true, delete: true },
    cotizador_viaje: { view: true, create: true, edit: true, convert: true },
    cotizador_vehiculo: { view: true, create: true, edit: true, delete: true },
    permisos: { view: true, create: true, edit: true, delete: true },
    usuarios: { view: true, create: true, edit: true, delete: true },
    metas: NO_METAS,
  },
  gerente_comercial: {
    dashboard: true,
    ventas: { view: true, create: true, edit: true, delete: true },
    cotizador_viaje: { view: false, create: false, edit: false, convert: false },
    cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
    permisos: { view: true, create: true, edit: true, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    metas: { view: true, create: true, edit: true },
  },
  comercial: {
    dashboard: true,
    ventas: { view: true, create: true, edit: true, delete: true },
    cotizador_viaje: { view: false, create: false, edit: false, convert: false },
    cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
    permisos: { view: true, create: true, edit: true, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    metas: NO_METAS,
  },
  daños: {
    dashboard: false,
    ventas: { view: false, create: false, edit: false, delete: false },
    cotizador_viaje: { view: false, create: false, edit: false, convert: false },
    cotizador_vehiculo: { view: true, create: true, edit: true, delete: true },
    permisos: { view: true, create: true, edit: true, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    metas: NO_METAS,
  },
  personas: {
    dashboard: false,
    ventas: { view: true, create: true, edit: true, delete: true },
    cotizador_viaje: { view: false, create: false, edit: false, convert: false },
    cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
    permisos: { view: true, create: true, edit: true, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    metas: NO_METAS,
  },
};

export const getPermissionMap = (role: AppRole): PermissionMap =>
  PERMISSIONS_BY_ROLE[role];

export const canManageOwnedRecord = (user: AppUser, ownerUserId: string) =>
  user.role === "admin" ||
  user.role === "gerente_comercial" ||
  (["comercial", "personas"].includes(user.role) && user.id === ownerUserId);

export const canViewOwnedRecord = (user: AppUser, ownerUserId: string) =>
  !["comercial", "personas"].includes(user.role) || user.id === ownerUserId;
