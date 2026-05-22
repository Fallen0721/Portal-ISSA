export const roles = [
  "admin",
  "comercial",
  "daños",
  "personas",
  "gerente_comercial",
];

export const getPermissionMap = (role) => {
  const noMetas = { view: false, create: false, edit: false };

  const maps = {
    admin: {
      dashboard: true,
      ventas: { view: true, create: true, edit: true, delete: true },
      cotizador_viaje: { view: true, create: true, edit: true, convert: true },
      cotizador_vehiculo: { view: true, create: true, edit: true, delete: true },
      permisos: { view: true, create: true, edit: true, delete: true },
      usuarios: { view: true, create: true, edit: true, delete: true },
      metas: noMetas,
    },
    gerente_comercial: {
      dashboard: true,
      ventas: { view: true, create: true, edit: true, delete: true },
      cotizador_viaje: {
        view: false,
        create: false,
        edit: false,
        convert: false,
      },
      cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
      permisos: { view: true, create: true, edit: true, delete: false },
      usuarios: { view: false, create: false, edit: false, delete: false },
      metas: { view: true, create: true, edit: true },
    },
    comercial: {
      dashboard: true,
      ventas: { view: true, create: true, edit: true, delete: true },
      cotizador_viaje: {
        view: false,
        create: false,
        edit: false,
        convert: false,
      },
      cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
      permisos: { view: true, create: true, edit: true, delete: false },
      usuarios: { view: false, create: false, edit: false, delete: false },
      metas: noMetas,
    },
    daños: {
      dashboard: false,
      ventas: { view: false, create: false, edit: false, delete: false },
      cotizador_viaje: {
        view: false,
        create: false,
        edit: false,
        convert: false,
      },
      cotizador_vehiculo: { view: true, create: true, edit: true, delete: true },
      permisos: { view: true, create: true, edit: true, delete: false },
      usuarios: { view: false, create: false, edit: false, delete: false },
      metas: noMetas,
    },
    personas: {
      dashboard: true,
      ventas: { view: true, create: true, edit: true, delete: true },
      cotizador_viaje: {
        view: false,
        create: false,
        edit: false,
        convert: false,
      },
      cotizador_vehiculo: { view: false, create: false, edit: false, delete: false },
      permisos: { view: true, create: true, edit: true, delete: false },
      usuarios: { view: false, create: false, edit: false, delete: false },
      metas: noMetas,
    },
  };

  return maps[role];
};

export const canManageOwnedRecord = (user, ownerUserId) =>
  user.role === "admin" ||
  user.role === "gerente_comercial" ||
  (["comercial", "personas"].includes(user.role) && user.id === ownerUserId);

export const canViewOwnedRecord = (user, ownerUserId) =>
  !["comercial", "personas"].includes(user.role) || user.id === ownerUserId;
