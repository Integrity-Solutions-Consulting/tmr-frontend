# Componente Tabla Genérica

## Descripción

El componente `TablaComponent` es un componente reutilizable y flexible diseñado para mostrar datos tabulares en diferentes contextos. Soporta múltiples tipos de contenido y se integra con el componente de paginación existente.

## Características

- ✅ Soporte para múltiples tipos de contenido (texto, badges, fechas, acciones)
- ✅ Integración con paginación
- ✅ Estado vacío personalizable
- ✅ Template personalizado para filas
- ✅ Estilos consistentes y responsivos
- ✅ Soporte para datos genéricos

## Importación

```typescript
import { TablaComponent, ColumnDefinition, TableConfig } from '@shared/componentes/tabla';
```

## Props

### Inputs

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `datos` | `T[]` | ✅ | Array de datos a mostrar |
| `columnas` | `ColumnDefinition[]` | ✅ | Definición de columnas |
| `datosPaginados` | `T[]` | ✅ | Datos ya paginados |
| `paginaActual` | `Signal<number> \| number` | ✅ | Página actual |
| `totalPaginas` | `Signal<number> \| number` | ✅ | Total de páginas |
| `total` | `number` | ✅ | Cantidad total de registros |
| `porPagina` | `number` | ✅ | Items por página |
| `mostrarDatos` | `Signal<boolean> \| boolean` | ✅ | Si mostrar datos o estado vacío |
| `config` | `TableConfig` | ❌ | Configuración de la tabla |

### Outputs

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `paginaCambia` | `number` | Se emite cuando cambia la página |
| `rowClick` | `T` | Se emite cuando se hace clic en una fila |
| `emptyStateAction` | `void` | Se emite cuando se ejecuta la acción del estado vacío |

## Tipos de Contenido (ContentType)

- **`text`**: Texto plano
- **`fecha`**: Fecha con formato personalizable
- **`badge`**: Badge de texto
- **`badge-estado`**: Badge con estado (similar a badge)
- **`action-menu`**: Para acciones (requiere template personalizado)
- **`custom`**: Contenido personalizado via template

## Casos de Uso

### Caso 1: Tabla Simple (Texto Plano)

Tabla básica con solo texto en todas las columnas.

```typescript
import { Component, signal } from '@angular/core';
import { TablaComponent, ColumnDefinition } from '@shared/componentes/tabla';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  estado: string;
}

@Component({
  selector: 'app-tabla-usuarios',
  standalone: true,
  imports: [TablaComponent],
  template: `
    <app-tabla
      [datos]="usuarios()"
      [columnas]="columnas"
      [datosPaginados]="datosPaginados()"
      [paginaActual]="paginaActual"
      [totalPaginas]="totalPaginas"
      [total]="usuarios().length"
      [porPagina]="itemsPorPagina"
      [mostrarDatos]="usuarios().length > 0">
    </app-tabla>
  `
})
export class TablaUsuariosComponent {
  usuarios = signal<Usuario[]>([
    { id: '1', nombre: 'Juan Pérez', email: 'juan@example.com', estado: 'Activo' },
    { id: '2', nombre: 'María García', email: 'maria@example.com', estado: 'Inactivo' },
  ]);

  columnas: ColumnDefinition[] = [
    { header: 'Nombre', property: 'nombre', type: 'text' },
    { header: 'Email', property: 'email', type: 'text' },
    { header: 'Estado', property: 'estado', type: 'text' },
  ];

  paginaActual = signal(1);
  totalPaginas = signal(1);
  itemsPorPagina = 10;

  datosPaginados = () => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    return this.usuarios().slice(inicio, inicio + this.itemsPorPagina);
  };
}
```

---

### Caso 2: Tabla con Badge-Estado

Tabla que usa el componente `badge-estado` en una columna.

