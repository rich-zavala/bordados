import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Import the repository classes
import { PatternRepository } from './repositories/pattern.repository';
import { LocalPatternRepository } from './repositories/local-pattern.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Add this line to map the abstract class to the local implementation
    { provide: PatternRepository, useClass: LocalPatternRepository }
  ]
};