import { SafariViewController, SafariViewControllerOptions } from '@ionic-native/safari-view-controller/ngx';
import { Injectable } from '@angular/core';
import { InAppBrowser, InAppBrowserOptions } from '@ionic-native/in-app-browser/ngx';
import { ErrorDialogService } from 'src/app/services/error-dialog/error-dialog.service';

@Injectable({
    providedIn: 'root'
  })
export class BrowserProvider {

  private inAppLogin: any;

    constructor(private inAppBrowser: InAppBrowser,
                private safariViewController: SafariViewController,
                private helpers: ErrorDialogService) { }

    public async ShowWindow(url: string): Promise<any> {
        if (await this.safariViewController.isAvailable()) {
            this.helpers.appendLog('safari');
            const optionSafari: SafariViewControllerOptions = {
                url,
                enterReaderModeIfAvailable: true,
            };
            await this.safariViewController.show(optionSafari).toPromise();

        } else {
            const options: InAppBrowserOptions = {
                location: 'no',
                cleardata: 'yes',
                clearsessioncache : 'yes'
            };
            this.helpers.appendLog('create Browser');
            this.inAppLogin = this.inAppBrowser.create(url, '_system', options);
            this.helpers.appendLog('Show Browser');
            await this.inAppLogin.show();
            this.helpers.appendLog('Showing Browser');
        }
    }

    public async CloseWindow() {
        if (await this.safariViewController.isAvailable()) {
            this.safariViewController.hide();
        }  else {
            this.inAppLogin.close();
        }
        this.helpers.appendLog('Closed Browser');
    }

}
