import {
  animate, style, transition, trigger,
  query, animateChild, state
} from '@angular/animations';

// Panel: opens with spring scale, closes with quick fade-down
export const panelAnimation = trigger('panel', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.88) translateY(-8px)' }),
    animate('280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('160ms cubic-bezier(0.4, 0, 1, 1)',
      style({ opacity: 0, transform: 'scale(0.92) translateY(-6px)' }))
  ])
]);

// Tab content: slides and fades between tabs
export const tabContentAnimation = trigger('tabContent', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('200ms 40ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    style({ position: 'absolute', width: '100%' }),
    animate('140ms cubic-bezier(0.4, 0, 1, 1)',
      style({ opacity: 0, transform: 'translateY(-6px)' }))
  ])
]);

// Status / toast chip: slides up from bottom, slides down on exit
export const chipAnimation = trigger('chip', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-50%) translateY(16px)' }),
    animate('240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ opacity: 1, transform: 'translateX(-50%) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('180ms cubic-bezier(0.4, 0, 1, 1)',
      style({ opacity: 0, transform: 'translateX(-50%) translateY(10px)' }))
  ])
]);

// Hotkeys overlay: gentle fade + scale from bottom-left
export const hotkeysAnimation = trigger('hotkeys', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.94) translateY(8px)' }),
    animate('220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('150ms cubic-bezier(0.4, 0, 1, 1)',
      style({ opacity: 0, transform: 'scale(0.94) translateY(8px)' }))
  ])
]);

// Mode chips (Ver obra terminada, Vista panorámica)
export const modeChipAnimation = trigger('modeChip', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-50%) translateY(-12px)' }),
    animate('240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ opacity: 1, transform: 'translateX(-50%) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('160ms ease-in',
      style({ opacity: 0, transform: 'translateX(-50%) translateY(-8px)' }))
  ])
]);

// Color celebration chip: slides up from above FAB
export const celebrationAnimation = trigger('celebration', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-50%) translateY(16px) scale(0.9)' }),
    animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1)' }))
  ]),
  transition(':leave', [
    animate('400ms 2800ms cubic-bezier(0.4, 0, 1, 1)',
      style({ opacity: 0, transform: 'translateX(-50%) translateY(-8px)' }))
  ])
]);

// Stats rows: stagger in when tab opens
export const statsListAnimation = trigger('statsList', [
  transition(':enter', [
    query('.stats-row', [
      style({ opacity: 0, transform: 'translateX(-10px)' }),
      animateChild()
    ], { optional: true })
  ])
]);

