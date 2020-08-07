import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardPage } from './dashboard.page';
import { RoundProgressModule } from 'angular-svg-round-progressbar';
import { HoursMinutesSecondsPipeModule } from '../../services/pipes/time/hours-minutes-seconds.module';
import { WorkStatusComponent } from './work-status/work-status.component';
@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RoundProgressModule,
    HoursMinutesSecondsPipeModule,
    RouterModule.forChild([{ path: '', component: DashboardPage }]),
    TranslateModule.forChild()
  ],
  declarations: [DashboardPage, WorkStatusComponent],
  exports: [WorkStatusComponent]
})
export class DashboardPageModule {}
