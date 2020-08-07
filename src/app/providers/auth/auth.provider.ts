import { EndSessionRequest } from '../../services/app-auth/end-session-request';
import { MyEndSessionHandler } from '../../services/app-auth/end-session-handler';
import { Injectable, EventEmitter, Output } from '@angular/core';
import { ErrorDialogService } from 'src/app/services/error-dialog/error-dialog.service';
import { MyAuthorizationServiceConfiguration } from '../../services/app-auth/auth-service-config';
import { RequestorProvider } from '../../providers/requestor/requestor.provider';
import { MyAuthorizationRequestHandler, AUTHORIZATION_RESPONSE_KEY } from '../../services/app-auth/auth-request-handler';
import {
    AuthorizationNotifier,
    AuthorizationRequest,
    StorageBackend,
    LocalStorageBackend,
    BaseTokenRequestHandler,
    TokenRequest,
    DefaultCrypto,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    AuthorizationServiceConfiguration,
    TokenResponse,
    AuthorizationServiceConfigurationJson
} from '@openid/appauth';
import { BrowserProvider } from '../../providers/browser/browser.provider';
import { LoadingService } from 'src/app/services/loading/loading.service';


//PRODUCTION
const IDENTITY_SERVER_URL = 'https://ids.tbs-biometrics.com';
const CLIENT_ID = 'TBS-CE-TC2020';
const CLIENT_SECRET = 'TBS-CE-TC2020--mvKWe8XqQ0pRHhQA0k6wtXn56Ub1TZDVkCeWNPcsFQbdbrWIq';

//DEVELOPMENT
// const IDENTITY_SERVER_URL = 'https://dev-ids.tbs-biometrics.com';
// const CLIENT_ID = 'TBS-CE-TC2020demo';
// const CLIENT_SECRET = '12345678';


const REDIRECT_URI = 'com.tbs-biometrics.tc2020://cb';
const SCOPE = 'openid profile offline_access email tbs-acnt TBS-Core-RA-WebAPI-2017 TBS-Device-WSAPI-2018 TBS-NC-WSAPI-2018';
const END_SESSION_REDIRECT_URI =  'com.tbs-biometrics.tc2020://cb';
const TOKEN_RESPONSE_KEY = 'token_response';
const AUTH_CODE_KEY = 'authorization_code';

const nowInSeconds = () => Math.round(new Date().getTime() / 1000);

@Injectable()
export class AuthProvider {
    authCompletedReject: (reason?: any) => void;
    authCompletedResolve: (value?: boolean | PromiseLike<boolean>) => void;
    public authCompletedTask: Promise<boolean>;
    private authFinishedCallback;
    private authLogOutCallback;
    private discoveryTask: Promise<AuthorizationServiceConfiguration>;
    private tokenHandler: BaseTokenRequestHandler;
    private storageBackend: StorageBackend;
    private tokenResponse: TokenResponse;

    private code: string;

    private authorizationHandler: MyAuthorizationRequestHandler;
    private endSessionHandler: MyEndSessionHandler;
    private notifier: AuthorizationNotifier;

    private configuration: MyAuthorizationServiceConfiguration;
    private crypto: DefaultCrypto;

    private initialized = false;
    private endSession = false;
    @Output() authCompletedEvent: EventEmitter<any> = new EventEmitter();
    @Output() logoutCompletedEvent: EventEmitter<any> = new EventEmitter();
    @Output() tokensRefreshedEvent: EventEmitter<any> = new EventEmitter();
    constructor(private requestor: RequestorProvider,
                private ionicBrowserView: BrowserProvider,
                private loadingService: LoadingService,
                private helpers: ErrorDialogService) {
        (window as any).handleOpenURL = (url: string) => {
            (window as any).handleOpenURL_LastURL = url;
            this.handleOpenUrl(url);
          };

    }

    public init() {
        this.storageBackend = new LocalStorageBackend();
        this.fetchDiscovery(this.requestor);
        this.notifier = new AuthorizationNotifier();
        // uses a redirect flow for authorization. This is part of the hybrid flow
        this.authorizationHandler = new MyAuthorizationRequestHandler(this.helpers, this.ionicBrowserView);
        this.endSessionHandler = new MyEndSessionHandler(this.ionicBrowserView);
        this.crypto = new DefaultCrypto ();
        // set notifier to deliver responses
        this.authorizationHandler.setAuthorizationNotifier(this.notifier);
        this.helpers.appendLog('Auth Init good');
        this.notifier.setAuthorizationListener(async (request, response, error) => {
            console.log('Authorization request complete ', request, response, error);
            this.helpers.appendLog('Authorization request complete ');
            if (response) {
                await this.storageBackend.setItem(AUTH_CODE_KEY, response.code);
                this.code = response.code;
                await this.getTokensFlow();
            }
        });
    }

    private resetAuthCompletedPromise() {
        this.authCompletedTask = new Promise<boolean>((resolve, reject) => {
            this.authCompletedResolve = resolve;
            this.authCompletedReject = reject;
        });
    }

