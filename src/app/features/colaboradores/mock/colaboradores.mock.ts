// ============================================================
// MOCK DATA — Colaboradores (110 registros)
// ============================================================

 

import {
  Colaborador,
  TipoIdentificacion,
  EstadoColaborador,
  Modalidad,
  Categoria,
  Genero,
  EstadoProyecto,
} from '../models/colaborador.model';

 

const departamentos = [
  'Desarrollo', 'QA', 'Diseño UX/UI', 'DevOps', 'Datos',
  'Gestión de Proyectos', 'Seguridad', 'Infraestructura', 'IA & Machine Learning', 'Consultoría',
];

 

const cargos = [
  'Desarrollador Fullstack', 'Analista de Datos', 'Gerente de Proyecto',
  'Especialista en IA', 'Consultor de Ciberseguridad', 'Arquitecto de la Nube',
  'Ingeniero de DevOps', 'Diseñador de UX/UI', 'Tester de Software',
  'Desarrollador Backend', 'Desarrollador Frontend', 'Data Scientist',
  'Scrum Master', 'Tech Lead', 'Analista de Negocio',
];

 

const nombres = [
  ['Valeria', 'Pazmiño'], ['Ricardo', 'Molina'], ['Samantha', 'Salcedo'],
  ['Daniel', 'Erazo'], ['Fernanda', 'Benavides'], ['Carlos', 'Iturralde'],
  ['María', 'Guzmán'], ['Luis', 'Yánez'], ['Andrea', 'Torres'],
  ['Jorge', 'Ramírez'], ['Paola', 'Vega'], ['Miguel', 'Herrera'],
  ['Gabriela', 'Sánchez'], ['Roberto', 'Castillo'], ['Diana', 'Morales'],
  ['Andrés', 'Flores'], ['Natalia', 'Jiménez'], ['Pablo', 'Romero'],
  ['Verónica', 'Cruz'], ['Eduardo', 'Reyes'], ['Sofía', 'Mendoza'],
  ['Alejandro', 'Ortega'], ['Carolina', 'Ramos'], ['Javier', 'Vargas'],
  ['Laura', 'Peña'], ['Rodrigo', 'Salinas'], ['Isabel', 'Cárdenas'],
  ['Francisco', 'Medina'], ['Claudia', 'Espinoza'], ['Marcelo', 'Aguirre'],
  ['Stephanie', 'León'], ['Patricio', 'Suárez'], ['Daniela', 'Villareal'],
  ['Cristian', 'Naranjo'], ['Valeria', 'Proaño'], ['Sebastián', 'Mora'],
  ['Mónica', 'Quiñones'], ['Felipe', 'Tapia'], ['Beatriz', 'Lara'],
  ['Santiago', 'Andrade'], ['Lucía', 'Guerrero'], ['Esteban', 'Pinto'],
  ['Alexandra', 'Bravo'], ['Iván', 'Montalvo'], ['Camila', 'Hidalgo'],
  ['Omar', 'Delgado'], ['Karina', 'Alvarado'], ['Diego', 'Paredes'],
  ['Lorena', 'Cabrera'], ['Hugo', 'Mena'], ['Adriana', 'Cifuentes'],
  ['Nelson', 'Villacís'], ['Patricia', 'Barreiro'], ['Álvaro', 'Cueva'],
  ['Mariana', 'Armijos'], ['Víctor', 'Serrano'], ['Gloria', 'Tello'],
  ['Renato', 'Palacios'], ['Ana', 'Cevallos'], ['Marco', 'Izquierdo'],
  ['Pilar', 'Zúñiga'], ['Gustavo', 'Asanza'], ['Tamara', 'Ordóñez'],
  ['Ernesto', 'Freire'], ['Mayra', 'Dávila'], ['Julián', 'Rivadeneira'],
  ['Susana', 'Heredia'], ['Rafael', 'Cañar'], ['Priscila', 'Bustamante'],
  ['Giovanni', 'Moya'], ['Tatiana', 'Carrión'], ['César', 'Murillo'],
  ['Jenny', 'Arcos'], ['Byron', 'Gavilanes'], ['Rocío', 'Bonilla'],
  ['Xavier', 'Ochoa'], ['Miriam', 'Guailla'], ['Fabian', 'Coronel'],
  ['Elizabeth', 'Sigcho'], ['Hernán', 'Ulloa'], ['Liliana', 'Quishpe'],
  ['Bolívar', 'Morocho'], ['Nadia', 'Yuquilema'], ['Freddy', 'Aucancela'],
  ['Ximena', 'Pilco'], ['Germán', 'Allauca'], ['Elsa', 'Cargua'],
  ['Oswaldo', 'Lema'], ['Fanny', 'Guamán'], ['Arturo', 'Chacha'],
  ['Rosa', 'Moposita'], ['Luis', 'Chimbo'], ['Carmen', 'Tisalema'],
  ['Alfonso', 'Sisa'], ['Teresa', 'Quispe'], ['Raúl', 'Yupanqui'],
  ['Dolores', 'Cando'], ['Gonzalo', 'Shagñay'], ['Mirna', 'Tixi'],
  ['Ramiro', 'Paguay'], ['Sonia', 'Naula'], ['Wilmer', 'Cepeda'],
  ['Nelly', 'Granizo'], ['Édgar', 'Jordán'], ['Aracely', 'Vimos'],
  ['Héctor', 'Cáceres'], ['Nancy', 'Altamirano'], ['Wilson', 'Toapanta'],
  ['Margarita', 'Chiluisa'], ['Edison', 'Cunalata'],
];

 

