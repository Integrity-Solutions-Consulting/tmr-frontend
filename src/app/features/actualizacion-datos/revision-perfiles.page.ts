import { DatePipe, KeyValuePipe, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { BadgeEstadoComponent, type TonoBadgeEstado } from '../../shared/components/badge-estado/badge-estado.component';
import { Boton } from '../../shared/components/boton/boton';
import { ActualizacionDatosService } from './actualizacion-datos.service';

type ColumnaRevision = 'nombre' | 'cedula' | 'correo' | 'estado' | 'fecha';

interface DecisionSeccion {
  estado: string;
  observacion: string;
  error: string;
}

@Component({
  standalone: true,
  imports: [BadgeEstadoComponent, DatePipe, KeyValuePipe, NgTemplateOutlet, FormsModule, MatIconModule, RouterLink, FilterBarComponent, HeaderComponent, TarjetaResumenComponent, Boton, TitleCasePipe],
  templateUrl: './revision-perfiles.page.html',
  styleUrl: './revision-perfiles.page.scss',
})
export class RevisionPerfilesPage {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ActualizacionDatosService);
  readonly secciones: Record<string,string> = { personal: 'Información personal', familia: 'Información familiar', formacion: 'Formación académica', certificaciones: 'Certificaciones', conocimientos: 'Conocimientos' };
  readonly iconosSeccion: Record<string, string> = {
    personal: 'person', familia: 'family_restroom', formacion: 'school',
    certificaciones: 'workspace_premium', conocimientos: 'psychology'
  };


  readonly estados: Record<string,string> = { Guardada: 'Guardada', EnRevision: 'En revisión', Aprobada: 'Aprobada', RequiereCorreccion: 'Requiere corrección', Reenviada: 'Reenviada' };
  readonly tonosEstado: Partial<Record<string, TonoBadgeEstado>> = {
    Aprobada: 'completed',
    EnRevision: 'progress',
    RequiereCorreccion: 'cancelled',
  };
  personas: any[] = [];
  busqueda = '';
  filtroSeccion = '';
  filtroEstado = '';
  readonly columnas: ReadonlyArray<{ campo: ColumnaRevision; titulo: string }> = [
    { campo: 'nombre', titulo: 'Nombre' },
    { campo: 'cedula', titulo: 'Identificación' },
    { campo: 'correo', titulo: 'Correo electrónico' },
    { campo: 'estado', titulo: 'Estado de revisión' },
    { campo: 'fecha', titulo: 'Último envío' },
  ];
  campoOrden: ColumnaRevision | null = null;
  ordenAscendente = true;
  private readonly comparador = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  ordenar(campo: ColumnaRevision) {
    this.ordenAscendente = campo !== this.campoOrden || !this.ordenAscendente;
    this.campoOrden = campo;
  }

  get personasFiltradas() {
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const buscar = normalizar(this.busqueda.trim());
    const filas = this.personas.flatMap(persona => {
      if (!normalizar([persona.nombre, persona.cedula, persona.correo].join(' ')).includes(buscar)) return [];
      const solicitudes = persona.solicitudes.filter((solicitud: any) =>
        (!this.filtroSeccion || solicitud.seccion === this.filtroSeccion) &&
        (!this.filtroEstado || solicitud.estado === this.filtroEstado));
      return solicitudes.length ? [{ ...persona, solicitudes }] : [];
    });

    const campo = this.campoOrden;
    if (!campo) return filas;

    const valor = (persona: (typeof filas)[number]): string => {
      if (campo === 'estado') return this.estados[this.estadoRevision(persona)] ?? '';
      if (campo === 'fecha') return persona.solicitudes[0].fechaCreacion ?? '';
      return persona[campo] ?? '';
    };
    const direccion = this.ordenAscendente ? 1 : -1;
    return filas.sort((a, b) => direccion * (campo === 'fecha'
      ? (Date.parse(valor(a)) || 0) - (Date.parse(valor(b)) || 0)
      : this.comparador.compare(valor(a), valor(b))));
  }

  persona: any;
  envios: Record<string, any> = {};
  decisiones: Partial<Record<number, DecisionSeccion>> = {};
  cargandoSecciones = false;
  faltanSecciones = false;
  error = '';
  loading = false;
  saving = false;

  get perfilId() {
    return this.route.snapshot.paramMap.get('colaborador') ?? this.route.snapshot.queryParamMap.get('colaborador');
  }

  ngOnInit() { this.cargar(); }

  private abrirDesdeRuta() {
    const id = this.perfilId;
    if (!id) {
      if (this.persona) this.cerrarPerfil();
      return;
    }
    if (String(this.persona?.idEmpleado) === id || this.loading) return;
    const persona = this.personas.find(x => String(x.idEmpleado) === id);
    if (persona) this.abrir(persona);
    else this.error = 'No se encontraron solicitudes para este colaborador.';
  }

  cargar() {
    this.loading = true;
    this.api.colaPerfil().subscribe({
      next: filas => {
        this.personas = filas;
        if (this.persona) this.persona = filas.find(x => x.idEmpleado === this.persona.idEmpleado) ?? this.persona;
        this.loading = false;
        this.abrirDesdeRuta();
        this.changeDetector.markForCheck();
      },
      error: e => {
        this.loading = false;
        this.error = e.status === 403 ? 'Tu usuario no tiene permiso para revisar perfiles.' : 'No fue posible cargar las solicitudes.';
        this.changeDetector.markForCheck();
      }
    });
  }

  contar(estado: string) {
    return this.personas.reduce((total, persona) => total + persona.solicitudes.filter((solicitud: any) => solicitud.estado === estado).length, 0);
  }

  estadoRevision(persona: any): string {
    const recientes = new Map<string, string>();
    for (const solicitud of persona.solicitudes) {
      if (!recientes.has(solicitud.seccion)) recientes.set(solicitud.seccion, solicitud.estado);
    }
    const estados = [...recientes.values()];
    return estados.find(x => x === 'EnRevision') ?? estados.find(x => x === 'RequiereCorreccion') ?? estados[0];
  }
  abrir(persona: any) {
    this.envios = {};
    this.decisiones = {};
    this.persona = this.personas.find(x => x.idEmpleado === persona.idEmpleado) ?? persona;
    this.cargarSecciones();
  }

  cargarSecciones() {
    const idEmpleado = this.persona.idEmpleado;
    const recientes = new Map<string, number>();
    for (const solicitud of this.persona.solicitudes) {
      if (!recientes.has(solicitud.seccion) && !this.envios[solicitud.seccion])
        recientes.set(solicitud.seccion, solicitud.id);
    }
    if (!recientes.size) return;

    this.cargandoSecciones = true;
    this.faltanSecciones = false;
    forkJoin([...recientes.values()].map(id => this.api.detallePerfil(id).pipe(catchError(() => of(null))))).subscribe(envios => {
      if (this.persona?.idEmpleado !== idEmpleado) return;
      for (const envio of envios) {
        if (envio?.vigente && envio.propuesta) this.envios[envio.seccion] = envio;
        else this.faltanSecciones = true;
      }
      this.cargandoSecciones = false;
      this.changeDetector.markForCheck();
    });
  }

  alternarDecision(id: number) {
    if (this.decisiones[id]) delete this.decisiones[id];
    else this.decisiones[id] = { estado: '', observacion: '', error: '' };
  }

  volver() {
    void this.router.navigate(['/revision-perfiles']);
  }

  private cerrarPerfil() {
    this.persona = undefined;
    this.error = '';
  }
  porSeccion(perfil: any, seccion: string) {
    const campo: Record<string,string> = { personal: 'persona', familia: 'familia', formacion: 'formaciones', certificaciones: 'certificaciones', conocimientos: 'conocimientos' };
    return perfil?.[campo[seccion]];
  }


  apartados(envio: any) {
    const datos = this.porSeccion(envio.propuesta, envio.seccion);
    const documentos: any[] = envio.documentos ?? [];
    const filas = (titulo: string, items: any[], tipos: string[]) => items.map((fila, indice) => ({
      titulo: fila.titulo || fila.nombre || [fila.nombres, fila.apellidos].filter(Boolean).join(' ') || titulo + ' ' + (indice + 1),
      datos: fila,
      archivos: documentos.filter(doc => tipos.includes(doc.seccion) &&
        ((fila.clave && doc.referenciaClave === fila.clave) || (fila.id && doc.referenciaId === fila.id)))
    }));
    switch (envio.seccion) {
      case 'familia':
        return [
          { titulo: '', datos: { estadoCivil: datos?.estadoCivil, tieneHijos: datos?.tieneHijos }, archivos: [] },
          ...filas('Pareja', datos?.pareja ? [datos.pareja] : [], ['Pareja']),
          ...filas('Hijo', datos?.familiares ?? [], ['Familiar', 'PartidaNacimiento'])
        ];
      case 'formacion': return filas('Estudio', datos ?? [], ['Formacion']);
      case 'certificaciones': return filas('Certificación', datos ?? [], ['Certificacion']);
      default: return [{ titulo: '', datos, archivos: documentos }];
    }
  }

  tipoDocumento(seccion: string) {
    const tipos: Record<string, string> = {
      Discapacidad: 'Carnet de discapacidad', Familiar: 'Carnet de discapacidad',
      PartidaNacimiento: 'Partida de nacimiento', Pareja: 'Documento de unión o matrimonio',
      Formacion: 'Título o diploma', Certificacion: 'Certificado'
    };
    return tipos[seccion] ?? 'Respaldo';
  }
  esObjeto(valor: unknown) { return valor != null && typeof valor === 'object'; }
  entradas(valor: object): [string, unknown][] {
    if (Array.isArray(valor)) return valor.map((item, i) => [String(i + 1), item]);
    return Object.entries(valor).filter(([campo, contenido]) => contenido != null && contenido !== '' && (!Array.isArray(contenido) || contenido.length > 0) && !/^(id|clave|seccion|archivos|solicitud|controlVersion|tipoRelacion|limpiar|claves?\w+AEliminar)/i.test(campo));
  }

  agruparDatosPersonales(valor: object) {
    const campos = this.entradas(valor);
    const esDiscapacidad = (campo: string) =>
      ['tieneDiscapacidad', 'tipoDiscapacidad', 'porcentajeDiscapacidad'].includes(campo);
    return {
      informacion: Object.fromEntries(campos.filter(([campo]) => !esDiscapacidad(campo))),
      discapacidad: Object.fromEntries(campos.filter(([campo]) => esDiscapacidad(campo))),
    };
  }
  tituloCampo(campo: string) {
    if (campo === 'tieneDiscapacidad') return 'Tiene discapacidad';
    if (campo === 'tipoDiscapacidad') return 'Tipos de discapacidad';
    if (campo === 'porcentajeDiscapacidad') return 'Porcentaje de discapacidad';
    return campo.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  }

  guardar(envio: any, decision: DecisionSeccion) {
    const { estado, observacion } = decision;
    if (this.saving || envio.estado !== 'EnRevision' || !estado ||
        (estado === 'RequiereCorreccion' && !observacion.trim())) return;
    this.saving = true;
    decision.error = '';
    this.api.decidirPerfil(envio.id, estado, observacion.trim()).subscribe({
      next: () => {
        envio.estado = estado;
        envio.observacion = observacion.trim();
        delete this.decisiones[envio.id];
        this.saving = false;
        this.cargar();
        this.changeDetector.markForCheck();
      },
      error: e => {
        this.saving = false;
        decision.error = e.error?.message ?? e.error?.detail ?? 'No fue posible guardar la decisión.';
        this.changeDetector.markForCheck();
      }
    });
  }

  readonly archivosEnCurso = new Set<number>();
  readonly erroresArchivo: Partial<Record<number, string>> = {};

  descargar(archivo: { id: number; nombreOriginal: string }, solicitudId: number, vistaPrevia = false) {
    if (this.archivosEnCurso.has(archivo.id)) return;
    delete this.erroresArchivo[archivo.id];
    const vista = vistaPrevia ? window.open('about:blank', '_blank') : null;
    if (vistaPrevia && !vista) {
      this.erroresArchivo[archivo.id] = 'El navegador bloqueó la vista previa. Puedes descargar el archivo.';
      return;
    }
    if (vista) vista.opener = null;
    this.archivosEnCurso.add(archivo.id);
    this.api.archivoPerfil(solicitudId, archivo.id).pipe(finalize(() => {
      this.archivosEnCurso.delete(archivo.id);
      this.changeDetector.markForCheck();
    })).subscribe({
      next: blob => {
        if (vistaPrevia && !['application/pdf', 'image/jpeg', 'image/png'].includes(blob.type)) {
          vista?.close();
          this.erroresArchivo[archivo.id] = 'La vista previa admite PDF, JPG y PNG. Puedes descargar el archivo.';
          this.changeDetector.markForCheck();
          return;
        }
        const url = URL.createObjectURL(blob);
        if (vista && !vista.closed) {
          vista.location.replace(url);
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return;
        }
        if (vistaPrevia) {
          URL.revokeObjectURL(url);
          return;
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.nombreOriginal;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: respuesta => {
        vista?.close();
        this.erroresArchivo[archivo.id] = respuesta.status === 404
          ? 'El respaldo ya no está disponible en el servidor.'
          : respuesta.status === 401 || respuesta.status === 403
            ? 'Tu sesión no tiene acceso a este respaldo.'
            : 'No fue posible obtener el respaldo. Intenta de nuevo.';
        this.changeDetector.markForCheck();
      }
    });
  }
}
