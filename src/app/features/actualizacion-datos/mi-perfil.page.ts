import { DatePipe, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ActualizacionDatosService, MisDatos } from './actualizacion-datos.service';

@Component({
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, TitleCasePipe, RouterLink, HeaderComponent],
  templateUrl: './mi-perfil.page.html',
  styleUrl: './mi-perfil.page.scss'
})
export class MiPerfilPage {
  private readonly api = inject(ActualizacionDatosService);
  readonly perfil = signal<MisDatos | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.api.getMine().subscribe({
      next: perfil => { this.perfil.set(perfil); this.cargando.set(false); },
      error: e => {
        this.error.set(e.error?.detail || 'No fue posible cargar tu perfil.');
        this.cargando.set(false);
      }
    });
  }

  edad(fecha?: string | null): number | null {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const hoy = new Date();
    const cumplePendiente = hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia);
    const edad = hoy.getFullYear() - anio - Number(cumplePendiente);
    return edad < 0 ? null : edad;
  }

  discapacidad(valor: string | null | undefined) {
    return valor === 'Si' || valor === 'Sí';
  }

  descargar(archivo: { id: number; nombreOriginal: string }) {
    this.error.set('');
    this.api.downloadMine(archivo.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = archivo.nombreOriginal;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.error.set('No fue posible descargar el documento.')
    });
  }
}
