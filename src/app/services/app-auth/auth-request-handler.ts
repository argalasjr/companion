import {
    AuthorizationRequestHandler,
    AuthorizationRequest,
    AuthorizationServiceConfiguration,
    AuthorizationRequestResponse,
    StorageBackend,
    LocalStorageBackend,
    BasicQueryStringUtils,
    LocationLike,
    DefaultCrypto,
    AuthorizationResponse,
    AuthorizationError
} from '@openid/appauth';
import { BrowserProvider } from '../../providers/browser/browser.provider';
import { ErrorDialogService } from 'src/app/services/error-dialog/error-dialog.service';

/** key for authorization request. */
const authorizationRequestKey =
    (handle: string) => {
        return `${handle}_appauth_authorization_request`;
    };

/** key for authorization service configuration */
const authorizationServiceConfigurationKey =
    (handle: string) => {
        return `${handle}_appauth_authorization_service_configuration`;
    };

/** key in local storage which represents the current authorization request. */
const AUTHORIZATION_REQUEST_HANDLE_KEY = 'appauth_current_authorization_request';
export const AUTHORIZATION_RESPONSE_KEY = 'auth_response';
export class MyAuthorizationRequestHandler extends AuthorizationRequestHandler {
    constructor(
        // use the provided storage backend
        // or initialize local storage with the default storage backend which
        // uses window.localStorage
        private helpers: ErrorDialogService,
        private ionicBrowserView: BrowserProvider,
        public storageBackend: StorageBackend = new LocalStorageBackend(),
        utils = new BasicQueryStringUtils(),
        public locationLike: LocationLike = window.location,
        private defaultCrypto = new DefaultCrypto(),
        ) {

        super(utils, defaultCrypto);
    }

    public async performAuthorizationRequest(configuration: AuthorizationServiceConfiguration,
                                             request: AuthorizationRequest): Promise<any> {

        const handle = this.defaultCrypto.generateRandom(43);
        const codeChallenge = await this.defaultCrypto.deriveChallenge(handle);
        request.extras = {
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        };

        // before you make request, persist all request related data in local storage.
        const persisted = Promise.all([
            this.storageBackend.setItem('code_verifier', handle),
            this.storageBackend.setItem(AUTHORIZATION_REQUEST_HANDLE_KEY, handle),
            this.storageBackend.setItem(authorizationRequestKey(handle), JSON.stringify(request.toJson())),
            this.storageBackend.setItem(authorizationServiceConfigurationKey(handle), JSON.stringify(configuration.toJson())),
        ]);

        await persisted;

        // Build the request
        const url = this.buildRequestUrl(configuration, request);
        this.helpers.appendLog('Starting Browser');
        this.ionicBrowserView.ShowWindow(url);
}

    public async closeBrowserWindow() {
        this.ionicBrowserView.CloseWindow();
    }

    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse> {

        const handle = await this.storageBackend.getItem(AUTHORIZATION_REQUEST_HANDLE_KEY);

        if (!handle) {
            // Some error
            return null;
        }

        const authRequestKey = await this.storageBackend.getItem(authorizationRequestKey(handle));
        const json = await JSON.parse(authRequestKey);
        const request = await new AuthorizationRequest(json);

        const response = await this.storageBackend.getItem(AUTHORIZATION_RESPONSE_KEY);
        const parts = response.split('://cb');
        if (parts.length !== 2) {
            throw new Error('Invalid auth repsonse string');
        }

        // Get the info from the calback URL
        const hash = parts[1];
        const queryParams = this.utils.parseQueryString(hash);
        const state: string | undefined = queryParams.state;
        const code: string | undefined = queryParams.code;
        const error: string | undefined = queryParams.error;

        let authorizationResponse: AuthorizationResponse = null;
        let authorizationError: AuthorizationError = null;

        if (error) {
            const errorDescription = queryParams.error_description;
            authorizationError =
                new AuthorizationError({error, error_description: errorDescription, error_uri: undefined, state});
        } else {
            authorizationResponse = new AuthorizationResponse({code, state});
        }

        const tasks = new Array<Promise<any>>();
        {
            this.storageBackend.removeItem(AUTHORIZATION_REQUEST_HANDLE_KEY),
            this.storageBackend.removeItem(authorizationRequestKey(handle)),
            this.storageBackend.removeItem(authorizationServiceConfigurationKey(handle));
        }

        await Promise.all(tasks);
        this.helpers.appendLog('Completed Auth Request');
        return {
            request,
            response: authorizationResponse,
            error: authorizationError
        } as AuthorizationRequestResponse;
    }
}
