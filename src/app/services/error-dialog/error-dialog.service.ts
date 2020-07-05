import { Injectable, EventEmitter, Output } from '@angular/core';
import { AlertController } from '@ionic/angular';

/**
 * Helpers service for showing error dialog
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorDialogService {
  @Output() appendLogListEvent: EventEmitter<any> = new EventEmitter();
  constructor(private alertCtrl: AlertController) { }

  async appendLog(msg: any) {
    this.appendLogListEvent.emit(msg);
  }
  async showMsg(msg: any) {
    console.log('msg:', msg);
    let message = msg;
    if (msg && msg.Message) {
      message = msg.Message;
    } else if (msg && msg.message) {
      message = msg.message;
    } else if (msg && msg.toString && typeof (msg.toString) === 'function') {
      message = msg.toString();
    }

    const alert = await this.alertCtrl.create({
      backdropDismiss: false,
      header: 'Error',
      message,
      buttons: ['Ok']
    });
    alert.present();
  }

  async showError(error: any) {
    console.log('error:', error);
    let message = error;
    if (error && error.errorMessage) {
      message = error.errorMessage;
    } else if (error && error.message) {
      message = error.message;
    } else if (error && error.toString && typeof (error.toString) === 'function') {
      message = error.toString();
    }

    const alert = await this.alertCtrl.create({
      backdropDismiss: false,
      header: 'Error',
      message,
      buttons: ['Ok']
    });
    alert.present();
  }
}
