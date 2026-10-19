import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { environment } from "../src/environments/environment";

console.log("DIGAME DON ARMANDO: ", { environment })

registerLocaleData(localeEs, 'es-EC');

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [provideZoneChangeDetection(), ...appConfig.providers]
})
  .catch((err) => console.error(err));
