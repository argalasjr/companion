import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { FingerprintAIO } from '@ionic-native/fingerprint-aio/ngx';
import { Platform, ModalController, AlertController } from '@ionic/angular';
import { SecureStorage, SecureStorageObject } from '@ionic-native/secure-storage/ngx';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent implements OnInit {
  @Input() createNew: boolean = null;
  headerMessage: string;
  useBio:string;
  passcode: any;
  pageStatus: any;
  codeone: any;
  codetwo: any;
  codethree: any;
  codefour: any;
  counter: any;
  newPincount: any;
  message: any;
  finalPin: any;
  fingerPin: any;
  securePin: any;
  faioAvailable = false;
  constructor(
    private faio: FingerprintAIO,
    private platform: Platform,
    private modalCtrl: ModalController,
    private secureStorage: SecureStorage,
    private alertCtrl: AlertController,
    private cd: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    this.passcode = '';
    this.finalPin = '';
    this.message = true;
    this.headerMessage = this.translate.instant('pin-modal.message');
    this.useBio = this.translate.instant('pin-modal.use-bio')
    this.counter = 0;
    this.newPincount = 0;
    this.fingerPin = false;
    this.securePin = '';
  }

  async ngOnInit() {
    await this.platform.ready()
      .then(() => {
        console.log(this.createNew);
        if (!this.createNew) {
          this.pageStatus = this.translate.instant('pin-modal.status-login');
          this.secureStorage.create('pincode')
            .then((storage: SecureStorageObject) => {
              storage.get('Securitypin')
                .then(
                  data => this.securePin = data,
                  error => console.log(error)
                );

            });
          this.showAuth();
        } else{
          this.pageStatus = this.translate.instant('pin-modal.status-create');
        }
      }
      );
  }

  showAuth() {
    this.faio.isAvailable()
      .then(
        res => {
          this.faioAvailable = true;
          this.cd.detectChanges();
          console.log('TouchID is available!', res);
          this.faio.show({
            title: this.translate.instant('pin-modal.bio-title'),
            subtitle: this.translate.instant('pin-modal.bio-message'),
            description: ' ',
            fallbackButtonTitle: this.translate.instant('common.cancel'),
            disableBackup: true,
          })
            .then((result: any) => {
              console.log(result)
              if (result) {
                this.modalCtrl.dismiss(result);
              }
            })
            .catch((error: any) => console.log(error) /* this.showAuth() */);
        },
        err => {
          this.faioAvailable = false;
          this.cd.detectChanges();
          console.log('TouchID is not available!', err);
        }
      );
  }

  add(value) {

    if (this.passcode.length < 4) {
      this.message = true;
      this.passcode = this.passcode + value;
      if (this.counter === 0) {
        this.codeone = value;
        this.counter++;
      } else if (this.counter === 1) {
        this.codetwo = value;
        this.counter++;
      } else if (this.counter === 2) {
        this.codethree = value;
        this.counter++;
      } else if (this.counter === 3) {
        this.codefour = value;
        this.counter++;
      }
      if (this.passcode.length === 4) {

        if (!this.createNew) {
          this.secureStorage.create('pincode')
            .then((storage: SecureStorageObject) => {
              storage.get('Securitypin').then((Securitypin) => {
                console.log(Securitypin);
              });
            });
          if (this.securePin === String(this.codeone + this.codetwo + this.codethree + this.codefour)) {
            this.modalCtrl.dismiss('passwordMatched');
            this.message = true;
          } else {
            this.alertWrongPin()
          }
          this.codeone = null;
          this.codetwo = null;
          this.codethree = null;
          this.codefour = null;
          this.passcode = '';
          this.counter = 0;
        } else {
          this.secureStorage.create('pincode')
            .then((storage: SecureStorageObject) => {
              console.log('setting new pin code', this.passcode);
              storage.set('Securitypin', this.passcode);
            });
          this.modalCtrl.dismiss('newKey');

        }
      }
    }
  }

  delete() {
    if (this.passcode.length > 0) {
      if (this.passcode.length === 1) {
        this.codeone = null;
        this.counter--;
      } else if (this.passcode.length === 2) {
        this.codetwo = null;
        this.counter--;
      } else if (this.passcode.length === 3) {
        this.codethree = null;
        this.counter--;
      } else if (this.passcode.length === 4) {
        this.codefour = null;
        this.counter--;
      }
      this.passcode = this.passcode.substr(0, this.passcode.length - 1);
    }
  }


  reset() {
    this.codeone = null;
    this.codetwo = null;
    this.codethree = null;
    this.codefour = null;
    this.passcode = '';
    this.counter = 0;
  }

  async alertWrongPin() {
    await this.alertCtrl.create({
      message: this.translate.instant('pin-modal.wrong-pin'),

      buttons: [
        {
          text: this.translate.instant('common.ok'),


        }
      ]
    }).then(alert => alert.present())
  }


}




