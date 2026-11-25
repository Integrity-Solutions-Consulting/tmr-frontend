import { DatePipe, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ActualizacionDatosService, MisDatos } from './actualizacion-datos.service';
import { calcularEdad, normalizarFechaPerfil } from './edad-perfil.util';

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

  readonly edad = calcularEdad;
  readonly fechaIso = normalizarFechaPerfil;

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
