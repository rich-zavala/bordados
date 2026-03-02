import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrapper" role="status" aria-live="polite" aria-label="Sincronizando">
      <div class="lds-ripple"><div></div><div></div></div>
      <p>Sincronizando...</p>
    </div>
  `,
  styles: [
    `
      .spinner-wrapper {
        text-align: center;
        color: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font-family: 'Roboto', sans-serif;
      }

      .spinner-wrapper p {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
      }

      .lds-ripple {
        display: inline-block;
        position: relative;
        width: 80px;
        height: 80px;
      }

      .lds-ripple div {
        position: absolute;
        border: 4px solid #ffffff;
        opacity: 1;
        border-radius: 50%;
        animation: lds-ripple 1.1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
      }

      .lds-ripple div:nth-child(2) {
        animation-delay: -0.55s;
      }

      @keyframes lds-ripple {
        0% {
          top: 36px;
          left: 36px;
          width: 0;
          height: 0;
          opacity: 0;
        }
        5% {
          top: 36px;
          left: 36px;
          width: 0;
          height: 0;
          opacity: 1;
        }
        100% {
          top: 0;
          left: 0;
          width: 72px;
          height: 72px;
          opacity: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {}