const dominios = [
  'gmail.com', 'hotmail.com.ec', 'yahoo.es',
  'bancoguayaquil.fin.ec', 'pichincha.com.ec', 'quito.gob.ec',
  'cuenca.edu.ec', 'espol.edu.ec', 'integrity-solutions.com.ec',
  'tmr.com.ec',
];

 

const tipos: TipoIdentificacion[] = ['RPS', 'ISC', 'RPS E ISC'];
const estados: EstadoColaborador[] = ['Activo', 'Inactivo'];
const modalidades: Modalidad[] = ['Presencial', 'Remoto', 'Híbrida'];
const categorias: Categoria[] = ['Junior', 'Semi-senior', 'Senior', 'Especialista', 'Especialista Plus'];
const generos: Genero[] = ['Masculino', 'Femenino', 'Otro'];
const estadosProyecto: EstadoProyecto[] = ['En progreso', 'Completado', 'En pausa'];

 

const proyectosMock = [
  { nombre: 'Proyecto Fábrica de Software', cliente: 'Banco Guayaquil' },
  { nombre: 'Sistema de Reportes TMR', cliente: 'Integrity Solutions' },
  { nombre: 'Plataforma de BI', cliente: 'Banco Pichincha' },
  { nombre: 'App Móvil Recursos Humanos', cliente: 'Quito Gobierno' },
  { nombre: 'Microservicios Cloud', cliente: 'Espol' },
  { nombre: 'Portal de Clientes', cliente: 'TMR Corp' },
  { nombre: 'Data Warehouse', cliente: 'Cuenca Digital' },
  { nombre: 'Sistema de Seguridad', cliente: 'Integrity Solutions' },
];

 

function pad(n: number): string {
  return n.toString().padStart(10, '0');
}

 

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

 

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

 

