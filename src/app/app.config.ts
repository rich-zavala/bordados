import { ApplicationConfig, InjectionToken } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

const firebaseConfig = {
  apiKey: 'AIzaSyBBERpRKu7Wl5-xaG8huWmJFB1FtI94HIk',
  authDomain: 'bordados-aime.firebaseapp.com',
  projectId: 'bordados-aime',
  storageBucket: 'bordados-aime.firebasestorage.app',
  messagingSenderId: '442615597637',
  appId: '1:442615597637:web:2c337694d1946fc929712c'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const FIREBASE_DB = new InjectionToken<Firestore>('FIREBASE_DB');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: FIREBASE_DB, useValue: db }
  ]
};