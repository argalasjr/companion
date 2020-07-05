import { Injectable } from '@angular/core';
import { LoadingController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { LoadingOptions } from '@ionic/core';

/**
 * Service for showing uncancellable loading indicator
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loading: HTMLIonLoadingElement = null;
  private subscription: Subscription = null;

  constructor(private loadingCtrl: LoadingController, private platform: Platform) { }

  async show(opts: LoadingOptions) {
    await this.hide();
    this.loading = await this.loadingCtrl.create(opts);
    await this.loading.present();
    this.subscription = this.platform.backButton.subscribeWithPriority(1000, () => {
      console.log('backbutton clicked while showing loading indicator');
    });
  }

  async hide() {
    await this.platform.ready();
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
