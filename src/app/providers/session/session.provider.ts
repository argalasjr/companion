import { Injectable, NgZone, OnInit, EventEmitter, Output} from '@angular/core';
import { AlertController,ModalController, Platform } from '@ionic/angular';
import { ErrorDialogService } from '../../services/error-dialog/error-dialog.service';
import { RestApiService } from '../../services/rest-api/rest-api.service';
import { AuthProvider } from '../../providers/auth/auth.provider';
import { TimerService } from '../../services/timer/timer.service';
import { NetworkService } from '../../services/network/network.service';
import { LoadingService } from 'src/app/services/loading/loading.service';
import { Storage } from '@ionic/storage';
import { Profile} from '../../interfaces/profile';
import { BasUser} from '../../interfaces/bas-user';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { AuthModalComponent } from './auth-modal/auth-modal.component';
import { SecureStorage, SecureStorageObject } from '@ionic-native/secure-storage/ngx';
import { TranslateService } from '@ngx-translate/core';
@Injectable({
    providedIn: 'root'
  })
export class SessionProvider implements OnInit {
  @Output() sessionReadyEvent: EventEmitter<any> = new EventEmitter();
  @Output() endSessionEvent: EventEmitter<any> = new EventEmitter();
  @Output() taConfigEvent: EventEmitter<any> = new EventEmitter();
  @Output() synchronizationEvent: EventEmitter<any> = new EventEmitter();
  @Output() pinCodeChangeEvent: EventEmitter<any> = new EventEmitter();
  @Output() pinBioAuthEvent: EventEmitter<any> = new EventEmitter();

