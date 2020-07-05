import { Component, OnInit, NgZone, ChangeDetectorRef, EventEmitter, Output } from '@angular/core';
import { NavController, AlertController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { AuthProvider } from '../../providers/auth/auth.provider';
import { RestApiService } from '../../services/rest-api/rest-api.service';
import { SessionProvider } from 'src/app/providers/session/session.provider';
import { Profile} from '../../interfaces/profile';
import { BasUser } from 'src/app/interfaces/bas-user';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public profile = null as Profile;
  public basUser = null as BasUser;
  public showData = false;
  private readonly base64Data = 'data:image/jpeg;base64,';
  public avatarSrc = 'assets/avatar/default.svg';
  versionNum: string = require('../../../../package.json').version;
  version = 'Version alpha ' + this.versionNum;
  usePin = false;
  constructor(
    private ngZone: NgZone,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private storage: Storage,
    private auth: AuthProvider,
    private restApi: RestApiService,
    private platform: Platform,
    private cd: ChangeDetectorRef,
    public session: SessionProvider
  ) {
    this.setDefaultProfile();

    this.session.sessionReadyEvent.subscribe(
      (basUser) => {
        console.log(' settings session ready', basUser);
        this.displayUser();
      }
    );
  }

  async ngOnInit() {
  }

  async ionViewWillEnter() {
    // this.storage.clear();
    console.log('ionViewWillEnter Settings');
    this.displayUser();
  }

  async clearCache() {
    this.alertCtrl.create({
      backdropDismiss: false,
      header: 'Warning',
      message: 'This erase all items in storage. Do you want to continue?',
      buttons: [
          {
            text: 'Cancel'
          },
          {
          text: 'Yes',
          handler: () => { this.storage.clear(); }
          }
      ]
    }).then(alert => alert.present());
  }

  setDefaultProfile() {
    this.profile = { } as Profile;
    this.profile.acntName = 'TBS';
    this.basUser = {} as BasUser;
    this.basUser.bas_FirstName = 'First Name';
    this.basUser.bas_LastName = 'Last Name';
    this.avatarSrc = 'assets/avatar/default.svg';
  }

  signOut() {
    // TODO: handle logout
    this.usePin = false;
    this.storage.clear();
    this.setDefaultProfile();
    this.session.endSessionEvent.emit();
    this.auth.signout();
  }


  displayUser() {
    if ( this.session.isValidSession()) {
      this.profile = this.session.profile;
      this.basUser = this.session.basUser;
      this.usePin = this.session.userHasPin;
      console.log(this.profile);
      console.log(this.basUser);
      if (this.basUser.ext_Image) {
        this.avatarSrc = this.base64Data + this.basUser.ext_Image;
      }
      this.cd.detectChanges();
     } else {
       this.navCtrl.navigateForward('tabs/dashboard');
     }
  }

  handlePin(event) {
    if (this.session.isValidSession() ) {
    this.session.pinCodeChangeEvent.emit(event.detail.checked);
    this.usePin = this.session.userHasPin;
    this.cd.detectChanges();
    }
  }

}
