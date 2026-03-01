# Bordados

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Importing FlossCross Files

The application now supports importing patterns from [FlossCross](https://flosscross.com) `.fcjson` export files. To add a project:

1. Open the **Project Library** controls on the left panel.
2. Enter an optional project name (it will replace the title inside the file).
3. Click **Select .fcjson File** and choose a FlossCross export.

The app will convert the file to its internal compressed schema and store it in localStorage. You can also paste existing compressed JSON manually in the **Manual Import** section.

### Managing Projects

Once a pattern is loaded the library selector shows all available projects. Two new
buttons appear next to the dropdown:

* **Rename** – prompt for a new title and update the stored entry.
* **Delete** – remove the selected project from localStorage.

These operations are handled entirely in the `PatternManagerService` and keep the
interface lightweight and responsive.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
