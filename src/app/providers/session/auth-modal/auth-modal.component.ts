import { Component, OnInit, Input } from '@angular/core';
import { FingerprintAIO } from '@ionic-native/fingerprint-aio/ngx';
import { Platform, ModalController } from '@ionic/angular';
import { ErrorDialogService } from '../../../services/error-dialog/error-dialog.service';
import { SecureStorage, SecureStorageObject } from '@ionic-native/secure-storage/ngx';


@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent implements OnInit {
  @Input() createNew: boolean = null;
  passcode: any;
  pageStatus: any;
  codeone: any;
  codetwo: any;
  codethree: any;
  codefour: any;
  int: any;
  newPincount: any;
  message: any;
  finalPin: any;
  fingerPin: any;
  securePin: any;
  constructor(
    private faio: FingerprintAIO ,
    private platform: Platform ,
    private helpers: ErrorDialogService,
    private modalCtrl: ModalController,
    private secureStorage: SecureStorage
    ) {
      this.passcode = '';
      this.finalPin = '';
      this.message = true;
      this.pageStatus = 'Login';
      this.int = 0;
      this.newPincount = 0;
      this.fingerPin = false;
      this.securePin = '';
    }

  async ngOnInit() {
    await this.platform.ready()
    .then(() => {
      console.log(this.createNew);
      if (!this.createNew) {
      this.pageStatus = 'Login';
      this.secureStorage.create('pincode')
      .then((storage: SecureStorageObject) => {
        storage.get('Securitypin')
          .then(
            data => this.securePin = data,
            error => console.log(error)
        );

      });
      this.showAuth();
    } else {
      this.pageStatus = 'Create new 4 digit code';
    }
  }
    );
}

showAuth() {
  this.faio.isAvailable()
  .then(
    res => {
       console.log('TouchID is available!', res);
       this.faio.show({
          title: 'Biometric Authentication',
          subtitle: 'Use your your fingerprint or faceId to login',
          description: ' ',
          fallbackButtonTitle: ' ',
          disableBackup: true,
      })
      .then((result: any) => {
        console.log(result)
        if ( result ) {
          this.modalCtrl.dismiss(result);
        }
      })
      .catch((error: any) => console.log(error) /* this.showAuth() */ );
      } ,
      err => {
        console.log('TouchID is not available!', err);
       }
  );
}

add(value) {

    if ( this.passcode.length < 4) {
          this.message = true;
          this.passcode = this.passcode + value;
          if (this.int === 0) {
            this.codeone = value;
            this.int++;
          } else if (this.int === 1) {
            this.codetwo = value;
            this.int++;
          } else if (this.int === 2) {
            this.codethree = value;
            this.int++;
          } else if (this.int === 3) {
            this.codefour = value;
            this.int++;
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
                  this.message = false;
                }
                this.codeone = null;
                this.codetwo = null;
                this.codethree = null;
                this.codefour = null;
                this.passcode = '';
                this.int = 0;
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
        this.int--;
      } else if (this.passcode.length === 2) {
        this.codetwo = null;
        this.int--;
      } else if (this.passcode.length === 3) {
        this.codethree = null;
        this.int--;
      } else if (this.passcode.length === 4) {
        this.codefour = null;
        this.int--;
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
    this.int = 0;
  }



}