  public readonly BAS_USER_UID_KEY = 'bas_user_uid';
  public readonly PROFILE_UID_KEY = 'profile_uid';
  public readonly TA_CONFIG = 'ta_config';
  private readonly USER_WORK_SESSION_KEY = 'user_work_session_key';
  //FOR DEBUGGING ENABLE THIS
  //private readonly PRODUCTION = false;
  private readonly PRODUCTION = true;
  taConfig = null;
  touchAvailable = false;
  userWorkSession = null;
  basUser = null as BasUser;
  profile = null as Profile;
  private sessionValid = false;
  private localSessionExists = false;
  isSyncing = false;
  onlineRecordList = [];
  offlineRecordList = [];
  userHasPin = false;
  authorizedByPin = false;
  authTimeout:any;
  authModalOpen = false;
  constructor(
    private ngZone: NgZone,
    private helpers: ErrorDialogService,
    private platform: Platform,
    private restApi: RestApiService,
    private auth: AuthProvider,
    private timer: TimerService,
    private network: NetworkService,
    private loadingService: LoadingService,
    private storage: Storage,
    private splashScreen: SplashScreen,
    private modalCtrl: ModalController,
    private secureStorage: SecureStorage,
    private alertCtrl: AlertController,
    private tr: TranslateService,
    ) {
      this.platform.ready()
      .then(() => {
        this.ngZone.run( () => {

          this.auth.init();
          this.network.networkEvent.subscribe(
            (status) => {
              this.startSession(status);
            });

          this.synchronizationEvent.subscribe((isSincing) => {
              if (isSincing) {
                  this.isSyncing = true;
                  this.loadingService.show({ message: this.tr.instant('session.synchro') });
                  // setTimeout(() => { this.loadingService.hide(); console.log('timer off'); }, 3000);
              }

              if (!isSincing) {
                  this.isSyncing = false;
                  this.timer.sessionRecordsListener.emit(this.onlineRecordList);
                  this.loadingService.hide();
              }
          });
          this.auth.logoutCompletedEvent.subscribe(
            () => {
              this.startSession(this.network.getCurrentNetworkStatus());
            }
          );

          this.pinCodeChangeEvent.subscribe((usePin) => {

            if (usePin) {
              if (!this.userHasPin) {
              this.openModal(true);
              }

            } else { // delete Pin
                console.log('deleting');
                this.userHasPin = false;
                this.authorizedByPin = false;
                this.secureStorage.create('pincode')
                .then((sstorage: SecureStorageObject) => {
                sstorage.remove('Securitypin');
                });
            }
          });
          this.auth.authCompletedEvent.subscribe(
            (AuthProfile) => {              
              this.setProfile(AuthProfile).then( () => {
              if ( this.localSessionExists &&
                   this.basUser &&
                   this.userWorkSession &&
                   this.profile.email === AuthProfile.email &&
                   !this.isSyncing) {
                    console.log(this.userWorkSession);
                    this.setSesion();
              }
              this.restApi.getUserTAConfig(this.profile.linkUserId).then((config) => {
                if (config) {
                  const taConfigJson = JSON.parse(config);
                  if (this.taConfig) {
                    if (this.taConfig.allocHoursPerWeek !== taConfigJson.allocHoursPerWeek) {
                      this.taConfig = taConfigJson;
                      this.taConfigEvent.emit(this.taConfig);
                    }
                  } else {
                      this.taConfig = taConfigJson;
                      this.taConfigEvent.emit(this.taConfig);
                  }

                } else {
                  this.loadingService.hide();
                  console.log('no config');
                }



              });
              this.restApi.getUser(this.profile.linkUserId).then((basUser) => {
                if (basUser) {
                  const basUserObj = JSON.parse(basUser);
                  if (this.isSyncing) {
                    this.syncOfflineRecordsInternal(basUserObj.bas_UserID).then(() => {
                      this.synchronizationEvent.emit(false);
                      const newStatus  =  this.onlineRecordList[ (this.onlineRecordList.length - 1) ].att_Status;
                      this.updateWorkSesson(newStatus).then( () => {
                        this.setSesion();
                        });
                      });
                  } else {
                    if (this.basUser && this.basUser.bas_UserID !== basUserObj.bas_UserID ) {
                      console.log('new user loaded' , this.basUser.bas_UserID, basUser.bas_UserID);
                      this.setBasUser(basUser).then( () => {
                        this.setSesion();
                      });
                    } else if (this.userWorkSession && basUserObj.att_Status !== this.userWorkSession.status) {
                      console.log('updating work status' , basUserObj.att_Status, this.userWorkSession.status);
                      this.setBasUser(basUser).then( () => {
                      this.updateWorkSesson(basUserObj.att_Status).then( () => {
                        this.setSesion();
                        });
                      });
                    } else {
                      this.setBasUser(basUser).then( () => {
                        this.setSesion();
                      });
                    }
                  }
                }
              });
              }, ()=>{
                console.log('no profile');
                this.loadingService.hide();
                this.sessionValid = false;
                this.endSessionEvent.emit();
                this.auth.resetToken();
                this.storage.clear();
                this.alertSessionFailed();
              });
            });
            this.pinBioAuthEvent.subscribe((value)=>{
              this.authorizedByPin = value;
            })
            this.platform.pause.subscribe(() => {// background
              if(!this.authModalOpen){
              console.log('In Background');
              this.authTimeout= setTimeout(()=>{ 
                console.log('removing authorization');
                this.pinBioAuthEvent.emit(false);
               },5000);
              }
            });
        
            this.platform.resume.subscribe(() => {// foreground
              if(!this.authModalOpen){
              console.log('In Foreground');
              clearInterval(this.authTimeout)
              this.secureStorage.create('pincode')
              .then((storage: SecureStorageObject) => {
              storage.get('Securitypin')
              .then(
                async data => {
                  console.log('session user has pin', data);
                  this.userHasPin = true;
                  console.log('user authorized',this.authorizedByPin)
                  if (!this.authorizedByPin) {
                    await this.openModal();
                   }
                 
                },
                error => this.userHasPin = false,
              );
              });
            }
            });
          this.endSessionEvent.subscribe( async () => {
            console.log('invalidating session');
            this.secureStorage.create('pincode')
            .then((sstorage: SecureStorageObject) => {
              sstorage.clear();
            });
            this.sessionValid = false;
            delete this.profile;
            delete this.basUser;
            delete this.userWorkSession;
            delete this.taConfig;
            this.timer.timerEvent.emit(0);
          });

  });
  });
}

