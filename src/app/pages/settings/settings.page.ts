import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { AuthProvider } from '../../providers/auth/auth.provider';
import { SessionProvider } from 'src/app/providers/session/session.provider';
import { Profile } from '../../interfaces/profile';
import { BasUser } from 'src/app/interfaces/bas-user';
import { TranslateService } from '@ngx-translate/core';

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
  version = 'Version ' + this.versionNum;
  usePin = false;
  language: string;
  constructor(
    private navCtrl: NavController,
    private storage: Storage,
    private auth: AuthProvider,
    private platform: Platform,
    private cd: ChangeDetectorRef,
    public session: SessionProvider,
    private translate: TranslateService
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
    await this.platform.ready()
      .then(async () => {
        this.language = await this.storage.get('language');
        console.log('OnInit', this.language);
        console.log(this.translate.getLangs());
      });
  }

  async ionViewWillEnter() {
    console.log('ionViewWillEnter Settings');
    this.displayUser();
    
    const now = new Date().getUTCDate();
    console.log(now);
  }

  setDefaultProfile() {
    this.profile = {} as Profile;
    this.profile.acntName = 'TBS';
    this.basUser = {} as BasUser;
    this.basUser.bas_FirstName = 'First Name';
    this.basUser.bas_LastName = 'Last Name';
    this.avatarSrc = 'assets/avatar/default.svg';
  }

  async signOut() {
    this.usePin = await this.handlePin(event)
    console.log(this.usePin);
    this.cd.detectChanges();
    this.storage.clear();
    this.setDefaultProfile();
    this.session.endSessionEvent.emit();
    this.auth.signout();

  }


  displayUser() {
    if (this.session.isValidSession()) {
      this.profile = this.session.profile;
      this.basUser = this.session.basUser;
      this.usePin = this.session.userHasPin;
      console.log('pin enabled', this.usePin);
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

  async handlePin(event) {
    if (this.session.isValidSession()) {
      if (event) {
        this.session.pinCodeChangeEvent.emit(event.detail.checked);
        this.usePin = this.session.userHasPin;
        this.cd.detectChanges();
      }

    }
    return this.usePin;
  }

  async languageChanged(event: CustomEvent<{ value: string }>) {
    let language = event.detail.value;

    if (!language) {
      console.log(navigator.language);
      language = navigator.language.split('-')[0];
      console.log(language);
    }
    this.storage.set('language', language);

    this.translate.use(language).subscribe();
  }

}
