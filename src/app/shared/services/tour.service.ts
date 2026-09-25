import { Injectable } from '@angular/core';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private agregarActividadTour?: Driver;
  private overlayContainer?: HTMLElement;
  private originalOverlayZIndex = '';

  prepareAgregarActividadTour(): void {
    if (!this.agregarActividadTour) {
      this.agregarActividadTour = this.createAgregarActividadTour();
    }
  }

  destroyAgregarActividadTour(): void {
    if (this.agregarActividadTour?.isActive()) {
      this.agregarActividadTour.destroy();
    } else {
      this.agregarActividadTour = undefined;
    }
  }

  startAgregarActividadTour(): void {
    this.prepareAgregarActividadTour();

    this.overlayContainer = document.querySelector<HTMLElement>('.cdk-overlay-container') ?? undefined;
    this.originalOverlayZIndex = this.overlayContainer?.style.zIndex ?? '';
    this.overlayContainer?.style.setProperty('z-index', '9999', 'important');

    this.agregarActividadTour?.drive();
  }

  private createAgregarActividadTour(): Driver {
    return driver({
      showProgress: true,
      allowClose: true,
      allowScroll: false,
      disableActiveInteraction: false,
      popoverClass: 'actividad-tour-popover',
      onPopoverRender: (popover) => {
        const dialogOverlay = document.querySelector<HTMLElement>('.cdk-overlay-container');
        const driverOverlay = document.querySelector<SVGElement>('.driver-overlay');

        if (dialogOverlay && driverOverlay && driverOverlay.parentElement !== dialogOverlay) {
          dialogOverlay.appendChild(driverOverlay);
        }

        if (dialogOverlay && popover.wrapper.parentElement !== dialogOverlay) {
          dialogOverlay.appendChild(popover.wrapper);
        }

        popover.wrapper.style.setProperty('z-index', '10001', 'important');
        popover.wrapper.style.setProperty('pointer-events', 'auto', 'important');
        driverOverlay?.style.setProperty('pointer-events', 'none', 'important');
        driverOverlay?.style.setProperty('z-index', '10000', 'important');
      },
      onDestroyed: () => {
        this.overlayContainer?.style.setProperty(
          'z-index',
          this.originalOverlayZIndex || '1000',
          'important'
        );
        this.agregarActividadTour = undefined;
      },
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      doneBtnText: 'Finalizar',
      steps: [
        {
          element: '.actividad-modal__header',
          popover: {
            title: 'Guía para registrar una actividad',
            description: 'Esta guía te mostrará paso a paso cómo registrar una actividad.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="tipo-actividad"]',
          popover: {
            title: '1. Tipo de actividad',
            description:
              'Selecciona qué trabajo realizaste, por ejemplo: desarrollo, reunión o revisión.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="proyecto"]',
          popover: {
            title: '2. Proyecto',
            description: 'Elige el proyecto al que pertenece el trabajo que vas a registrar.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="codigo-requerimiento"]',
          popover: {
            title: '3. Código del requerimiento',
            description:
              'Escribe el código de la tarea o requerimiento. Si el proyecto lo tiene configurado, puede aparecer automáticamente.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="fecha"]',
          popover: {
            title: '4. Fecha de la actividad',
            description:
              'Selecciona el día en que realizaste la actividad. También puedes usar el icono del calendario.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="horas"]',
          popover: {
            title: '5. Número de horas',
            description:
              'Indica cuánto tiempo trabajaste. Puedes escribir horas completas o decimales, como 4.5.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="recurrente"]',
          popover: {
            title: '6. Actividad recurrente',
            description:
              'Marca esta opción solamente si la misma actividad se repite durante varios días. Al activarla aparecerán las fechas de inicio, fin y las horas por día.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="guardar"]',
          popover: {
            title: '7. Guardar',
            description: 'Revisa la información y presiona Guardar para registrar la actividad.',
            side: 'right',
            align: 'end',
          },
        },
        {
          popover: {
            title: 'Tutorial completado',
            description:
              'Ya conoces los pasos principales. Puedes completar el formulario y guardar tu actividad.',
          },
        },
      ],
    });
  }
}