```typescript
import { Component, signal, computed } from '@angular/core';
import { TablaComponent, ColumnDefinition } from '@shared/componentes/tabla';

interface Tarea {
  id: string;
  titulo: string;
  estado: 'Activo' | 'Inactivo';
  asignado: string;
}

@Component({
  selector: 'app-tabla-tareas',
  standalone: true,
  imports: [TablaComponent],
  template: `
    <app-tabla
      [datos]="tareas()"
      [columnas]="columnas"
      [datosPaginados]="datosPaginados()"
      [paginaActual]="paginaActual"
      [totalPaginas]="totalPaginas"
      [total]="tareas().length"
      [porPagina]="itemsPorPagina"
      [mostrarDatos]="tareas().length > 0">
    </app-tabla>
  `
})
export class TablaTareasComponent {
  tareas = signal<Tarea[]>([
    { id: '1', titulo: 'Implementar API', estado: 'Activo', asignado: 'Juan' },
    { id: '2', titulo: 'Revisar código', estado: 'Activo', asignado: 'María' },
    { id: '3', titulo: 'Testing', estado: 'Inactivo', asignado: 'Pedro' },
  ]);

  columnas: ColumnDefinition[] = [
    { header: 'Título', property: 'titulo', type: 'text' },
    { header: 'Estado', property: 'estado', type: 'badge-estado' },
    { header: 'Asignado', property: 'asignado', type: 'text' },
  ];

  paginaActual = signal(1);
  totalPaginas = computed(() => Math.ceil(this.tareas().length / this.itemsPorPagina));
  itemsPorPagina = 10;

  datosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    return this.tareas().slice(inicio, inicio + this.itemsPorPagina);
  });
}
```

---

### Caso 3: Tabla con Action-Menu

Tabla con opciones de acciones en cada fila.

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TablaComponent, ColumnDefinition } from '@shared/componentes/tabla';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
}

@Component({
  selector: 'app-tabla-productos',
  standalone: true,
  imports: [CommonModule, TablaComponent],
  template: `
    <app-tabla
      [datos]="productos()"
      [columnas]="columnas"
      [datosPaginados]="datosPaginados()"
      [paginaActual]="paginaActual"
      [totalPaginas]="totalPaginas"
      [total]="productos().length"
      [porPagina]="itemsPorPagina"
      [mostrarDatos]="productos().length > 0"
      (rowClick)="onRowClick($event)">
      
      <ng-template #rowTemplate let-item let-index="index">
        <tr class="tabla-row">
          <td class="tabla-cell">{{ item.nombre }}</td>
          <td class="tabla-cell">{{ item.precio | currency }}</td>
          <td class="tabla-cell">{{ item.stock }}</td>
          <td class="tabla-cell action-menu-cell">
            <button (click)="abrirMenu(item)" class="btn-menu">⋮</button>
            @if (itemActivo === item.id) {
              <div class="menu-acciones">
                <button (click)="editar(item)">Editar</button>
                <button (click)="eliminar(item)">Eliminar</button>
              </div>
            }
          </td>
        </tr>
      </ng-template>
    </app-tabla>
  `,
  styles: [`
    .action-menu-cell {
      position: relative;
    }
    .btn-menu {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
    }
    .menu-acciones {
      position: absolute;
      right: 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10;
    }
  `]
})
export class TablaProductosComponent {
  productos = signal<Producto[]>([
    { id: '1', nombre: 'Laptop', precio: 999.99, stock: 10 },
    { id: '2', nombre: 'Mouse', precio: 29.99, stock: 50 },
  ]);

  columnas: ColumnDefinition[] = [
    { header: 'Producto', property: 'nombre', type: 'text' },
    { header: 'Precio', property: 'precio', type: 'text' },
    { header: 'Stock', property: 'stock', type: 'text' },
    { header: 'Acciones', property: '', type: 'action-menu' },
  ];

  paginaActual = signal(1);
  totalPaginas = computed(() => Math.ceil(this.productos().length / this.itemsPorPagina));
  itemsPorPagina = 10;
  itemActivo: string | null = null;

  datosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    return this.productos().slice(inicio, inicio + this.itemsPorPagina);
  });

  onRowClick(item: Producto) {
    console.log('Fila clickeada:', item);
  }

  abrirMenu(item: Producto) {
    this.itemActivo = this.itemActivo === item.id ? null : item.id;
  }

  editar(item: Producto) {
    console.log('Editar:', item);
    this.itemActivo = null;
  }

  eliminar(item: Producto) {
    console.log('Eliminar:', item);
    this.itemActivo = null;
  }
}
```

---

### Caso 4: Tabla Mixta (Combinación de Todos)

Tabla que combina texto, badges, fechas y acciones.

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TablaComponent, ColumnDefinition } from '@shared/componentes/tabla';

interface Asignacion {
  id: string;
  cliente: string;
  recurso: string;
  estado: 'Activo' | 'Inactivo';
  inicio: Date;
  fin: Date;
}

@Component({
  selector: 'app-tabla-asignaciones',
  standalone: true,
  imports: [CommonModule, TablaComponent],
  template: `
    <app-tabla
      [datos]="asignaciones()"
      [columnas]="columnas"
      [datosPaginados]="datosPaginados()"
      [paginaActual]="paginaActual"
      [totalPaginas]="totalPaginas"
      [total]="asignaciones().length"
      [porPagina]="itemsPorPagina"
      [mostrarDatos]="asignaciones().length > 0"
      [config]="{
        emptyState: {
          title: 'Sin asignaciones',
          description: 'No hay asignaciones disponibles',
          showAction: true,
          actionText: 'Crear nueva asignación'
        }
      }"
      (paginaCambia)="paginaActual.set($event)"
      (emptyStateAction)="crearNueva()">
    </app-tabla>
  `
})
export class TablaAsignacionesComponent {
  asignaciones = signal<Asignacion[]>([
    { 
      id: '1', 
      cliente: 'BANCO GUAYAQUIL', 
      recurso: 'Juan Pérez', 
      estado: 'Activo',
      inicio: new Date('2024-01-15'),
      fin: new Date('2025-12-31')
    },
    { 
      id: '2', 
      cliente: 'BANCO PICHINCHA', 
      recurso: 'María García', 
      estado: 'Inactivo',
      inicio: new Date('2023-06-01'),
      fin: new Date('2024-06-01')
    },
  ]);

  columnas: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', cellClass: 'font-bold' },
    { header: 'Recurso', property: 'recurso', type: 'text' },
    { header: 'Estado', property: 'estado', type: 'badge-estado' },
    { header: 'Inicio', property: 'inicio', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
    { header: 'Fin', property: 'fin', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
  ];

  paginaActual = signal(1);
  totalPaginas = computed(() => Math.ceil(this.asignaciones().length / this.itemsPorPagina));
  itemsPorPagina = 10;

  datosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    return this.asignaciones().slice(inicio, inicio + this.itemsPorPagina);
  });

  crearNueva() {
    console.log('Crear nueva asignación');
  }
}
```

---

## Integración con Reporte Fechas (Ejemplo Real)

El componente de reportes ha sido refactorizado para usar la tabla genérica:

```typescript
@Component({...})
export class ReporteFechasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', cellClass: 'font-bold text-dark' },
    { header: 'Líder', property: 'lider', type: 'text' },
    { header: 'Recurso', property: 'recurso', type: 'text', cellClass: 'font-medium' },
    { header: 'Cargo', property: 'cargo', type: 'badge' },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
    { header: 'Fin', property: 'fechaFin', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
  ];

  // ... resto del componente
}
```

---

## Beneficios

✅ **Reutilización**: Una tabla genérica para múltiples casos de uso  
✅ **Mantenimiento**: Los cambios en la tabla afectan a todos los lugares donde se use  
✅ **Flexibilidad**: Soporta contenido personalizado via templates  
✅ **Consistencia**: Todos los datos tabulares tienen el mismo look & feel  
✅ **Reducción de código**: Menos HTML y estilos duplicados  

---

## Personalización Avanzada

Para casos más complejos, puedes usar el template personalizado:

```typescript
@Component({
  template: `
    <app-tabla
      [datos]="datos"
      [columnas]="columnas"
      [datosPaginados]="datosPaginados"
      ...>
      
      <ng-template #rowTemplate let-item let-index="index">
        <tr class="custom-row">
          <td>{{ item.nombre | uppercase }}</td>
          <td><strong>{{ item.valor }}</strong></td>
          <td>
            <!-- Contenido personalizado -->
          </td>
        </tr>
      </ng-template>
    </app-tabla>
  `
})
```

---

## Notas

- Los Signals se pueden usar directamente para paginaActual, totalPaginas y mostrarDatos
- El componente es genérico (`<T>`) para soportar cualquier tipo de dato
- La paginación se integra automáticamente con el componente `PaginacionComponent`
- Los estilos se heredan del componente tabla y pueden ser sobrescritos a nivel global