function generarFecha(desde: number, hasta: number): string {
  const year = randomBetween(desde, hasta);
  const month = randomBetween(1, 12).toString().padStart(2, '0');
  const day = randomBetween(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

 

function generarProyectos(n: number): { id: string; nombre: string; cliente: string; estado: EstadoProyecto }[] {
  const resultado = [];
  for (let i = 0; i < n; i++) {
    const p = randomItem(proyectosMock);
    resultado.push({
      id: `PROJ-${randomBetween(100, 999)}`,
      nombre: p.nombre,
      cliente: p.cliente,
      estado: randomItem(estadosProyecto),
    });
  }
  return resultado;
}

 

export const COLABORADORES_MOCK: Colaborador[] = nombres.map((nombrePar, index) => {
  const [primerNombre, apellido] = nombrePar;
  const nombreCompleto = `${primerNombre} ${apellido}`;
  const correo = `${primerNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${randomItem(dominios)}`;
  const tipo = randomItem(tipos);
  const numProyectos = randomBetween(0, 5);
  const estado = index % 7 === 0 ? 'Inactivo' : 'Activo';

 

  return {
    id: `COL-${(index + 1).toString().padStart(4, '0')}`,
    identificacion: pad(randomBetween(100000000, 999999999)),
    tipoIdentificacion: tipo,
    nombreCompleto,
    departamento: randomItem(departamentos),
    fechaContratacion: generarFecha(2019, 2024),
    cargo: randomItem(cargos),
    aniosExperiencia: randomBetween(1, 15),
    modalidad: randomItem(modalidades),
    categoria: randomItem(categorias),
    correoElectronico: correo,
    fechaNacimiento: generarFecha(1985, 2002),
    telefono: `09${randomBetween(60000000, 99999999)}`,
    genero: index % 2 === 0 ? 'Femenino' : 'Masculino',
    direccion: `Urb. ${apellido} ${randomBetween(1, 50)}-${randomBetween(1, 20)}`,
    estado,
    proyectosAsignados: generarProyectos(numProyectos),
    numProyectos,
  };
});

 

// Datos fijos exactos de la imagen (primeros registros visibles)
COLABORADORES_MOCK[0] = {
  id: 'COL-0001',
  identificacion: '0954756595',
  tipoIdentificacion: 'RPS',
  nombreCompleto: 'Valeria Pazmiño',
  departamento: 'Desarrollo',
  fechaContratacion: '2025-04-03',
  cargo: 'Fullstack, Analista',
  aniosExperiencia: 3,
  modalidad: 'Híbrida',
  categoria: 'Senior',
  correoElectronico: 'valeria.pazmino@bancoguayaquil.fin.ec',
  fechaNacimiento: '2003-08-03',
  telefono: '0986473829',
  genero: 'Femenino',
  direccion: 'Urb. La Manzana 123-4',
  estado: 'Activo',
  proyectosAsignados: [
    { id: 'PROJ-001', nombre: 'Proyecto Fábrica de Software', cliente: 'Banco Guayaquil', estado: 'En progreso' },
    { id: 'PROJ-002', nombre: 'Proyecto Fábrica de Software', cliente: 'Banco Guayaquil', estado: 'En progreso' },
    { id: 'PROJ-003', nombre: 'Proyecto Fábrica de Software', cliente: 'Banco Guayaquil', estado: 'En progreso' },
  ],
  numProyectos: 3,
};

 

COLABORADORES_MOCK[1] = {
  id: 'COL-0002',
  identificacion: '0150742859',
  tipoIdentificacion: 'RPS',
  nombreCompleto: 'Ricardo Molina',
  departamento: 'Datos',
  fechaContratacion: '2022-06-15',
  cargo: 'Analista de Datos',
  aniosExperiencia: 4,
  modalidad: 'Remoto',
  categoria: 'Senior',
  correoElectronico: 'ricardo.molina@gmail.com.ec',
  fechaNacimiento: '1990-03-22',
  telefono: '0991234567',
  genero: 'Masculino',
  direccion: 'Av. Amazonas 456-7',
  estado: 'Inactivo',
  proyectosAsignados: [
    { id: 'PROJ-004', nombre: 'Plataforma de BI', cliente: 'Banco Pichincha', estado: 'Completado' },
  ],
  numProyectos: 1,
};

 

COLABORADORES_MOCK[2] = {
  id: 'COL-0003',
  identificacion: '1793258641',
  tipoIdentificacion: 'ISC',
  nombreCompleto: 'Samantha Salcedo',
  departamento: 'Gestión de Proyectos',
  fechaContratacion: '2021-09-10',
  cargo: 'Gerente de Proyecto',
  aniosExperiencia: 6,
  modalidad: 'Presencial',
  categoria: 'Especialista',
  correoElectronico: 'samantha.salcedo@hotmail.com.ec',
  fechaNacimiento: '1988-11-05',
  telefono: '0978654321',
  genero: 'Femenino',
  direccion: 'Calle El Inca 89-3',
  estado: 'Activo',
  proyectosAsignados: [
    { id: 'PROJ-005', nombre: 'Sistema de Reportes TMR', cliente: 'Integrity Solutions', estado: 'En progreso' },
    { id: 'PROJ-006', nombre: 'Portal de Clientes', cliente: 'TMR Corp', estado: 'En progreso' },
  ],
  numProyectos: 2,
};

 

COLABORADORES_MOCK[3] = {
  id: 'COL-0004',
  identificacion: '0582193764',
  tipoIdentificacion: 'RPS',
  nombreCompleto: 'Daniel Erazo',
  departamento: 'IA & Machine Learning',
  fechaContratacion: '2023-01-20',
  cargo: 'Especialista en IA',
  aniosExperiencia: 5,
  modalidad: 'Híbrida',
  categoria: 'Senior',
  correoElectronico: 'daniel.erazo@pichincha.com.ec',
  fechaNacimiento: '1993-07-14',
  telefono: '0961122334',
  genero: 'Masculino',
  direccion: 'Urb. Los Pinos 22-8',
  estado: 'Activo',
  proyectosAsignados: [
    { id: 'PROJ-007', nombre: 'Data Warehouse', cliente: 'Cuenca Digital', estado: 'En progreso' },
    { id: 'PROJ-008', nombre: 'Plataforma de BI', cliente: 'Banco Pichincha', estado: 'En pausa' },
    { id: 'PROJ-009', nombre: 'Microservicios Cloud', cliente: 'Espol', estado: 'En progreso' },
  ],
  numProyectos: 3,
};

 

COLABORADORES_MOCK[4] = {
  id: 'COL-0005',
  identificacion: '1357924680',
  tipoIdentificacion: 'RPS',
  nombreCompleto: 'Fernanda Benavides',
  departamento: 'Seguridad',
  fechaContratacion: '2020-11-30',
  cargo: 'Consultor de Ciberseguridad',
  aniosExperiencia: 8,
  modalidad: 'Presencial',
  categoria: 'Semi-senior',
  correoElectronico: 'fernanda.ocana@lojanos.com.ec',
  fechaNacimiento: '1987-04-18',
  telefono: '0954433221',
  genero: 'Femenino',
  direccion: 'Av. Patria 301-5',
  estado: 'Inactivo',
  proyectosAsignados: [
    { id: 'PROJ-010', nombre: 'Sistema de Seguridad', cliente: 'Integrity Solutions', estado: 'En pausa' },
    { id: 'PROJ-011', nombre: 'Portal de Clientes', cliente: 'TMR Corp', estado: 'Completado' },
    { id: 'PROJ-012', nombre: 'Microservicios Cloud', cliente: 'Espol', estado: 'En progreso' },
    { id: 'PROJ-013', nombre: 'Data Warehouse', cliente: 'Cuenca Digital', estado: 'En progreso' },
  ],
  numProyectos: 4,
};

 

COLABORADORES_MOCK[5] = {
  id: 'COL-0006',
  identificacion: '0246813579',
  tipoIdentificacion: 'ISC',
  nombreCompleto: 'Carlos Iturralde',
  departamento: 'Infraestructura',
  fechaContratacion: '2022-03-07',
  cargo: 'Arquitecto de la Nube',
  aniosExperiencia: 7,
  modalidad: 'Remoto',
  categoria: 'Junior',
  correoElectronico: 'carlos.iturralde@quito.gob.ec',
  fechaNacimiento: '1985-09-25',
  telefono: '0982211443',
  genero: 'Masculino',
  direccion: 'Calle Versalles 14-2',
  estado: 'Activo',
  proyectosAsignados: [
    { id: 'PROJ-014', nombre: 'Microservicios Cloud', cliente: 'Espol', estado: 'En progreso' },
  ],
  numProyectos: 1,
};

 

COLABORADORES_MOCK[6] = {
  id: 'COL-0007',
  identificacion: '2097531864',
  tipoIdentificacion: 'RPS',
  nombreCompleto: 'María Guzmán',
  departamento: 'DevOps',
  fechaContratacion: '2021-07-12',
  cargo: 'Ingeniero de DevOps',
  aniosExperiencia: 5,
  modalidad: 'Híbrida',
  categoria: 'Senior',
  correoElectronico: 'maria.guzman@cuenca.edu.ec',
  fechaNacimiento: '1991-12-03',
  telefono: '0975566778',
  genero: 'Femenino',
  direccion: 'Urb. Los Arrayanes 7-15',
  estado: 'Activo',
  proyectosAsignados: [
    { id: 'PROJ-015', nombre: 'Sistema de Reportes TMR', cliente: 'Integrity Solutions', estado: 'En progreso' },
  ],
  numProyectos: 1,
};

 

COLABORADORES_MOCK[7] = {
  id: 'COL-0008',
  identificacion: '0864297531',
  tipoIdentificacion: 'ISC',
  nombreCompleto: 'Luis Yánez',
  departamento: 'Diseño UX/UI',
  fechaContratacion: '2023-05-22',
  cargo: 'Diseñador de UX/UI',
  aniosExperiencia: 2,
  modalidad: 'Remoto',
  categoria: 'Junior',
  correoElectronico: 'luis.yanez@espol.edu.ec',
  fechaNacimiento: '1999-06-17',
  telefono: '0963344556',
  genero: 'Masculino',
  direccion: 'Av. 6 de Diciembre 88-1',
  estado: 'Inactivo',
  proyectosAsignados: [
    { id: 'PROJ-016', nombre: 'App Móvil Recursos Humanos', cliente: 'Quito Gobierno', estado: 'En progreso' },
  ],
  numProyectos: 1,
};