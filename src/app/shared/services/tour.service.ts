import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private agregarActividadTour?: InstanceType<typeof Shepherd.Tour>;

  prepareAgregarActividadTour(): void {
    // No se necesita preparación anticipada con Shepherd.js
  }

  destroyAgregarActividadTour(): void {
    if (this.agregarActividadTour?.isActive()) {
      this.agregarActividadTour.cancel();
    }
    this.agregarActividadTour = undefined;
  }

  startAgregarActividadTour(): void {
    this.destroyAgregarActividadTour();

    // Insertamos el popover dentro del .cdk-overlay-pane (el wrapper directo
    // del MatDialog). Este elemento ya tiene position:absolute dentro del
    // cdk-overlay-container, y al darle overflow:visible en CSS las burbujas
    // pueden salir hacia afuera del área del modal sin tapar el contenido.
    // No usamos modalContainer (useModalOverlay: false) para no oscurecer nada.
    const pane =
      document.querySelector<HTMLElement>('.cdk-overlay-pane') ??
      document.body;

    this.agregarActividadTour = new Shepherd.Tour({
      useModalOverlay: false,
      stepsContainer: pane,
      exitOnEsc: true,
      keyboardNavigation: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true, label: 'Cerrar tutorial' },
        canClickTarget: false,
        scrollTo: false,
        classes: 'actividad-tour-step',
        // Todas las burbujas a la derecha del modal por defecto
        // así el formulario queda completamente visible
        buttons: [
          {
            text: 'Atrás',
            secondary: true,
            action() { this.back(); }
          },
          {
            text: 'Siguiente',
            action() { this.next(); }
          }
        ]
      }
    });

    this.agregarActividadTour.addSteps([
      {
        id: 'intro',
        title: 'Guía para registrar una actividad',
        text: 'Esta guía te mostrará paso a paso cómo registrar una actividad.',
        buttons: [
          {
            text: 'Comenzar',
            action() { this.next(); }
          }
        ]
      },
      {
        id: 'tipo-actividad',
        attachTo: { element: '[data-tour="tipo-actividad"]', on: 'right' },
        title: '1. Tipo de actividad',
        text: 'Selecciona qué trabajo realizaste, por ejemplo: desarrollo, reunión o revisión.'
      },
      {
        id: 'proyecto',
        attachTo: { element: '[data-tour="proyecto"]', on: 'right' },
        title: '2. Proyecto',
        text: 'Elige el proyecto al que pertenece el trabajo que vas a registrar.'
      },
      {
        id: 'codigo-requerimiento',
        attachTo: { element: '[data-tour="codigo-requerimiento"]', on: 'right' },
        title: '3. Código del requerimiento',
        text: 'Escribe el código de la tarea o requerimiento. Si el proyecto lo tiene configurado, puede aparecer automáticamente.'
      },
      {
        id: 'descripcion',
        attachTo: { element: '[data-tour="descripcion"]', on: 'right' },
        title: '4. Descripción',
        text: 'Añade una descripción breve de la actividad realizada. Es opcional, pero ayuda a entender el trabajo registrado.'
      },
      {
        id: 'fecha',
        attachTo: { element: '[data-tour="fecha"]', on: 'right' },
        title: '5. Fecha de la actividad',
        text: 'Selecciona el día en que realizaste la actividad. También puedes usar el icono del calendario.'
      },
      {
        id: 'horas',
        attachTo: { element: '[data-tour="horas"]', on: 'right' },
        title: '6. Número de horas',
        text: 'Indica cuánto tiempo trabajaste. Puedes escribir horas completas o decimales, como 4.5.'
      },
      {
        id: 'recurrente',
        attachTo: { element: '[data-tour="recurrente"]', on: 'right' },
        title: '7. Actividad recurrente',
        text: 'Marca esta opción solamente si la misma actividad se repite durante varios días. Al activarla aparecerán las fechas de inicio, fin y las horas por día.'
      },
      {
        id: 'guardar',
        attachTo: { element: '[data-tour="guardar"]', on: 'right-end' },
        title: '8. Guardar',
        text: 'Revisa la información y presiona Guardar para registrar la actividad.',
        buttons: [
          {
            text: 'Atrás',
            secondary: true,
            action() { this.back(); }
          },
          {
            text: 'Siguiente',
            action() { this.next(); }
          }
        ]
      },
      {
        id: 'fin',
        title: 'Tutorial completado ✓',
        text: 'Ya conoces los pasos principales. Puedes completar el formulario y guardar tu actividad.',
        buttons: [
          {
            text: 'Finalizar',
            action() { this.complete(); }
          }
        ]
      }
    ]);

    this.agregarActividadTour.on('cancel', () => {
      this.agregarActividadTour = undefined;
    });

    this.agregarActividadTour.on('complete', () => {
      this.agregarActividadTour = undefined;
    });

    this.agregarActividadTour.start();
  }
}