    public resetToken(){
        this.resetAuthCompletedPromise();
        this.storageBackend.clear();
        delete this.tokenResponse;
    }

    private async getTokensFlow() {
        await this.requestAccessToken();

        if (this.isAuthenticated()) {
            this.authFinishedCallback();
        }
    }

    public async signin() {
        this.resetAuthCompletedPromise();
        if (!this.initialized) {
            this.init();
        }
        this.helpers.appendLog('before Discovery Task');
        await this.discoveryTask;
        this.helpers.appendLog('after Discovery Task');
        this.tryLoadTokenResponseAsync().then(async () => {
            this.helpers.appendLog('after TryLoadTokenResponse');
            console.log('TOKEN RESPONSE ' , this.tokenResponse);
            try {
                if (this.tokenResponse) {
                    if (this.shouldRefresh()) {
                        console.log('refreshing tokens');
                        // this.requestAuthorizationToken();
                        this.requestWithRefreshToken();
                    } else {
                        // confirm('Tokens are fresh');
                        this.authCompletedResolve();
                        const UserInfo = await this.getUserInfo(this.tokenResponse.accessToken);
                        this.helpers.appendLog('User Info request complete ');
                        this.authCompletedEvent.emit(UserInfo);
                    }
                } else {
                    this.requestAuthorizationToken();
                }
            } catch (error) {
                this.authCompletedReject(error);
            }
        });


    }

    public signinOffline() {
        this.resetAuthCompletedPromise();
        if (!this.initialized) {
            this.init();
        }
        return this.tryLoadTokenResponseAsync().then(() => {
            try {
                if (this.tokenResponse) {
                    return this.shouldRefresh() ?  false : true;
                } else {
                    return false;
                }
            } catch (error) {
                this.authCompletedReject(error);
            }
        });


    }

    public async startupAsync(signInCallback, signOutCallback) {
        this.authFinishedCallback = signInCallback;
        this.authLogOutCallback = signOutCallback;
        await this.tryLoadTokenResponseAsync();
    }

    public async AuthorizationCallback(url: string) {
        if (!this.endSession) {
            console.log('easy win', url);
            this.ionicBrowserView.CloseWindow();
            await this.storageBackend.setItem(AUTHORIZATION_RESPONSE_KEY, url);
            this.authorizationHandler.completeAuthorizationRequestIfPossible();

        } else {
            this.endSession = false;
            console.log('end session ', url);
            this.ionicBrowserView.CloseWindow();
            await this.storageBackend.clear();
            await this.resetAuthCompletedPromise();
            delete this.tokenResponse;
            this.logoutCompletedEvent.emit();
        }
    }

    public async waitAuthenticated() {
        this.tryLoadTokenResponseAsync();
        if (this.tokenResponse.accessToken && this.tokenResponse.refreshToken) {
            if (this.shouldRefresh()) {
                // TODO: Refresh token
                await this.requestWithRefreshToken();
            }

            return this.isAuthenticated();
        } else {
            return false;
        }
    }

    public async signout() {
        await this.discoveryTask;
        const idToken = this.tokenResponse.idToken;
        const request = new EndSessionRequest(idToken, END_SESSION_REDIRECT_URI);
        this.endSessionHandler.performEndSessionRequest(this.configuration, request);
        this.storageBackend.clear();
        this.tokenResponse = null;
        this.endSession = true;
    }

    private async requestAuthorizationToken() {
        this.helpers.appendLog('in RAT, before reset ');
        this.resetAuthCompletedPromise();
        this.helpers.appendLog('in RAT, after reset ');
        await this.discoveryTask;
        this.helpers.appendLog('in RAT, after  discovery');
        console.log('here');
        // Redirect and signin to get the Authorization Token
        const request = new AuthorizationRequest({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope : SCOPE,
            response_type:  AuthorizationRequest.RESPONSE_TYPE_CODE,
            state: undefined,
            extras: { nonce: this.generateNonce()}
          }, this.crypto, false);
        this.helpers.appendLog('Perform Auth Reuqest');
        console.log(this.configuration);
        this.authorizationHandler.performAuthorizationRequest(this.configuration, request);
    }

    private async requestAccessToken() {
        this.helpers.appendLog('Before Discovery Token ');
        await this.discoveryTask;
        this.helpers.appendLog('After Discovery Token ');
        this.tokenHandler = new BaseTokenRequestHandler(this.requestor);
        this.helpers.appendLog('Token Handler init');
        let request: TokenRequest = null;
        if (this.code) {

            this.storageBackend.getItem('code_verifier').then(async (codeVerifier) => {
             request = new TokenRequest({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                code: this.code,
                extras: {
                    code_verifier: codeVerifier,
                    client_secret: CLIENT_SECRET
                }
            });
             this.helpers.appendLog('Peform token request ' + JSON.stringify(this.configuration));
             await this.tokenHandler.performTokenRequest(this.configuration, request).then(async (response) => {
                this.helpers.appendLog('Token request complete ');
                console.log(response);
                await this.saveTokenResponse(response);
                this.authCompletedResolve();
                const UserInfo = await this.getUserInfo(this.tokenResponse.accessToken);
                console.log('user ', UserInfo)
                this.helpers.appendLog('User Info request complete ');
                this.authCompletedEvent.emit(UserInfo);
             },
             err => {
                 console.log('rejceted token response');
                 this.loadingService.hide();
                 delete this.tokenResponse;
                 this.storageBackend.clear();
                 this.resetAuthCompletedPromise();
                 //this.signin();
             });


        });
        }
    }

