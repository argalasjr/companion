import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { TranslateService } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private storage: Storage,
    private translate: TranslateService
  ) {
    this.initializeApp();
    translate.setDefaultLang('en');

    translate.onLangChange.subscribe(change => console.log('lang changed to', change.lang));
  }

  async ngOnInit() {
    let language = await this.storage.get('language');
    if (!language) {
      language = navigator.language.split('-')[0];
    }

    this.translate.use(language);
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
}
