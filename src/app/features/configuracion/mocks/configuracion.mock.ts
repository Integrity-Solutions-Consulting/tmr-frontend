import { Feriado, Rol, Usuario } from '../models/configuracion.models';

export const MODULOS_DISPONIBLES = [
  'Dashboard',
  'Proyectos',
  'Actividades',
  'Seguimiento',
  'Colaboradores',
  'Clientes',
  'Lideres',
  'Roles',
  'Usuarios',
  'Dias Festivos',
  'Proyecto por horas',
  'Proyecto por fechas',
  'Solicitud de requerimiento',
  'Historial de requerimiento',
];

export const ROLES_MOCK: Rol[] = [
  {
    id: 1,
    nombre: 'Administrador',
    descripcion: 'Acceso completo al sistema y gobierno de configuracion.',
    modulos: MODULOS_DISPONIBLES,
  },
  {
    id: 2,
    nombre: 'Gerente',
    descripcion: 'Puede aprobar solicitudes, revisar reportes y supervisar equipos.',
    modulos: ['Dashboard', 'Proyectos', 'Actividades', 'Seguimiento', 'Clientes', 'Lideres'],
  },
  {
    id: 3,
    nombre: 'Lider',
    descripcion: 'Gestiona proyectos, actividades y seguimiento de su equipo.',
    modulos: ['Proyectos', 'Actividades', 'Seguimiento', 'Colaboradores', 'Proyecto por horas'],
  },
  {
    id: 4,
    nombre: 'Colaborador',
    descripcion: 'Registra actividades y consulta sus reportes operativos.',
    modulos: ['Actividades', 'Seguimiento'],
  },
  {
    id: 5,
    nombre: 'Recursos Humanos',
    descripcion: 'Administra colaboradores, usuarios y calendario institucional.',
    modulos: ['Dashboard', 'Seguimiento', 'Colaboradores', 'Usuarios', 'Dias Festivos'],
  },
];

export const USUARIOS_MOCK: Usuario[] = [
  {
    id: 1,
    nombres: 'Administrador Administrador',
    email: 'admin@integrity.com',
    usuario: 'admin',
    roles: ['Administrador', 'Gerente', 'Lider'],
    estado: 'Activo',
    area: 'Direccion',
  },
  {
    id: 2,
    nombres: 'Andrea Angelina Orrala Leon',
    email: 'andrea.orrala@integritysolutions.com.ec',
    usuario: 'aorrala',
    roles: ['Colaborador'],
    estado: 'Activo',
    area: 'Proyectos',
  },
  {
    id: 3,
    nombres: 'Diego Alberto Cedeno Cruz',
    email: 'diego.cedeno@integritysolutions.com.ec',
    usuario: 'dcedeno',
    roles: ['Colaborador'],
    estado: 'Activo',
    area: 'Desarrollo',
  },
  {
    id: 4,
    nombres: 'Carmen Ledesma Vasquez',
    email: 'carmen.ledesma@integritysolutions.com.ec',
    usuario: 'cledesma',
    roles: ['Lider', 'Colaborador'],
    estado: 'Activo',
    area: 'Operaciones',
  },
  {
    id: 5,
    nombres: 'Maylin Johanna Leon Nacipucha',
    email: 'maylin.leon@integritysolutions.com.ec',
    usuario: 'mleon',
    roles: ['Colaborador', 'Recursos Humanos'],
    estado: 'Inactivo',
    area: 'Talento Humano',
  },
];

export const FERIADOS_MOCK: Feriado[] = [
  {
    id: 1,
    tipo: 'Nacional',
    nombre: 'Ano Nuevo',
    fecha: '2026-01-01',
  },
  {
    id: 2,
    tipo: 'Nacional',
    nombre: 'Carnaval Dia 1',
    fecha: '2026-02-16',
  },
  {
    id: 3,
    tipo: 'Nacional',
    nombre: 'Carnaval Dia 2',
    fecha: '2026-02-17',
  },
  {
    id: 4,
    tipo: 'Religioso',
    nombre: 'Viernes Santo',
    fecha: '2026-04-03',
  },
  {
    id: 5,
    tipo: 'Local',
    nombre: 'Fundacion de Guayaquil',
    fecha: '2026-07-25',
  },
];