  async ngOnInit() {
    await  this.platform.ready()
    .then(async () => {

    });
  }


  async sessionCreate() {
    console.log('ionViewWillEnter Session');
    this.startSession(this.network.getCurrentNetworkStatus());
  }

  async alertSessionFailed() {
    await this.alertCtrl.create({
      message: this.tr.instant('session.fail'),

      buttons: [
        {
          text: this.tr.instant('common.ok'),
          handler: () => {
            this.sessionCreate()
          }
        }
      ],
      
    }).then(alert => alert.present())
  }


  async openModal(createNew = false) {
    const modal = await this.modalCtrl.create({
        component: AuthModalComponent,
        componentProps: { createNew },
        backdropDismiss: false,
        cssClass: 'auth-modal'
      });
    this.authModalOpen = true;
    modal.present();
    modal.onDidDismiss().then(overlayEventDetail => {
      this.authModalOpen = false;
      console.log(overlayEventDetail);
      if (!overlayEventDetail.data) {
        this.helpers.showError('Auth Failure');
        this.openModal();
        return;
      }
      this.pinBioAuthEvent.emit(true);
      this.userHasPin = true;
    }
    );
  }

  async startSession(status: string) {
    this.storage.get('local_session').then(async (localSession) => {
    if (localSession) {
    this.localSessionExists = true;
    this.basUser = await this.storage.get(await this.storage.get(this.BAS_USER_UID_KEY));
    this.profile =  await this.storage.get(await this.storage.get(this.PROFILE_UID_KEY));
    this.userWorkSession =  await this.storage.get(await this.storage.get(this.USER_WORK_SESSION_KEY));
    if(!this.basUser || !this.profile ){
        this.storage.clear();
      }
    
    this.storage.get(this.TA_CONFIG).then((taConfig) => {
      if (taConfig) {
        this.taConfig = taConfig;
        this.taConfigEvent.emit(this.taConfig);
      }

    });

    console.log(status);
    if ( this.basUser && this.profile) {
      this.secureStorage.create('pincode')
      .then((storage: SecureStorageObject) => {
      storage.get('Securitypin')
      .then(
        async data => {
          console.log('session user has pin', data);
          this.userHasPin = true;
          if (!this.authorizedByPin) {
          await this.openModal();
         }
        },
        error => this.userHasPin = false,
      );
      });

      if ( status === 'Online') {
          this.splashScreen.hide();
          this.auth.signin();
          this.storage.get('offline_records').then((res) => {
              if (res) {
                  this.synchronizationEvent.emit(true);
                  console.log('syncing');
                  this.offlineRecordList.splice(0, this.offlineRecordList.length);
                  this.offlineRecordList = JSON.parse(res);
              }
          });
        }
      if ( status === 'Offline' && !this.sessionValid) {
        this.auth.signinOffline().then((result) => {
          if (result) {
            if (this.basUser.bas_UserID ) {
              console.log('auth good offline ');
              this.splashScreen.hide();
              this.sessionReadyEvent.emit(this.basUser);
            } else {
              console.log('no bas user - landing page');
              this.loadingService.show({message: 'No account authorized. Please connect and authorize yourself.'});
            }
          } 
        });

      }
  }
  // no local session
  } else {
    console.log('test');
    this.storage.clear();
    if ( status === 'Online') {
      console.log(' no local, status online - auth');
      this.loadingService.hide();
      this.loadingService.show({message: 'Loading account information...'});
      this.auth.signin();
    }
    if ( status === 'Offline') {
      console.log(' no local, status offline - landing page');
      this.loadingService.hide();
      this.loadingService.show({message: 'No account authorized. Please connect and authorize yourself.'});
    }
  }
  });

  }

  isValidSession() {
      return this.sessionValid;
  }

