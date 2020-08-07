import { Injectable, EventEmitter, Output, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AlertController, Platform} from '@ionic/angular';
import { NetworkService } from 'src/app/services/network/network.service';
import { TARecord } from 'src/app/interfaces/record';
import { RestApiService } from 'src/app/services/rest-api/rest-api.service';
import { WorkSessionCode } from 'src/app/pages/dashboard/dashboard.page';
import { Device } from '@ionic-native/device/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { AuthProvider } from '../../providers/auth/auth.provider';

@Injectable({
    providedIn: 'root'
  })

export class TimerService implements OnInit {
    private readonly USER_WORK_SESSION_KEY = 'user_work_session_key';
    userWorkSession: any = null;
    userWorking = false;
    basUser = null;
    newRecord = null as TARecord;
    geolocationString = ' ';
    descriptionString = ' ';
    timerInterval: any;
    userWorkTimes = null;
    onlineRecordsList = [];
    offlineRecordsList = [];
    waitWorkTimesLoaded: Promise<boolean>;
    @Output() timerEvent: EventEmitter<any> = new EventEmitter();
    @Output() workTimesLoadedEvent: EventEmitter<any> = new EventEmitter();
    @Output() workStatusChangedEvent: EventEmitter<any> = new EventEmitter();
    @Output() sessionRecordsListener: EventEmitter<any> = new EventEmitter();
    constructor(
        public storage: Storage,
        private alertCtrl: AlertController,
        private platform: Platform,
        private network: NetworkService,
        private restApi: RestApiService,
        private geolocation: Geolocation,
        private device: Device,
        private auth: AuthProvider,
        ) {

            this.userWorkSession = new DayWorkSession(
                '0',
                null,
                0,
                0);
            this.sessionRecordsListener.subscribe((recordsList) => {
                console.log('got list', recordsList);
                this.onlineRecordsList = recordsList;
                this.loadWorkStatus();
            });

            this.auth.logoutCompletedEvent.subscribe(
                () => {
                    this.userWorkSession = new DayWorkSession(
                        '0',
                        null,
                        0,
                        0);
                    this.userWorkTimes = {daySeconds: 0 , weekSeconds: 0 , monthSeconds: 0 };
                    this.workTimesLoadedEvent.emit(this.userWorkTimes);
                    this.timerEvent.emit(0);
                    this.removeSessionFromStorage();

                }
              );

    }
    async ngOnInit() {
        this.platform.ready()
      .then(() => {
      });

    }

    async load(basUser, startWork = false, code = 0) {
        this.geolocation.getCurrentPosition().then((resp) => {
            this.geolocationString = String(resp.coords.latitude) + ' ' + String(resp.coords.longitude);
            console.log(this.geolocationString);
           }).catch((error) => {
             console.log('Error getting location', error);
           });
        this.descriptionString = 'TBS Companion Lite record done from ' + this.device.platform + ' device';
        this.basUser = basUser;
        if (!startWork) {
            if (this.network.getCurrentNetworkStatus() === 'Online' ) {
                this.restApi.getThisMonthUserTARecords(basUser.bas_UserID).then(
                    (records) => {
                        if (records) {
                            const jsonRecords = JSON.parse(records);
                            console.log(jsonRecords);
                            this.onlineRecordsList = jsonRecords.items;
                            this.loadWorkStatus();
                            if (this.userWorkSession.uid !== '0' && this.userWorkTimes && this.userWorkTimes.daySeconds > 0) {
                                console.log('setting day seconds from cloud ', this.userWorkTimes.daySeconds);
                                this.timerEvent.emit(this.userWorkTimes.daySeconds);
                            }
                            if (this.userWorkSession.uid === '0' ) {
                                console.log('creating new work session for user', basUser.bas_UserID);
                                this.adduser(this.USER_WORK_SESSION_KEY + basUser.bas_UserID );
                            }
                        }});
             }
        }
        this.loadUserSession(basUser, startWork, code);
        return this.userWorkSession;
    }

