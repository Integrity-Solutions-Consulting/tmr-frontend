import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, input, signal, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermisosApiService, HistorialEnviosPermiso, obtenerMensajeAmigablePermisos } from '../permisos-api.service';

@Component({
  selector: 'app-envios-permiso', standalone: true, imports: [CommonModule],
  template: `
    <details (toggle)="alAbrir($event)">
      <summary>Notificaciones de esta solicitud</summary>
      <div class="envios" aria-live="polite">
        <button type="button" class="btn-tmr btn-tmr--secondary btn-tmr--sm" [disabled]="cargando() || !!reintentando()" (click)="cargar()">Actualizar envíos</button>
        @if (cargando()) { <p>Cargando envíos…</p> }
        @if (error()) { <p role="alert">{{ error() }}</p> }
        @if (mensaje()) { <p role="status">{{ mensaje() }}</p> }
        @if (historial(); as h) {
          @for (envio of h.envios; track envio.id) {
            <div class="envio">
              <div><strong>{{ envio.destinatario }}</strong><span>{{ envio.canal }} · {{ envio.fecha | date:'dd/MM/yyyy HH:mm' }}</span><span>{{ envio.estado }}</span>
              @if (envio.reintentadoPor) { <span>Reintento solicitado por {{ envio.reintentadoPor }}</span> }</div>
              @if (envio.puedeReintentar) {
                <button type="button" class="btn-tmr btn-tmr--secondary btn-tmr--sm" [disabled]="!!reintentando()" (click)="reintentar(envio.id)">{{ reintentando() === envio.id ? 'Registrando…' : 'Reintentar envío' }}</button>
              }
            </div>
          } @empty { <p>No hay correos registrados para esta solicitud.</p> }
          <p>{{ h.campana.length }} avisos recientes registrados en la campana. La lectura del aviso no confirma la solicitud.</p>
          <p>El envío al proveedor no confirma la recepción ni la lectura del correo.</p>
        }
      </div>
    </details>
  `,
  styles: [`
    :host { display: block; margin-block: 1rem; color: #334155; }
    details { border-block: 1px solid #dbe3ee; padding-block: .75rem; }
    summary { cursor: pointer; font-weight: 600; }
    summary:focus-visible, button:focus-visible { outline: 2px solid #193977; outline-offset: 3px; }
    .envios { padding-top: .75rem; font-size: .875rem; }
    .envio { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; padding-block: .75rem; border-bottom: 1px solid #e2e8f0; }
    .envio > div { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; }
    span { display: block; margin-top: .25rem; }
    button { flex-shrink: 0; font: inherit; font-weight: 600; color: #193977; background: #fff; border: 1px solid #b8c9e2; border-radius: 6px; padding: .45rem .7rem; cursor: pointer; }
    button:hover:not(:disabled) { background: #f1f5fb; }
    button:disabled { cursor: wait; opacity: .6; }
    [role="alert"] { color: #a52626; }
  `],
})
export class EnviosPermisoComponent {
  readonly solicitudId = input.required<number>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(PermisosApiService);
  readonly historial = signal<HistorialEnviosPermiso | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly reintentando = signal<string | null>(null);
  private abierto = false;
  constructor() {
    effect(() => { this.solicitudId(); this.historial.set(null); this.error.set(''); this.mensaje.set(''); this.cargando.set(false); if (this.abierto) this.cargar(); });
  }
  alAbrir(event: Event): void {
    this.abierto = (event.target as HTMLDetailsElement).open;
    if (this.abierto) this.cargar();
  }
  cargar(): void {
    const id = this.solicitudId();
    this.cargando.set(true); this.error.set('');
    this.api.obtenerEnvios(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { if (id === this.solicitudId()) { this.historial.set(res.data); this.cargando.set(false); } },
      error: err => { if (id === this.solicitudId()) { this.cargando.set(false); this.error.set(obtenerMensajeAmigablePermisos(err, 'No pudimos cargar los envíos. Pulsa Actualizar envíos.')); } },
    });
  }
  reintentar(envio: string): void {
    if (this.reintentando()) return;
    const id = this.solicitudId();
    this.reintentando.set(envio); this.mensaje.set(''); this.error.set('');
    this.api.reintentarEnvio(id, envio).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.reintentando.set(null); if (id === this.solicitudId()) { this.mensaje.set('Reintento registrado. El correo está pendiente de envío.'); this.cargar(); } },
      error: err => { this.reintentando.set(null); if (id === this.solicitudId()) { this.error.set(obtenerMensajeAmigablePermisos(err, 'No pudimos registrar el reintento. Actualiza los envíos.')); } },
    });
  }
}
