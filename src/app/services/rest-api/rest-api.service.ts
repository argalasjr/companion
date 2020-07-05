import { Injectable, NgZone, OnInit, EventEmitter, Output } from '@angular/core';
import { NavController, AlertController, Platform } from '@ionic/angular';
import { ErrorDialogService } from '../error-dialog/error-dialog.service';
import { HTTP } from '@ionic-native/http/ngx';
import { Storage } from '@ionic/storage';
import { AuthProvider } from '../../providers/auth/auth.provider';
import { BasUser } from '../../interfaces/bas-user';
@Injectable({
    providedIn: 'root'
  })

export class RestApiService implements OnInit {
    private readonly REST_API_URL = 'https://dev-core-sb.tbs-biometrics.com/RemoteAdmin/v1/';
    private accessToken: string = null;
    private linkUserUID: number = null;
    private basUser = {} as BasUser;
    @Output() basUserEvent: EventEmitter<any> = new EventEmitter();
    constructor(
      private ngZone: NgZone,
      private navCtrl: NavController,
      private alertCtrl: AlertController,
      private helpers: ErrorDialogService,
      private http: HTTP,
      private platform: Platform,
      private auth: AuthProvider,
      private storage: Storage,

    ) {
      this.platform.ready()
      .then(() => {
        this.ngZone.run( () => {

          this.auth.authCompletedEvent.subscribe(
            async () => {
              this.setAccesToken();
            });

  });
  });

    }

    async ngOnInit() {
      await this.platform.ready()
      .then(() => {
        this.http.setServerTrustMode('nocheck')
        .then(() => {
            this.http.setDataSerializer('json');
            this.http.setRequestTimeout(5.0);
            this.http.setFollowRedirect(true);
        }
        , err => {
          this.helpers.showError(err);
        });
      });
    }

    private async setAccesToken() {
      this.accessToken = this.auth.getAccessTokenJson();
    }

    private async getRequest(endpoint: string, parameters: any = {}) {
       return await this.http.get(this.REST_API_URL + endpoint, parameters,
        // headers
        {
            SiteID: 'cecd047e-0665-4007-8c89-478c31a2c812',
            Authorization: 'Bearer ' + this.accessToken,
        }
      ).then((res: any) => {
        return res.data;
        }, (error) => {
          this.helpers.showError(error.error);
          return null;
        });

    }
    private async postRequest(endpoint: string, bodyJson: any) {
      return this.http.post(this.REST_API_URL + endpoint, bodyJson,
      // headers
      {
         SiteID: 'cecd047e-0665-4007-8c89-478c31a2c812',
         Authorization: 'Bearer ' + this.accessToken,
      }
    ).then((res: any) => {
      console.log(res);
      return res;
      }, (error) => {
        console.log(error);
        this.helpers.showError(error.error);
        return null;
      });
  }


  async getUser(profileUid) {
    return this.getRequest('Users/' + profileUid);
  }

  async getUserTAConfig(profileUid) {
    return this.getRequest('Users/' + profileUid + '/ta-config');
  }

  async getThisMonthUserTARecords(basUserUid) {
    const now = new Date();
    now.setUTCDate(1);
    now.setUTCHours(0);
    now.setUTCMinutes(0);
    now.setUTCSeconds(0);
    now.setUTCMilliseconds(0);
    return this.getRequest('TARecords', {
      userID: basUserUid,
      dateFrom: now.toISOString(),
      select : 'bas'
    });
  }

  async createRecord(record) {
    this.http.setDataSerializer('json');
    return this.postRequest('TARecords' , record);
  }
}
