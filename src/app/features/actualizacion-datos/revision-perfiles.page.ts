import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { Boton } from '../../shared/components/boton/boton';
import { ActualizacionDatosService } from './actualizacion-datos.service';

interface DecisionSeccion {
  estado: string;
  observacion: string;
  error: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterBarComponent, HeaderComponent, TarjetaResumenComponent, Boton],
  template: `
    <main [class.perfil-revision]="perfilId">
      <app-header *ngIf="!perfilId" title="Revisi&oacute;n de Solicitudes" subtitle="Solicitudes de actualizaci&oacute;n de perfiles"></app-header>
      <ng-container *ngIf="!perfilId">
      <div class="resumen" *ngIf="!loading">
        <app-tarjeta-resumen titulo="Colaboradores" icono="groups" tono="destacado" [valor]="personas.length" />
        <app-tarjeta-resumen titulo="En revisi&oacute;n" icono="pending_actions" tono="corporativo" [valor]="contar('EnRevision')" />
        <app-tarjeta-resumen titulo="Requieren correcci&oacute;n" icono="edit_document" tono="neutro" [valor]="contar('RequiereCorreccion')" />
      </div>
      <app-filter-bar class="filtros">
        <label filter-control class="filtro filtro--busqueda">
          <span>B&uacute;squeda</span>
          <span class="filtro-campo">
            <span class="material-symbols-outlined filtro-icono" aria-hidden="true">search</span>
            <input type="text" placeholder="Buscar por nombre, c&eacute;dula o correo" [(ngModel)]="busqueda">
            <button *ngIf="busqueda" type="button" class="filtro-limpiar" aria-label="Limpiar b&uacute;squeda" (click)="busqueda = ''">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </span>
        </label>
        <label filter-control class="filtro">Secci&oacute;n
          <select [(ngModel)]="filtroSeccion">
            <option value="">Todas</option>
            <option *ngFor="let seccion of secciones | keyvalue" [value]="seccion.key">{{ seccion.value }}</option>
          </select>
        </label>
        <label filter-control class="filtro">Estado
          <select [(ngModel)]="filtroEstado">
            <option value="">Todos</option>
            <option *ngFor="let estado of estados | keyvalue" [value]="estado.key">{{ estado.value }}</option>
          </select>
        </label>
      </app-filter-bar>
      <div class="tabla">
      <table>
        <thead><tr><th>Colaborador</th><th>C&eacute;dula</th><th>Correo</th><th>Estado de revisi&oacute;n</th><th>&Uacute;ltimo env&iacute;o</th><th>Acciones</th></tr></thead>
        <tbody>
        <tr *ngIf="loading"><td colspan="6" role="status">Cargando solicitudes...</td></tr>
        <tr *ngIf="!loading && !personasFiltradas.length">
          <td class="vacio" colspan="6">{{ error && !personas.length ? error : personas.length ? 'No hay resultados para los filtros seleccionados.' : 'No hay solicitudes.' }}</td>
        </tr>
        <tr *ngFor="let persona of personasFiltradas; trackBy: identificarColaborador" class="fila-perfil" (click)="irAlPerfil(persona.idEmpleado)">
          <td><a class="nombre-perfil" [href]="urlPerfil(persona.idEmpleado)" (click)="$event.stopPropagation()">{{ persona.nombre }}</a></td><td>{{ persona.cedula }}</td><td>{{ persona.correo || "?" }}</td>
          <td><span class="estado" [class.estado--pendiente]="estadoRevision(persona) === 'EnRevision'">{{ estados[estadoRevision(persona)] || "Sin solicitudes" }}</span></td><td>{{ persona.solicitudes[0].fechaCreacion | date:'short' }}</td>
          <td><button type="button" class="ver-perfil" aria-label="Ver perfil" title="Ver perfil" (click)="$event.stopPropagation(); irAlPerfil(persona.idEmpleado)"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button></td>
        </tr></tbody>
      </table>
      </div>
      </ng-container>
      <p class="aviso" role="alert" *ngIf="error && (perfilId || personas.length)">{{ error }}</p>
      <p role="status" *ngIf="perfilId && loading">Cargando perfil...</p>
      <a *ngIf="perfilId && !loading && !persona" routerLink="/revision-perfiles">Volver a solicitudes</a>
      <section class="detalle" *ngIf="persona">
        <app-boton label="Volver a solicitudes" icon="arrow_back" type="secondary" [disabled]="saving" (clicked)="volver()" />
        <header class="identidad-perfil">
          <app-header [title]="persona.nombre" [compact]="true" />
          <span *ngIf="estadoRevision(persona) as estadoPerfil" class="estado" [attr.data-estado]="estadoPerfil">{{ estados[estadoPerfil] }}</span>
        </header>
        <div class="perfil-secciones">
          <ng-container *ngFor="let seccion of secciones | keyvalue: null">
            <section *ngIf="envios[seccion.key] as envio" class="seccion-enviada">
              <header class="cabecera-seccion">
                <h3><span class="icono material-symbols-outlined" aria-hidden="true">{{ iconosSeccion[seccion.key] }}</span>{{ seccion.value }}</h3>
                <div class="acciones-seccion">
                  <span *ngIf="envio.seccion !== 'conocimientos'" class="estado" [attr.data-estado]="envio.estado">{{ estados[envio.estado] }}</span>
                  <app-boton *ngIf="envio.seccion !== 'conocimientos' && envio.estado === 'EnRevision'" label="Revisar" icon="fact_check" type="secondary" [disabled]="saving" (clicked)="alternarDecision(envio.id)" />
                </div>
              </header>
              <div class="apartado" *ngIf="envio.seccion === 'conocimientos'; else apartadosSeccion">
                <table class="tabla-conocimientos">
                  <thead>
                    <tr><th scope="col">Conocimiento</th><th scope="col">Porcentaje</th></tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let conocimiento of envio.propuesta.conocimientos">
                      <td>{{ conocimiento.area }}</td>
                      <td>{{ conocimiento.porcentaje }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #apartadosSeccion>
              <ng-container *ngFor="let apartado of apartados(envio); trackBy: identificarApartado">
                <div class="apartado">
                  <h4 *ngIf="apartado.titulo">{{ apartado.titulo }}</h4>
                  <ng-container *ngTemplateOutlet="datos; context: {$implicit: apartado.datos}"></ng-container>
                  <div class="adjuntos" *ngIf="apartado.archivos.length">
                    <h5>Documentos adjuntos</h5>
                    <div class="archivo" *ngFor="let archivo of apartado.archivos; trackBy: identificarArchivo">
                      <div class="archivo-nombre">
                        <span>{{ tipoDocumento(archivo.seccion) }}</span>
                        <small>{{ archivo.nombreOriginal }}</small>
                        <small role="status" *ngIf="archivosEnCurso.has(archivo.id)">Cargando archivo…</small>
                        <small class="error-archivo" role="alert" *ngIf="erroresArchivo[archivo.id] as mensaje">{{ mensaje }}</small>
                      </div>
                      <div class="acciones-seccion">
                        <button type="button" class="accion-archivo" [disabled]="archivosEnCurso.has(archivo.id)" (click)="descargar(archivo, envio.id, true)">
                          <span class="material-symbols-outlined" aria-hidden="true">visibility</span>Ver
                        </button>
                        <button type="button" class="accion-archivo" [disabled]="archivosEnCurso.has(archivo.id)" (click)="descargar(archivo, envio.id)">
                          <span class="material-symbols-outlined" aria-hidden="true">download</span>Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ng-container>
              </ng-template>
              <p *ngIf="envio.seccion !== 'conocimientos' && envio.observacion" class="aviso"><strong>Observación</strong><br>{{ envio.observacion }}</p>
              <ng-container *ngIf="decisiones[envio.id] as decision">
                <form class="decision" *ngIf="envio.estado === 'EnRevision'" (ngSubmit)="guardar(envio, decision)">
                  <label class="filtro">Estado de la sección
                    <select name="estado" [(ngModel)]="decision.estado" [disabled]="saving">
                      <option value="">Selecciona un estado</option>
                      <option value="Aprobada">Aprobada</option>
                      <option value="RequiereCorreccion">Requiere corrección</option>
                    </select>
                  </label>
                  <label>{{ decision.estado === 'RequiereCorreccion' ? 'Campo o documento que debe corregir y motivo' : 'Observación (opcional)' }}
                    <textarea name="observacion" [(ngModel)]="decision.observacion" [disabled]="saving" [required]="decision.estado === 'RequiereCorreccion'"></textarea>
                  </label>
                  <p role="alert" *ngIf="decision.error">{{ decision.error }}</p>
                  <app-boton label="Guardar decisión" icon="save" type="secondary" buttonType="submit"
                    [disabled]="saving || !decision.estado || (decision.estado === 'RequiereCorreccion' && !decision.observacion.trim())" />
                </form>
              </ng-container>
            </section>
          </ng-container>
        </div>
        <p role="status" *ngIf="cargandoSecciones">Cargando secciones…</p>
        <app-boton *ngIf="faltanSecciones" label="Reintentar secciones pendientes" icon="refresh" type="secondary" (clicked)="cargarSecciones()" />
      </section>
      <ng-template #datos let-valor>
        <dl *ngIf="esObjeto(valor); else texto">
          
          <ng-container *ngFor="let campo of entradas(valor)">
            <div class="campo-dato">
              <dt>{{ tituloCampo(campo[0]) }}</dt>
            <dd>
              <ng-container *ngIf="campo[0] === 'porcentajeDiscapacidad'; else otroDato">{{ campo[1] }}%</ng-container>
              <ng-template #otroDato><ng-container *ngTemplateOutlet="datos; context: {$implicit: campo[1]}"></ng-container></ng-template>
            </dd>
            </div>
          </ng-container>
        </dl>
        <ng-template #texto>{{ valor == null || valor === '' ? 'Sin información' : valor }}</ng-template>
      </ng-template>
    </main>
  `,
  styles: [`
    main { padding: clamp(1rem, 3vw, 1.5rem); }
    .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .aviso { padding: .75rem 1rem; border-radius: .5rem; background: var(--bg-soft); }

    .filtros { margin-bottom: 1rem; }
    .filtro { display: grid; gap: .375rem; min-width: min(10rem, 100%); margin: 0; font-size: .875rem; font-weight: 600; }
    .filtro--busqueda { flex: 1 1 16rem; min-width: 0; }
    .filtro-campo { display: flex; align-items: center; gap: .5rem; }
    .filtro-campo, .filtro select { min-height: 2.5rem; padding: 0 .75rem; border: 1px solid var(--border-color, #d1d5db); border-radius: .5rem; background: var(--bg-card); color: inherit; }
    .filtro input { flex: 1; min-width: 0; padding-block: .5rem; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 400; }
    .filtro select { font: inherit; font-weight: 400; }
    .filtro-icono, .filtro-limpiar span { font-size: 1.125rem; }
    .filtro-limpiar { display: grid; place-items: center; padding: .25rem; border: 0; background: transparent; color: inherit; cursor: pointer; }
    .fila-perfil { cursor: pointer; }
    .nombre-perfil { color: inherit; text-decoration: underline; }
    .ver-perfil { display: inline-grid; place-items: center; min-width: 2.5rem; min-height: 2.5rem; border: 0; border-radius: .5rem; background: var(--bg-soft); color: var(--primary-color); cursor: pointer; text-decoration: none; }
    .ver-perfil span { pointer-events: none; }
    .ver-perfil:hover { background: var(--bg-hover); }
    .tabla { overflow-x: auto; border-radius: .75rem; background: var(--pattern-table-bg); box-shadow: var(--elevation-card); }
    thead { background: var(--pattern-table-header-bg); }
    tbody tr:hover { background: var(--pattern-table-row-hover); }
    th { white-space: nowrap; }
    td.vacio { text-align: center; padding: 2rem 1rem; color: var(--text-muted); }
    .estado { display: inline-block; padding: .25rem .65rem; border-radius: 999px; background: var(--bg-soft); font-weight: 600; }
    .estado--pendiente { color: var(--status-info-text); background: var(--status-info-bg-soft); }
    main.perfil-revision { padding: 0; }
    .detalle { margin-top: 0; }
    .decision { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #d1d5db); }
    .decision .filtro { width: fit-content; margin-bottom: .75rem; }
    .decision textarea { box-sizing: border-box; padding: .625rem; margin-top: .375rem; border: 1px solid var(--border-color, #d1d5db); border-radius: .5rem; background: var(--bg-card); color: inherit; }

    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .75rem 1rem; border-bottom: 1px solid var(--border-color, #d1d5db); }
    main > section:not(.detalle) { margin-top: 1.5rem; }
    .perfil-secciones { display: grid; gap: 1rem; margin-block: 1rem; }
    .seccion-enviada { padding: 1rem; border-radius: .75rem; background: var(--bg-soft); }
    .seccion-enviada header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }
    .seccion-enviada h3, .apartado h4 { margin: 0; }
    .apartado { margin-top: .75rem; padding: .875rem; border-radius: .5rem; background: var(--bg-card); overflow-wrap: anywhere; }
    .apartado dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: .375rem .75rem; }
    .tabla-conocimientos th, .tabla-conocimientos td { padding: .5rem .625rem; }
    .tabla-conocimientos th:last-child, .tabla-conocimientos td:last-child { width: 1%; text-align: right; }
    .tabla-conocimientos tbody tr:last-child td { border-bottom: 0; }
    .adjuntos { display: grid; gap: .5rem; margin-top: .75rem; }
    .acciones-seccion, .archivo { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
    dt { font-weight: 600; } dd { margin: 0 0 .5rem 0; }
    dd dl { padding-left: 1rem; } label { display: block; margin-bottom: .6rem; }
    textarea { display: block; width: min(32rem, 100%); }
    .detalle {
      display: grid;
      justify-items: start;
      gap: 16px;
    }
    .seccion-enviada {
      width: 100%;
      box-sizing: border-box;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 1rem;
      box-shadow: var(--elevation-card);
    }
    .identidad-perfil { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; width: 100%; gap: .75rem; }
    .identidad-perfil app-header { flex: 1 1 15rem; min-width: 0; overflow-wrap: anywhere; }
    .icono { display: inline-grid; place-items: center; flex: none; }
    .icono { width: 2.25rem; height: 2.25rem; border-radius: .65rem; background: var(--bg-surface); color: var(--text-secondary); font-size: 1.3rem; }
    .estado[data-estado="Aprobada"] { color: var(--status-success-text); background: var(--status-success-bg-soft); }
    .estado[data-estado="EnRevision"] { color: var(--status-info-text); background: var(--status-info-bg-soft); }
    .estado[data-estado="RequiereCorreccion"] { color: var(--status-danger-text); background: var(--status-danger-bg-soft); }
    .perfil-secciones { width: 100%; margin: 0; gap: 16px; }
    .seccion-enviada { overflow: hidden; padding: 0; }
    .seccion-enviada .cabecera-seccion { padding: .5rem .75rem; border-bottom: 1px solid var(--border-default); background: var(--bg-surface); }
    .cabecera-seccion h3, .adjuntos h5 { display: flex; align-items: center; gap: .65rem; margin: 0; }
    .apartado { margin: 0; padding: .875rem clamp(1rem, 2vw, 1.25rem); }
    .apartado + .apartado { border-top: 1px solid var(--border-default); }
    .apartado dl { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem 1rem; margin: 0; }
    .apartado > h4 + dl { margin-top: .65rem; }
    .campo-dato dt { color: var(--text-muted); font-size: .875rem; }
    .campo-dato dt, .campo-dato dd { font-weight: 400; }
    .campo-dato dd { margin: 0; min-width: 0; }
    .campo-dato dd dl { padding: 0; }
    .adjuntos { margin-top: .65rem; }
    .adjuntos h5 { font-size: .95rem; }
    .archivo { padding: .75rem 1rem; background: var(--bg-surface); border-radius: .65rem; }
    .archivo-nombre { display: grid; flex: 1 1 12rem; min-width: 0; font-weight: 400; }
    .archivo-nombre small { color: var(--text-muted); }
    .archivo-nombre .error-archivo { color: var(--status-danger-text); }
    .accion-archivo {
      display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .65rem; border-radius: .5rem;
      border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font: inherit; font-weight: 400; cursor: pointer;
    }
    .accion-archivo .material-symbols-outlined { font-size: 1.15rem; }
    .decision, .seccion-enviada > .aviso { margin: .5rem 1rem 1rem; }
    @media (max-width: 740px) { .apartado dl { grid-template-columns: minmax(0, 1fr); } }
  `]
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
  personas: any[] = [];
  busqueda = '';
  filtroSeccion = '';
  filtroEstado = '';

  get personasFiltradas() {
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const buscar = normalizar(this.busqueda.trim());
    return this.personas.flatMap(persona => {
      if (!normalizar([persona.nombre, persona.cedula, persona.correo].join(' ')).includes(buscar)) return [];
      const solicitudes = persona.solicitudes.filter((solicitud: any) =>
        (!this.filtroSeccion || solicitud.seccion === this.filtroSeccion) &&
        (!this.filtroEstado || solicitud.estado === this.filtroEstado));
      return solicitudes.length ? [{ ...persona, solicitudes }] : [];
    });
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

  identificarColaborador(_indice: number, persona: { idEmpleado: number | string }) {
    return persona.idEmpleado;
  }

  urlPerfil(idEmpleado: number | string) {
    return this.router.serializeUrl(this.router.createUrlTree(['/revision-perfiles', idEmpleado]));
  }

  irAlPerfil(idEmpleado: number | string) {
    window.location.assign(this.urlPerfil(idEmpleado));
  }

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

  identificarApartado(indice: number) { return indice; }
  identificarArchivo(_indice: number, archivo: { id: number }) { return archivo.id; }

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