  async setProfile(AuthProfile) {
    this.profile = {} as Profile;
    if ( AuthProfile === null){
      throw new Error('no profile');
    }
    if (AuthProfile['tbs-acnt-st'] === null)
    {
      throw new Error('no profile');
    }

    let acnt = null

    if ( AuthProfile['tbs-acnt-st'].length > 1 && this.PRODUCTION)
    {
      const profilesArr = AuthProfile['tbs-acnt-st'];
      for(let i = 0; i < profilesArr.length;i++ ){
        if(profilesArr[i].Name === 'TBS Official'){
          acnt = profilesArr[i];
          console.log('nasiel som official site ',acnt)
          break;
        }
      }
    } else {
      acnt =  AuthProfile['tbs-acnt-st'][0] ? AuthProfile['tbs-acnt-st'][0] :  AuthProfile['tbs-acnt-st'];
    }
  

    console.log(acnt)
   
   
    this.profile.linkUserId = acnt.LinkUserUID;
    this.profile.acntName = acnt.Name;
    this.profile.email = AuthProfile.email;
    this.profile.displayName = AuthProfile.name;
    this.profile.zone = AuthProfile.zoneinfo;
    this.profile.updatedAt = new Date(AuthProfile.updated_at);
    this.profile.hasPin = false;
    this.updateProfile(this.profile);
  }

  async updateProfile(profile) {
    await this.storage.remove(this.PROFILE_UID_KEY);
    await this.storage.set(this.PROFILE_UID_KEY, this.PROFILE_UID_KEY + profile.linkUserId);
    await this.storage.remove(this.PROFILE_UID_KEY + profile.linkUserId);
    await this.storage.set(this.PROFILE_UID_KEY + profile.linkUserId, profile);
  }

  async setBasUser(basUser) {
    this.basUser = JSON.parse(basUser);
    await this.storage.remove(this.BAS_USER_UID_KEY);
    await this.storage.remove(this.BAS_USER_UID_KEY + this.basUser.bas_UserID);
    await this.storage.set(this.BAS_USER_UID_KEY, this.BAS_USER_UID_KEY + this.basUser.bas_UserID);
    await this.storage.set(this.BAS_USER_UID_KEY + this.basUser.bas_UserID, this.basUser);
  }

  async updateWorkSesson(status) {
    this.userWorkSession.status = status;
    await this.storage.remove(this.USER_WORK_SESSION_KEY);
    await this.storage.remove(this.USER_WORK_SESSION_KEY + this.basUser.bas_UserID);
    await this.storage.set(this.USER_WORK_SESSION_KEY, this.USER_WORK_SESSION_KEY + this.basUser.bas_UserID);
    await this.storage.set(this.USER_WORK_SESSION_KEY + this.basUser.bas_UserID, this.userWorkSession);
  }

  async setSesion() {
    this.splashScreen.hide();
    this.loadingService.hide();
    this.sessionValid = true;
    this.localSessionExists = true;
    console.log(this.basUser);
    this.storage.set('local_session', true);
    this.localSessionExists = true;
    if  (this.taConfig) {
      this.taConfigEvent.emit(this.taConfig);
    }
    this.timer.sessionRecordsListener.emit(this.onlineRecordList);
    this.sessionReadyEvent.emit(this.basUser);
  }
  async syncOfflineRecordsInternal(basUserUid) {
    return await this.restApi.getThisMonthUserTARecords(basUserUid).then(
        (records) => {
            if (records) {
                const jsonRecords = JSON.parse(records);
                console.log(jsonRecords);
                this.onlineRecordList = jsonRecords.items;

                // if offline records exist do the sync else continue
                if ( this.offlineRecordList.length > 0 ) {
                    const latestOnlineRecord = jsonRecords.items[jsonRecords.totalCount - 1];
                    console.log('latestrecord', latestOnlineRecord);
                    const latestOnlineRecordTime = new Date(latestOnlineRecord.bas_Timestamp).getTime();
                    this.offlineRecordList.forEach((elem) => {
                        const elemTime = new Date(elem.bas_Timestamp).getTime();
                        if ( latestOnlineRecordTime < elemTime) {
                            console.log('creating saeved record', elem);
                            this.restApi.createRecord(elem);
                        }
                        this.onlineRecordList.push(elem);
                    });
                    this.storage.remove('offline_records');
                    this.timer.offlineRecordsList.splice(0, this.timer.offlineRecordsList.length);
            }
        }
    });

}


}


