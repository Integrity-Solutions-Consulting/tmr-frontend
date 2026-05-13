import { Component } from '@angular/core';
import { ListaClientesComponent } from '../componentes/lista-clientes/lista-clientes.component';

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  imports: [ListaClientesComponent],
  template: `<app-lista-clientes></app-lista-clientes>`,
})
export class ClientesPage {}