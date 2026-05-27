import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Cliente, CrearClienteRequest, EditarClienteRequest,
  PaginacionResponse, FiltrosCliente, ResumenClientes,
  TipoIdentificacion
} from '../modelos/cliente.model';

// ─────────────────────────────────────────────────────────────
//  MOCK DATA — 25 clientes
// ─────────────────────────────────────────────────────────────
const DATA_MOCK: Cliente[] = [
  {
    id: 1, tipoId: 'RUC', identificador: '0991506241001',
    nombreComercial: 'Banco Guayaquil',
    correoElectronico: 'valeria.pazmino@bancoguayaquil.fin.ec',
    telefono: '0986473829', estado: 'Activo',
    nombres: 'Valeria', apellidos: 'Pazmiño', direccion: 'Av. Naciones Unidas, Guayaquil',
    proyectosAsignados: [
      { id: 1, nombre: 'Accesos Fábrica de Software',   cliente: 'Banco Guayaquil', estado: 'En progreso' },
      { id: 2, nombre: 'Proyecto Fábrica de Software',  cliente: 'Banco Guayaquil', estado: 'En progreso' },
      { id: 3, nombre: 'Migración Core Bancario',       cliente: 'Banco Guayaquil', estado: 'Completado'  },
      { id: 4, nombre: 'Portal Clientes Web',           cliente: 'Banco Guayaquil', estado: 'En progreso' },
      { id: 5, nombre: 'App Móvil BGQ',                 cliente: 'Banco Guayaquil', estado: 'Pausado'     },
    ]
  },
  {
    id: 2, tipoId: 'RUC', identificador: '1790221806001',
    nombreComercial: 'Banco Pichincha',
    correoElectronico: 'ricardo.molina@gmail.com.ec',
    telefono: '0992783645', estado: 'Activo',
    nombres: 'Ricardo', apellidos: 'Molina', direccion: 'Av. República, Quito',
    proyectosAsignados: [
      { id: 6, nombre: 'Sistema de Pagos Digitales', cliente: 'Banco Pichincha', estado: 'En progreso' },
      { id: 7, nombre: 'App Móvil Banca',            cliente: 'Banco Pichincha', estado: 'En progreso' },
    ]
  },
  {
    id: 3, tipoId: 'RUC', identificador: '1390067506001',
    nombreComercial: 'Banco Bolivariano',
    correoElectronico: 'samantha.salcedo@hotmail.com.ec',
    telefono: '0989374652', estado: 'Activo',
    nombres: 'Samantha', apellidos: 'Salcedo', direccion: 'Av. 9 de Octubre, Guayaquil',
    proyectosAsignados: [
      { id: 8, nombre: 'Plataforma de Inversiones', cliente: 'Banco Bolivariano', estado: 'Pausado' },
    ]
  },
  {
    id: 4, tipoId: 'RUC', identificador: '0990459444001',
    nombreComercial: 'Produbanco',
    correoElectronico: 'daniel.erazo@pichincha.com.ec',
    telefono: '0997456321', estado: 'Activo',
    nombres: 'Daniel', apellidos: 'Erazo', direccion: 'Av. Amazonas, Quito',
    proyectosAsignados: []
  },
  {
    id: 5, tipoId: 'RUC', identificador: '0790002350001',
    nombreComercial: 'Banco del Austro',
    correoElectronico: 'fernanda.ocana@lojanos.com.ec',
    telefono: '0982345678', estado: 'Activo',
    nombres: 'Fernanda', apellidos: 'Ocaña', direccion: 'Calle Bolívar, Cuenca',
    proyectosAsignados: [
      { id: 9, nombre: 'Sistema Contable Integrado', cliente: 'Banco del Austro', estado: 'En progreso' },
    ]
  },
  {
    id: 6, tipoId: 'RUC', identificador: '0990005737001',
    nombreComercial: 'Banco Internacional',
    correoElectronico: 'carlos.iturralde@quito.gob.ec',
    telefono: '0995678901', estado: 'Activo',
    nombres: 'Carlos', apellidos: 'Iturralde', direccion: 'Av. Colón, Quito',
    proyectosAsignados: []
  },
  {
    id: 7, tipoId: 'RUC', identificador: '0990049459001',
    nombreComercial: 'Banco Solidario',
    correoElectronico: 'maria.guzman@cuenca.edu.ec',
    telefono: '0987654321', estado: 'Activo',
    nombres: 'María', apellidos: 'Guzmán', direccion: 'Av. Huayna Cápac, Cuenca',
    proyectosAsignados: [
      { id: 10, nombre: 'Módulo de Créditos Online', cliente: 'Banco Solidario', estado: 'En progreso' },
    ]
  },
  {
    id: 8, tipoId: 'RUC', identificador: '1790098354001',
    nombreComercial: 'Banco ProCredit',
    correoElectronico: 'luis.yanez@espol.edu.ec',
    telefono: '0999887766', estado: 'Inactivo',
    nombres: 'Luis', apellidos: 'Yánez', direccion: 'Av. Kennedy, Guayaquil',
    proyectosAsignados: []
  },
  {
    id: 9, tipoId: 'RUC', identificador: '1791251237001',
    nombreComercial: 'Citibank Ecuador',
    correoElectronico: 'pedro.salinas@citibank.com.ec',
    telefono: '0999887701', estado: 'Activo',
    nombres: 'Pedro', apellidos: 'Salinas', direccion: 'Av. Shyris, Quito',
    proyectosAsignados: [
      { id: 11, nombre: 'Trading Platform v2', cliente: 'Citibank Ecuador', estado: 'En progreso' },
    ]
  },
  {
    id: 10, tipoId: 'RUC', identificador: '1768150560001',
    nombreComercial: 'BanEcuador',
    correoElectronico: 'patricia.morales@banecuador.fin.ec',
    telefono: '0984321987', estado: 'Activo',
    nombres: 'Patricia', apellidos: 'Morales', direccion: 'Av. Patria, Quito',
    proyectosAsignados: []
  },
  {
    id: 11, tipoId: 'RUC', identificador: '1760001560001',
    nombreComercial: 'Corporación Financiera Nacional',
    correoElectronico: 'roberto.vargas@cfn.fin.ec',
    telefono: '0976543210', estado: 'Activo',
    nombres: 'Roberto', apellidos: 'Vargas', direccion: 'Av. Juan León Mera, Quito',
    proyectosAsignados: [
      { id: 12, nombre: 'Sistema de Garantías', cliente: 'CFN', estado: 'En progreso' },
    ]
  },
  {
    id: 12, tipoId: 'RUC', identificador: '1791423268001',
    nombreComercial: 'Mutualista Pichincha',
    correoElectronico: 'andrea.torres@mutualista.com.ec',
    telefono: '0991234567', estado: 'Inactivo',
    nombres: 'Andrea', apellidos: 'Torres', direccion: 'Av. 6 de Diciembre, Quito',
    proyectosAsignados: []
  },
  {
    id: 13, tipoId: 'RUC', identificador: '0990003456001',
    nombreComercial: 'Cooperativa JEP',
    correoElectronico: 'miguel.santos@jep.fin.ec',
    telefono: '0987654320', estado: 'Activo',
    nombres: 'Miguel', apellidos: 'Santos', direccion: 'Calle Larga, Cuenca',
    proyectosAsignados: [
      { id: 13, nombre: 'Portal Socios Digital', cliente: 'Cooperativa JEP', estado: 'Completado' },
    ]
  },
  {
    id: 14, tipoId: 'RUC', identificador: '1792234567001',
    nombreComercial: 'GNB Sudameris',
    correoElectronico: 'carolina.paz@gnb.com.ec',
    telefono: '0983456789', estado: 'Activo',
    nombres: 'Carolina', apellidos: 'Paz', direccion: 'Av. Orellana, Quito',
    proyectosAsignados: []
  },
  {
    id: 15, tipoId: 'RUC', identificador: '1790567890001',
    nombreComercial: 'Loja Sociedad Financiera',
    correoElectronico: 'jose.lozano@loja.fin.ec',
    telefono: '0994567890', estado: 'Inactivo',
    nombres: 'José', apellidos: 'Lozano', direccion: 'Calle Colón, Loja',
    proyectosAsignados: []
  },
  {
    id: 16, tipoId: 'Cédula', identificador: '1712345678',
    nombreComercial: 'Pascuales Online',
    correoElectronico: 'sofia.hidalgo@pascuales.ec',
    telefono: '0981234567', estado: 'Activo',
    nombres: 'Sofía', apellidos: 'Hidalgo', direccion: 'Av. Terminal, Guayaquil',
    proyectosAsignados: [
      { id: 14, nombre: 'E-commerce Platform', cliente: 'Pascuales Online', estado: 'En progreso' },
    ]
  },
  {
    id: 17, tipoId: 'RUC', identificador: '1792876543001',
    nombreComercial: 'Telecom Ecuador',
    correoElectronico: 'diana.luna@telecom.ec',
    telefono: '0996789012', estado: 'Activo',
    nombres: 'Diana', apellidos: 'Luna', direccion: 'Av. América, Quito',
    proyectosAsignados: []
  },
  {
    id: 18, tipoId: 'RUC', identificador: '1793456789001',
    nombreComercial: 'Energía Renovable SA',
    correoElectronico: 'pablo.guerrero@energia.ec',
    telefono: '0985678901', estado: 'Activo',
    nombres: 'Pablo', apellidos: 'Guerrero', direccion: 'Av. Maldonado, Quito',
    proyectosAsignados: [
      { id: 15, nombre: 'Sistema SCADA', cliente: 'Energía Renovable SA', estado: 'En progreso' },
    ]
  },
  {
    id: 19, tipoId: 'Pasaporte', identificador: 'XB123456',
    nombreComercial: 'Salud Total Corp',
    correoElectronico: 'natalia.vega@saludtotal.com',
    telefono: '0999012345', estado: 'Activo',
    nombres: 'Natalia', apellidos: 'Vega', direccion: 'Av. González Suárez, Quito',
    proyectosAsignados: []
  },
  {
    id: 20, tipoId: 'RUC', identificador: '1791098765001',
    nombreComercial: 'EduTech Ecuador',
    correoElectronico: 'gabriel.mora@edutech.ec',
    telefono: '0978901234', estado: 'Activo',
    nombres: 'Gabriel', apellidos: 'Mora', direccion: 'Av. Universitaria, Quito',
    proyectosAsignados: [
      { id: 16, nombre: 'LMS Plataforma Educativa', cliente: 'EduTech Ecuador', estado: 'Pausado' },
    ]
  },
  {
    id: 21, tipoId: 'RUC', identificador: '1794567890001',
    nombreComercial: 'AgroTech Solutions',
    correoElectronico: 'lucia.castillo@agrotech.ec',
    telefono: '0990123456', estado: 'Activo',
    nombres: 'Lucía', apellidos: 'Castillo', direccion: 'Km 14 Vía Daule, Guayaquil',
    proyectosAsignados: []
  },
  {
    id: 22, tipoId: 'RUC', identificador: '1795678901001',
    nombreComercial: 'Transporte Nacional',
    correoElectronico: 'ivan.flores@transporte.ec',
    telefono: '0989234567', estado: 'Inactivo',
    nombres: 'Iván', apellidos: 'Flores', direccion: 'Av. Simón Bolívar, Quito',
    proyectosAsignados: []
  },
  {
    id: 23, tipoId: 'RUC', identificador: '1796789012001',
    nombreComercial: 'MercadoCentro EC',
    correoElectronico: 'valeria.rios@mercadocentro.ec',
    telefono: '0997890123', estado: 'Activo',
    nombres: 'Valeria', apellidos: 'Ríos', direccion: 'Av. del Ejército, Quito',
    proyectosAsignados: [
      { id: 17, nombre: 'Marketplace v2', cliente: 'MercadoCentro EC', estado: 'En progreso' },
    ]
  },
  {
    id: 24, tipoId: 'RUC', identificador: '1797890123001',
    nombreComercial: 'Constructora del Sur',
    correoElectronico: 'oscar.mendez@constructora.ec',
    telefono: '0986789012', estado: 'Activo',
    nombres: 'Óscar', apellidos: 'Méndez', direccion: 'Av. Machala, Guayaquil',
    proyectosAsignados: []
  },
  {
    id: 25, tipoId: 'RUC', identificador: '1798901234001',
    nombreComercial: 'Pharmafuture SA',
    correoElectronico: 'elena.suarez@pharmafuture.ec',
    telefono: '0995678901', estado: 'Activo',
    nombres: 'Elena', apellidos: 'Suárez', direccion: 'Av. De los Shyris, Quito',
    proyectosAsignados: [
      { id: 18, nombre: 'ERP Farmacéutico', cliente: 'Pharmafuture SA', estado: 'En progreso' },
    ]
  },
];

