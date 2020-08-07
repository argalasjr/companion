import { Injectable, NgZone, OnInit, EventEmitter, Output } from '@angular/core';
import { Platform } from '@ionic/angular';
import { ErrorDialogService } from '../error-dialog/error-dialog.service';
import { HTTP } from '@ionic-native/http/ngx';
import { AuthProvider } from '../../providers/auth/auth.provider';
import { async } from '@angular/core/testing';

@Injectable({
    providedIn: 'root'
  })

export class RestApiService implements OnInit {
    //PRODUCTION
    private readonly REST_API_URL = 'https://api-core-sb.tbs-biometrics.com/RemoteAdmin/v1/';

    //DEVELOPMENT SITE ID - cecd047e-0665-4007-8c89-478c31a2c812
    // private readonly REST_API_URL = 'https://dev-core-sb.tbs-biometrics.com/RemoteAdmin/v1/';

    private accessToken: string = null;
    private siteID: string = null;
    @Output() basUserEvent: EventEmitter<any> = new EventEmitter();
    
    constructor(
      private ngZone: NgZone,
      private helpers: ErrorDialogService,
      private http: HTTP,
      private platform: Platform,
      private auth: AuthProvider
    ) {
      this.platform.ready()
      .then(() => {
        this.ngZone.run( () => {

          this.auth.authCompletedEvent.subscribe(
            async (userInfo) => {
              this.setSiteId(userInfo);
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

    private async setSiteId(AuthProfile){
      console.log('acquired user ', AuthProfile)
      if ( AuthProfile === null){
        throw new Error('no site ID');
      }
      if (AuthProfile['tbs-acnt-st'] === null)
      {
        throw new Error('no site ID');
      }
      if (AuthProfile['tbs-acnt-st'][0] === null)
      {
        throw new Error('no site ID');
      }
      const acnt = AuthProfile['tbs-acnt-st'][0] ? AuthProfile['tbs-acnt-st'][0] :  AuthProfile['tbs-acnt-st'];

      if ( acnt === null)
      {
        throw new Error('no site ID');
      }
      this.siteID = acnt.GUID;
      console.log(this.siteID)
    }

    private async getRequest(endpoint: string, parameters: any = {}) {
       return await this.http.get(this.REST_API_URL + endpoint, parameters,
        // headers
        {
            SiteID: `${this.siteID}`,
            Authorization: 'Bearer ' + this.accessToken,
        }
      ).then((res: any) => {
        return res.data;
        }, (error) => {
          this.helpers.showError(error.status);
          return null;
        });

    }
    private async postRequest(endpoint: string, bodyJson: any) {
      return this.http.post(this.REST_API_URL + endpoint, bodyJson,
      // headers
      {           
         SiteID: `${this.siteID}`,
         Authorization: 'Bearer ' + this.accessToken,
      }
    ).then((res: any) => {
      console.log(res);
      return res;
      }, (error) => {
        console.log(error);
        this.helpers.showError(error.status);
        return null;
      });
  }


  async getUser(profileUid) {
    console.log('getUser ', profileUid);
    return this.getRequest('Users/' + profileUid);
  }

  async getUserTAConfig(profileUid) {
    console.log('getUserTACONFIG',profileUid);
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
