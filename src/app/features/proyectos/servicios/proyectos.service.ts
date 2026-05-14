import { Injectable } from '@angular/core';
import { Proyecto } from '../modelos/proyecto.model';
import { PROYECTOS_MOCK } from '../mocks/proyectos.mock';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  obtenerProyectos(): Proyecto[] {
    return PROYECTOS_MOCK;
  }

}