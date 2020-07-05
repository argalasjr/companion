import { Injectable, NgZone, EventEmitter, Output} from '@angular/core';
import { NavController, AlertController, Platform,  } from '@ionic/angular';
import { ErrorDialogService } from '../error-dialog/error-dialog.service';
import { Network } from '@ionic-native/network/ngx';
import { BehaviorSubject } from 'rxjs';
export enum ConnectionStatus {
    Online,
    Offline
  }

@Injectable({
    providedIn: 'root'
  })

export class NetworkService  {
    private status: BehaviorSubject<ConnectionStatus> = new BehaviorSubject(ConnectionStatus.Offline);
    public currentNetworkStatus = '';
    @Output() networkEvent: EventEmitter<any> = new EventEmitter();
    constructor(
        private ngZone: NgZone,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private helpers: ErrorDialogService,
        private platform: Platform,
        private network: Network) {
            this.platform.ready()
            .then(() => {
                this.ngZone.run( () => {
                    this.initializeNetworkEvents();
                    console.log(this.network.type);
                    const status =  this.network.type !== 'none' ? ConnectionStatus.Online : ConnectionStatus.Offline;
                    this.status.next(status);
                });
            });
        }


    private async initializeNetworkEvents() {
        this.network.onDisconnect().subscribe(() => {
            if (this.status.getValue() === ConnectionStatus.Online) {
            console.log('WE ARE OFFLINE');
            this.updateNetworkStatus(ConnectionStatus.Offline);
            }
        });

        this.network.onConnect().subscribe(() => {
            if (this.status.getValue() === ConnectionStatus.Offline) {
            console.log('WE ARE ONLINE');
            this.updateNetworkStatus(ConnectionStatus.Online);
            }
        });

    }
    private async updateNetworkStatus(status: ConnectionStatus) {
    this.status.next(status);
    console.log(status);
    this.currentNetworkStatus = status === ConnectionStatus.Offline ? 'Offline' : 'Online';

    this.networkEvent.emit(this.currentNetworkStatus);
    }
    public getCurrentNetworkStatus() {
        this.currentNetworkStatus = this.status.value === ConnectionStatus.Offline ? 'Offline' : 'Online';
        return this.currentNetworkStatus;
    }
}


