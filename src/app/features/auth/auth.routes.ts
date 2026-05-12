import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login.component';
import { ForgotPasswordComponent } from './componentes/forgot-password/forgot-password.component';

export const authRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
];