let nextId = 26;

// ─────────────────────────────────────────────────────────────
//  SERVICE
// ─────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClientesMockService {

  private _clientes = signal<Cliente[]>([...DATA_MOCK]);

  // ── Resumen para card superior ────────────────────────────
  getResumen(): ResumenClientes {
    const todos = this._clientes();
    return {
      totalInactivos: todos.filter(c => c.estado === 'Inactivo').length,
      totalActivos:   todos.filter(c => c.estado === 'Activo').length,
      total:          todos.length,
    };
  }

  // ── Listado con filtros + paginación ──────────────────────
  getClientes(
    pagina: number,
    tamanoPagina: number,
    filtros: FiltrosCliente
  ): Observable<PaginacionResponse<Cliente>> {
    let resultado = [...this._clientes()];

    // Filtro búsqueda
    if (filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(c =>
        c.nombreComercial.toLowerCase().includes(q) ||     
        c.identificador.includes(q)                 ||
        (c.nombres && c.nombres.toLowerCase().includes(q))
      );
    }

    // Filtro estado
    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(c => c.estado === filtros.estado);
    }

    const totalItems   = resultado.length;
    const totalPaginas = Math.ceil(totalItems / tamanoPagina) || 1;
    const inicio       = (pagina - 1) * tamanoPagina;
    const items        = resultado.slice(inicio, inicio + tamanoPagina);

    return of({ items, totalItems, paginaActual: pagina, tamanoPagina, totalPaginas }).pipe(delay(300));
  }

  // ── Por ID ────────────────────────────────────────────────
  getClientePorId(id: number): Observable<Cliente> {
    const cliente = this._clientes().find(c => c.id === id);
    return cliente
      ? of({ ...cliente }).pipe(delay(200))
      : throwError(() => new Error('Cliente no encontrado'));
  }

  // ── Crear ─────────────────────────────────────────────────
  crearCliente(req: CrearClienteRequest): Observable<Cliente> {
    const nuevo: Cliente = {
      id:                nextId++,
      tipoId:            req.tipoId,
      identificador:     req.identificador,
      nombreComercial:   req.nombreComercial,
      correoElectronico: req.correoElectronico,
      telefono:          req.telefono,
      estado:            'Activo',
      proyectosAsignados: [],
    };
    this._clientes.update(list => [...list, nuevo]);
    return of({ ...nuevo }).pipe(delay(500));
  }

  // ── Editar ────────────────────────────────────────────────
  editarCliente(id: number, req: EditarClienteRequest): Observable<Cliente> {
    const index = this._clientes().findIndex(c => c.id === id);
    if (index === -1) return throwError(() => new Error('Cliente no encontrado'));

    this._clientes.update(list => {
      const copia = [...list];
      copia[index] = {
        ...copia[index],
        tipoId:            req.tipoId,
        identificador:     req.identificador,
        nombreComercial:   req.nombreComercial,
        correoElectronico: req.correoElectronico,
        telefono:          req.telefono,
        estado:            req.estado,
      };
      return copia;
    });

    return of({ ...this._clientes()[index] }).pipe(delay(500));
  }

  // ── Tipos de identificación ───────────────────────────────
  getTiposIdentificacion(): Observable<TipoIdentificacion[]> {
    return of(['RUC', 'Cédula', 'Pasaporte'] as TipoIdentificacion[]);
  }
}