    async loadUserSession(basUser, startWork , code) {
        this.storage.get(  this.USER_WORK_SESSION_KEY + String(basUser.bas_UserID)).then(async (user) => {
            if (user) {
                const now = new Date();
                // if next day reset values
                const lastChecked = new Date(user.lastChecked);
                if ( now.getUTCDay() !== lastChecked.getUTCDay() && user.status === 200) {
                    user.totalDaySeconds = 0;
                    user.status = 200;
                    user.lastChecked = now;
                    console.log(user);
                }
                if (this.network.getCurrentNetworkStatus() === 'Online' && this.userWorkTimes) {
                    
                        user.totalDaySeconds = this.userWorkTimes.daySeconds;
                    
                }
                if (this.userWorkSession.uid === '0' ) {
                console.log('creating day session');
                console.log('setting new uid', user.uid);
                this.userWorkSession.setUid(user.uid);
                }
                this.userWorkSession.setLastChecked(new Date(user.lastChecked));
                this.userWorkSession.setStatus(user.status);
                this.userWorkSession.setTotalDaySeconds(user.totalDaySeconds);
                console.log(this.userWorkSession);
                if (this.userWorkSession.status !== 200 && !startWork) {
                    console.log('continue timing loaded');
                    this.startTiming(startWork, code);

                } else  if (this.userWorkSession.status !== 200 && startWork) {
                    console.log('continue timing from user input ');
                    this.handleRecord(basUser, code, now);

                } else if (this.userWorkSession.status === 200 && startWork) {
                    this.userWorkSession.setLastChecked(now);
                    console.log('gonna timing ');
                    this.startTiming(startWork, code);
                    this.handleRecord(basUser, code, now);
                } else {
                    if (this.userWorkSession.status === 200) {
                        this.stopTimingStorage();
                        this.timerEvent.emit(this.userWorkSession.totalDaySeconds);
                    }

                    if (this.userWorkSession.status !== 200) {
                        this.startTiming(startWork, this.userWorkSession.status);
                    }
                    this.workStatusChangedEvent.emit(this.userWorkSession.status);
                    this.save( this.userWorkSession.uid);
                }
            }
        });
    }

    save(uid: string): void {
        this.storage.set(this.USER_WORK_SESSION_KEY, uid);
        this.storage.set(uid, this.userWorkSession);
    }

    async removeSessionFromStorage() {
        const workSessionUid = await this.storage.get(this.USER_WORK_SESSION_KEY);
        this.storage.remove(workSessionUid);
        this.storage.remove(this.USER_WORK_SESSION_KEY);
    }

    async startTiming(startWork, code) {
        console.log(this.userWorkSession);
        if (!this.userWorking) {
            this.userWorking = true;
            if ( code === 0 ) {
                console.log('no code set explicitly setting to value 100');
                code = 100;
            }
            this.userWorkSession.setStatus(code);
            this.workStatusChangedEvent.emit(code);
            this.timerInterval = setInterval(() => {
            const now = new Date();
            let timeDifference = 0
            if (this.userWorkSession.lastChecked){
                timeDifference = now.getTime() - this.userWorkSession.lastChecked.getTime();
            }
      
            const seconds = timeDifference / 1000;
            this.userWorkSession.addToTotalSeconds(seconds);
            this.userWorkSession.setLastChecked(now);
            this.save( this.userWorkSession.uid);
            this.timerEvent.emit(this.userWorkSession.totalDaySeconds);

        }, 1000);
    } else {
        if (startWork && code === this.userWorkSession.status) {
        const alert = await this.alertCtrl.create({
            header: 'Warning',
            message: 'You are already timing. You must stop it before timing.',
            buttons: ['OK']
        });
        await alert.present();
    }

    }

    }
    stopTimingStorage() {
        this.userWorking = false;
        this.userWorkSession.setLastChecked(new Date());
        this.userWorkSession.setStatus(200);
        this.workStatusChangedEvent.emit(200);
        clearInterval(this.timerInterval);
        this.timerInterval = false;
    }

