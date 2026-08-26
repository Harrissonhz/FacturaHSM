-- =====================================================================
-- Crear perfil ADMIN para el usuario hsmfamilysport@gmail.com
-- (el usuario ya existe en Authentication; aquí se crea su perfil)
-- =====================================================================

insert into public.usuarios (id, tenant_id, nombre, rol, activo)
values (
  '4d757c77-8247-4def-bc15-f982fbc894e4',                       -- UID del usuario de Auth
  (select id from public.tenants where nombre = 'HSM' limit 1), -- tenant HSM
  'HSM Family Sport',                                           -- nombre (edítalo si quieres otro)
  'admin',                                                      -- rol administrador
  true
);

-- ---- Verificación ----
select u.id, u.nombre, u.rol, u.activo, t.nombre as tenant
from public.usuarios u
join public.tenants t on t.id = u.tenant_id
where u.id = '4d757c77-8247-4def-bc15-f982fbc894e4';
