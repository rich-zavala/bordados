import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(OverlayModule)
  ]
};