   async handleRecord(basUser, code, now) {
        if ( code === this.userWorkSession.status && this.userWorkSession.status === 200) {
            const alert = await this.alertCtrl.create({
                header: 'Warning',
                message: 'You are already timing ' + String(code) + '. You must stop it before timing.',
                buttons: ['OK']
            });
            await alert.present();
        } else {
            this.userWorkSession.setStatus(code);
            const nowUTC = now.toISOString();
            const body = {
                bas_Timestamp: nowUTC,
                bas_Context: code,
                src_DeviceID: this.device.uuid,
                src_DeviceName: this.device.model,
                usr_UserID: basUser.bas_UserID,
                usr_FirstName: basUser.bas_FirstName,
                usr_LastName: basUser.bas_LastName,
                dtl_Description: this.descriptionString,
                dtl_GeoLocationString: this.geolocationString,
            };
            if (this.network.getCurrentNetworkStatus() === 'Online' ) {
            console.log(body);
            await this.restApi.createRecord(body
                ).then((recordResponse) => {
                    this.newRecord = recordResponse.data;
                    console.log(this.newRecord);
                }, err => console.log(err));
            } else {
                this.saveOfflineRecord(body);
            }
            }
    }

    async stopTiming(basUserUid, code) {
        console.log(this.userWorkSession);
        if (this.userWorkSession.status !== 200) {
        this.stopTimingStorage();
        const nowUTC = new Date().toISOString();
        const body = {
            bas_Timestamp: nowUTC,
            bas_Context: code,
            src_DeviceID: this.device.uuid,
            src_DeviceName: this.device.model,
            usr_UserID: basUserUid,
            usr_FirstName: this.basUser.bas_FirstName,
            usr_LastName: this.basUser.bas_LastName,
            dtl_Description: this.descriptionString,
            dtl_GeoLocationString: this.geolocationString,
        };
        console.log(body);
        if (this.network.getCurrentNetworkStatus() === 'Online' ) {
            await this.restApi.createRecord(body
             ).then((recordResponse) => {
                 this.newRecord = recordResponse.data;
                 console.log(this.newRecord);
             }, err => console.log(err));
         } else {
             this.saveOfflineRecord(body);
         }
        this.save( this.userWorkSession.uid);
        } else {

            const alert = await this.alertCtrl.create({
                header: 'Warning',
                message: 'You are off duty already.',
                buttons: ['OK']
            });
            await alert.present();
        }

    }

    adduser(userUid): void {
        let totalDaySeconds = 0;
        let workStatus = this.basUser.att_Status;
        let lastChecked = new Date();


        this.userWorkSession.setUid(userUid);

        if (this.userWorkTimes && this.userWorkTimes.daySeconds > 0) {
            totalDaySeconds = this.userWorkTimes.daySeconds;
            console.log('setting day seconds ', totalDaySeconds);
        }
        for(let i = 0 ; i < this.onlineRecordsList.length ; i++){
            const elemDay =new Date(this.onlineRecordsList[i].bas_Timestamp)
            if (elemDay.getUTCDate() === lastChecked.getUTCDate())
            {
                console.log('nasiel som record tento den koncim ',this.onlineRecordsList[i])
                lastChecked = elemDay
                break;
            }
        }
        const latestOnlineRecord = this.onlineRecordsList[ (this.onlineRecordsList.length - 1) ];
        if (latestOnlineRecord) {
            workStatus = latestOnlineRecord.bas_Context;
        }
        this.userWorkSession.setLastChecked( lastChecked);
        this.userWorkSession.setTotalDaySeconds(totalDaySeconds);
        if(workStatus){
            this.userWorkSession.setStatus( workStatus);
        } else {
            this.userWorkSession.setStatus( 200 );
        }
        
        console.log(this.userWorkSession);
        this.save(  this.userWorkSession.uid);
        if (workStatus !== 200) {
            this.startTiming(false, workStatus);
        }

    }

    getThisDayWorkTimeInSeconds() {
        const now = new Date();
        return this.computeWorkTimeInSecondsFromRecords(now.getUTCDate());
    }

    getThisWeekWorkTimeInSeconds() {
        const dateInmoth = new Date().getUTCDate();
        let dayInWeek = new Date().getUTCDay();
        // sunday
        if (dayInWeek === 0) {
            dayInWeek = 7;
        }
        const lastMondayDate = dateInmoth - dayInWeek + 1;
        console.log('week', dateInmoth, dayInWeek, lastMondayDate);
        return this.computeWorkTimeInSecondsFromRecords(lastMondayDate);
    }

