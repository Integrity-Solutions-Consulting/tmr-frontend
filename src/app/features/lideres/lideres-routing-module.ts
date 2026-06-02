import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LideresComponent } from './components/lideres.component';

const routes: Routes = [
  {
    path: '',
    component: LideresComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LideresRoutingModule {}