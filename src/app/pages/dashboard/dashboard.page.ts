import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { Platform } from '@ionic/angular';
import { ErrorDialogService } from 'src/app/services/error-dialog/error-dialog.service';
import { ActionSheetController } from '@ionic/angular';
import { TimerService } from 'src/app/services/timer/timer.service';
import { Profile } from 'src/app/interfaces/profile';
import { SessionProvider } from 'src/app/providers/session/session.provider';
import { BasUser } from 'src/app/interfaces/bas-user';
import { NetworkService } from '../../services/network/network.service';
import { TranslateService } from '@ngx-translate/core';

export const enum WorkSessionCode {

  Work = 100,
  Break = 150,
  Trip = 151,
  Meeting = 152,
  Education = 153,
  Doctor = 158,
  Holidays = 159,
  OffDuty = 200,

}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  public loggerList = [];
  public login = null;
  public actionSheetVisible = false;
  networkStatus = '';
  displayTime: any = null;
  profile = null as Profile;
  basUser = null as BasUser;
  isEnabled = false;
  startWork = true;
  currentStatus = 0;
  constructor(
    private ngZone: NgZone,
    private helpers: ErrorDialogService,
    private platform: Platform,
    private cd: ChangeDetectorRef,
    private actionSheetController: ActionSheetController,
    private timer: TimerService,
    private network: NetworkService,
    private session: SessionProvider,
    private tr: TranslateService
  ) {
    this.platform.ready()
      .then(() => {
        this.ngZone.run(() => {          
          this.helpers.appendLogListEvent.subscribe((msg) => {
            if (this.loggerList) {
              this.loggerList.push(msg);
              this.cd.detectChanges();
            } else {
              this.loggerList = [];
            }
          });

          this.network.networkEvent.subscribe(
            (status) => {
              this.networkStatus = status;
              this.cd.detectChanges();
            });

          this.timer.timerEvent.subscribe((time) => {
            if (typeof time === 'object') {
              console.log(time);
            } else {
              // console.log(time);
              if ( time % 60 === 0){
                console.log('update the work times')
              }
              this.displayTime = time;
              this.cd.detectChanges();
            }

          });

          this.timer.workStatusChangedEvent.subscribe((status) => {
            this.currentStatus = status;
            this.cd.detectChanges();
          });


          this.session.sessionReadyEvent.subscribe(
            (basUser) => {
              this.isEnabled = true;
              this.profile = this.session.profile;
              this.basUser = basUser;
              this.currentStatus = this.basUser.att_Status;
              this.timer.load(
                this.basUser,
                false,
                this.basUser.att_Status);
              this.cd.detectChanges();
            }
          );

          this.session.endSessionEvent.subscribe(() => {
            this.isEnabled = false;
            delete this.profile;
            delete this.basUser;
            delete this.loggerList;
            this.displayTime = 0;
            this.cd.detectChanges();
          });

        });
      });
  }

  async ngOnInit() {
    console.log('platform ready');
    this.loggerList.push('platform ready');
  }


  async ionViewWillEnter() {
    this.networkStatus = this.network.getCurrentNetworkStatus();
    this.cd.detectChanges();
    console.log('ionViewWillEnter Dashboard');
    this.loggerList.push('ionViewWillEnter Dashboard');
    if (this.session.isValidSession()) {
      this.isEnabled = true;
    } else {
      this.isEnabled = false;
      this.displayTime = 0;
      this.cd.detectChanges();
      this.session.sessionCreate();
    }

  }

  async presentActionSheet() {
    this.actionSheetVisible = true;
    this.cd.detectChanges();
  }

  async hideActionSheet() {
    this.actionSheetVisible = false;
    this.cd.detectChanges();
  }


  async showActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: this.tr.instant('dashboard.select-status'),
      buttons: [{
        text: this.tr.instant('dashboard.work'),
        icon: 'business',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          if (this.profile && this.basUser) {
            console.log('Work');
            this.helpers.appendLog('Work');
            this.timer.load(this.basUser, this.startWork, WorkSessionCode.Work);
            this.currentStatus = WorkSessionCode.Work;
            this.cd.detectChanges();
          }
        }
      },
      {
        text: this.tr.instant('dashboard.break'),
        icon: 'cafe',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          console.log('Break');
          this.timer.load(this.basUser, this.startWork, WorkSessionCode.Break);
          this.currentStatus = WorkSessionCode.Break;
          this.cd.detectChanges();
        }
      },
      {
        text: this.tr.instant('dashboard.education'),
        icon: '../assets/icon/school.svg',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          console.log('Education');
          this.timer.load(this.basUser, this.startWork, WorkSessionCode.Education);
          this.currentStatus = WorkSessionCode.Education;
          this.cd.detectChanges();
        }
      }, {
        text: this.tr.instant('dashboard.trip'),
        icon: 'briefcase',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          console.log('Trip');
          this.timer.load(this.basUser, this.startWork, WorkSessionCode.Trip);
          this.currentStatus = WorkSessionCode.Trip;
          this.cd.detectChanges();
        }
      }, {
        text: this.tr.instant('dashboard.meeting'),
        icon: 'people',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          console.log('Meeting');
          this.timer.load(this.basUser, this.startWork, WorkSessionCode.Meeting);
          this.currentStatus = WorkSessionCode.Meeting;
          this.cd.detectChanges();
        }
      },
      {
        text: this.tr.instant('dashboard.doctor'),
        icon: '../assets/icon/stethoscope.svg',
        cssClass: 'action-sheet-button-success',
        handler: () => {
          console.log('Doctor');
          this.timer.load(this.basUser, this.startWork, WorkSessionCode.Doctor);
          this.currentStatus = WorkSessionCode.Doctor;
          this.cd.detectChanges();
        }
      },
      {
        text: this.tr.instant('dashboard.off-duty'),
        icon: '../assets/icon/alarm-off.svg',
        cssClass: 'action-sheet-button-danger',
        handler: () => {
          console.log('Off Duty');
          this.helpers.appendLog('Off Duty');
          this.timer.stopTiming(this.basUser.bas_UserID, WorkSessionCode.OffDuty);
          this.currentStatus = WorkSessionCode.OffDuty;
          this.cd.detectChanges();
        }
      }]
    });
    await actionSheet.present();
  }


}