    getThisMonthWorkTimeInSeconds() {
        return this.computeWorkTimeInSecondsFromRecords(1);
    }

    getUserWorkTimesInSeconds() {
            const daySeconds = this.getThisDayWorkTimeInSeconds();
            const weekSeconds = this.getThisWeekWorkTimeInSeconds();
            const monthSeconds = this.getThisMonthWorkTimeInSeconds();
            this.userWorkTimes = {
                daySeconds,
                weekSeconds,
                monthSeconds
            };
            return this.userWorkTimes;
    }

    private computeWorkTimeInSecondsFromRecords(from) {
        let totalWorkTimeinSeconds = 0;
        let startTime = null;
        let endTime = null;
        this.onlineRecordsList.forEach((elem, index) => {
            const day = new Date(elem.bas_Timestamp).getUTCDate();
            if ( day >= from ) {
            if ( !startTime && elem.bas_Context !== WorkSessionCode.OffDuty && !endTime ) {
                startTime = new Date(elem.bas_Timestamp).getTime();
            }
            if ( elem.bas_Context === WorkSessionCode.OffDuty && startTime ) {
                endTime = new Date(elem.bas_Timestamp).getTime();
                const timeDifferenceInSeconds = (endTime - startTime) / 1000;
                startTime = null;
                endTime = null;
                totalWorkTimeinSeconds += timeDifferenceInSeconds;
            }
            // last element, add to seconds if in work today
            if (index === this.onlineRecordsList.length - 1 ) {
                if ( elem.bas_Context !== 200 ) {
                console.log('user working now adding to totalseconds');
                const now = new Date().getTime();
                const timeDifferenceInSeconds = (now - startTime) / 1000;
                startTime = null;
                endTime = null;
                totalWorkTimeinSeconds += timeDifferenceInSeconds;
                }
                console.log('setting new status', elem.bas_Context);
                this.userWorkSession.setStatus(elem.bas_Context);
            }
        }
        });
        return totalWorkTimeinSeconds;
    }



    getContractWeekHours() {
        return 0;
    }

    getContractMonthHours() {
        return 0;
    }


    async saveOfflineRecord(bodyRecord) {
        await this.storage.get('offline_records').then((res) => {
            if (res) {
            console.log(res);
            this.offlineRecordsList.splice(0, this.offlineRecordsList.length);
            this.offlineRecordsList = JSON.parse(res);
            }
            this.offlineRecordsList.push(bodyRecord);
            this.storage.remove('offline_records');
            this.storage.set('offline_records', JSON.stringify(this.offlineRecordsList)).then(() => console.log('saved'));
            console.log(this.offlineRecordsList);
        });


    }

    loadWorkStatus() {
        if ( this.onlineRecordsList.length > 0) {
            const newStatus  =  this.onlineRecordsList[ (this.onlineRecordsList.length - 1) ].att_Status;
            this.userWorkSession.setStatus(newStatus);
            this.save(this.userWorkSession.uid);
            const res = this.getUserWorkTimesInSeconds();
            if (res) {
                    this.workTimesLoadedEvent.emit(res);
                    if (this.userWorkSession.status === 200) {
                        this.stopTimingStorage();
                        this.timerEvent.emit(this.userWorkSession.totalDaySeconds);
                    }
                    if (this.userWorkSession.status !== 200) {
                        this.startTiming(false, this.userWorkSession.status);
                    }
                    this.workStatusChangedEvent.emit(this.userWorkSession.status);
                }
        }
        }
}


export class DayWorkSession {

    constructor(public uid: string,
                public lastChecked: Date,
                public totalDaySeconds: number,
                public status) {
    }
    setUid(uid: string): void {
        this.uid = uid;
    }
    setLastChecked(lastChecked: Date): void {
        this.lastChecked = lastChecked;
    }
    setStatus(status: number) {
        this.status =  status;
    }
    setTotalDaySeconds(totalDaySeconds: number): void {
        this.totalDaySeconds = totalDaySeconds;
    }

    addToTotalSeconds(totalDaySeconds: number): void {
        this.totalDaySeconds += totalDaySeconds;
    }
    deductFromTotalSeconds(totalDaySeconds: number): void {
        this.totalDaySeconds -= totalDaySeconds;
    }
  }