    public isAuthenticated() {
        return this.tokenResponse ? this.tokenResponse.isValid() : false;

    }

    public shouldRefresh() {
        if (this.tokenResponse != null) {
            if (this.tokenResponse.expiresIn) {
                const now = nowInSeconds();
                const timeSinceIssued = now - this.tokenResponse.issuedAt;
                console.log('Refresh Token', timeSinceIssued, this.tokenResponse.expiresIn / 2);
                if (timeSinceIssued > this.tokenResponse.expiresIn / 2) {
                    return true;
                }
                return false;
            } else {
                return true;
            }
        }

        return true;
    }

    public getAuthorizationHeaderValue() {
        return this.tokenResponse && this.tokenResponse.isValid ? `${this.tokenResponse.tokenType} ${this.tokenResponse.accessToken}` : '';
    }

    private async requestWithRefreshToken() {
        this.resetAuthCompletedPromise();
        await this.discoveryTask;

        this.tokenHandler = new BaseTokenRequestHandler(this.requestor);

        let request: TokenRequest = null;

        if (this.tokenResponse) {
            console.log('REFRESH TOKEN', this.tokenResponse);
            this.storageBackend.getItem('code_verifier').then(async (codeVerifier) => {
            request = new TokenRequest({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                refresh_token: this.tokenResponse.refreshToken,
                extras: {
                    code_verifier: codeVerifier,
                    client_secret: CLIENT_SECRET
                }
            });

            await this.tokenHandler.performTokenRequest(this.configuration, request).then(async (response) => {
                console.log('refresh token response ',response);
                await this.saveTokenResponse(response);
                this.authCompletedResolve();
                const UserInfo = await this.getUserInfo(this.tokenResponse.accessToken);
                console.log('user ', UserInfo)
                this.helpers.appendLog('User Info request complete ');
                this.authCompletedEvent.emit(UserInfo);
             },
             err => {
                 console.log('rejceted token response');
                 this.loadingService.hide();
                 this.storageBackend.clear();
                 this.resetAuthCompletedPromise();
                 this.signin();
             });
        });
        }
    }

    public async getUserInfo(accessToken) {
        this.fetchDiscovery(this.requestor);
        const xhrSettings = {
            url: this.configuration.userInfoEndpoint,
            dataType: 'json',
            method: 'GET',
            headers: {
                SiteID: 'cecd047e-0665-4007-8c89-478c31a2c812',
                Authorization: 'Bearer ' + accessToken,
            }
        };
        let json;

        try {
            json = await this.requestor.xhr<AuthorizationServiceConfigurationJson>(xhrSettings);
        } catch (error) {
            console.log('Could not fetch xhr request', error);
        }

        return json;

    }


    private async fetchDiscovery(requestor: RequestorProvider) {
        this.helpers.appendLog('before FetchDiscovery');
        try {
            this.discoveryTask = MyAuthorizationServiceConfiguration.fetchFromIssuer(IDENTITY_SERVER_URL, requestor);

            const response = await this.discoveryTask;
            this.configuration = response;

            this.helpers.appendLog('FetchDiscovery Fetched');
        } catch (error) {
            // If discovery doesn't work, this is the place to set the endpoints manually
            this.discoveryTask = MyAuthorizationServiceConfiguration.fetchManually(IDENTITY_SERVER_URL);

            const response = await this.discoveryTask;
            this.configuration = response;
            this.helpers.appendLog('FetchDiscovery Set Manually ');
        }
        this.helpers.appendLog('after FetchDiscovery');

    }

    // UTILS:
    private async saveTokenResponse(response: TokenResponse) {
        this.tokenResponse = response;
        await this.storageBackend.setItem(TOKEN_RESPONSE_KEY, JSON.stringify(this.tokenResponse.toJson()));
    }

    private generateNonce(): string {
        return Math.floor(Math.random() * 100000).toString();
    }

    private async tryLoadTokenResponseAsync(): Promise<TokenResponse> {
        if (this.initialized) {
            this.init();
        }
        return await this.storageBackend.getItem(TOKEN_RESPONSE_KEY).then((item) => {
            if (item) {
                this.tokenResponse = new TokenResponse(JSON.parse(item));
                return this.tokenResponse;
            } else {
                return null;
            }
        });
    }

    // test class only, dont have in actual app
    public getAccessTokenJson() {
      return this.tokenResponse ? this.tokenResponse.accessToken : null;
    }

    private async handleOpenUrl(url: string) {

        this.AuthorizationCallback(url);

      }
}

