import { Component, NgZone , ChangeDetectorRef, OnInit } from '@angular/core';
import { TimerService } from 'src/app/services/timer/timer.service';
import { SessionProvider } from 'src/app/providers/session/session.provider';
import { Platform } from '@ionic/angular';
import { platform } from 'process';
@Component({
  selector: 'app-work-status',
  templateUrl: './work-status.component.html',
  styleUrls: ['./work-status.component.scss'],
})
export class WorkStatusComponent implements OnInit {


  public loaded = false;
  currentMonthHours = 0;
  maxMonthHours = 160;
  currentWeekHours = 0;
  maxWeekHours = 40;
  maxDayHours = 8;
  color = '#3880ff';
  background = '#eaeaea';
  duration = 800;
  animation = 'easeOutCubic';
  animationDelay = 0;
  animations: string[] = [];
  gradient = false;
  realCurrent = 0;
  rate;
  fontSize = 'medium'
  radius = window.innerWidth / 6;
  constructor(
    private cd: ChangeDetectorRef,
    private timer: TimerService,
    private session: SessionProvider,
    private platform : Platform
    ) {
    this.session.taConfigEvent.subscribe((taConfig) => {
      this.maxWeekHours = taConfig.allocHoursPerWeek;
      this.maxDayHours = taConfig.maxAllowedWorkHoursPerDay;
      this.maxMonthHours = this.computeMonthHours();
      this.cd.detectChanges();
      console.log(taConfig);
    });
    this.session.endSessionEvent.subscribe(() => {
      this.currentWeekHours = 0;
      this.currentMonthHours = 0;
      this.maxWeekHours = 40;
      this.maxMonthHours = 160;
      this.maxDayHours = 8;
      this.cd.detectChanges();
    });
    this.timer.workTimesLoadedEvent.subscribe(
      (times) => {
        console.log(times);
        this.loaded = true;
        this.computeMonthHours();
        this.currentMonthHours = Math.floor(times.monthSeconds / 3600);
        this.currentWeekHours = Math.floor(times.weekSeconds / 3600);
        this.cd.detectChanges();
      }
    );
  } 

  async ngOnInit() {
    await this.platform.ready().then(() =>{

        this.radius = this.platform.width() / 6;
    });
  }
  computeMonthHours() {
    const now = new Date();
    const countBusinessDays = ( (year, month) =>
          new Array(32 - new Date(year, month, 32).getDate())
          .fill(1)
          .filter(
              (id, index) =>
                  [0, 6].indexOf(
                      new Date(year, month, index + 1).getDay()) === -1
                  ).length
  )(now.getUTCFullYear(), now.getUTCMonth());
    console.log(now.getUTCFullYear(), now.getUTCMonth());
    console.log('Business Days count', countBusinessDays);
    return countBusinessDays ? countBusinessDays * this.maxDayHours : this.maxMonthHours;
  }

}
