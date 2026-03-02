import { Injectable, inject } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { LoadingSpinnerComponent } from '../components/loading-spinner/loading-spinner';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;

  show(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'app-loading-backdrop',
      positionStrategy: this.overlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });

    this.overlayRef.attach(new ComponentPortal(LoadingSpinnerComponent));
  }

  hide(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
