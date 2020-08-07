import { AuthorizationServiceConfiguration, AuthorizationServiceConfigurationJson } from '@openid/appauth';
import { RequestorProvider, XhrSettings } from '../../providers/requestor/requestor.provider';
import { ErrorDialogService } from 'src/app/services/error-dialog/error-dialog.service';
import { AlertController } from '@ionic/angular';
/**
 * The standard base path for well-known resources on domains.
 * See https://tools.ietf.org/html/rfc5785 for more information.
 */
const WELL_KNOWN_PATH = '.well-known';

/**
 * The standard resource under the well known path at which an OpenID Connect
 * discovery document can be found under an issuer's base URI.
 */
const OPENID_CONFIGURATION = 'openid-configuration';

export class MyAuthorizationServiceConfiguration extends AuthorizationServiceConfiguration {


    public static async fetchFromIssuer(openIdIssuerUrl: string, requestor: RequestorProvider): Promise<AuthorizationServiceConfiguration> {
        const fullUrl = `${openIdIssuerUrl}/${WELL_KNOWN_PATH}/${OPENID_CONFIGURATION}`;

        const xhrSettings = {
            url: fullUrl,
            dataType: 'json',
            method: 'GET',
            headers: {SiteID: 'cecd047e-0665-4007-8c89-478c31a2c812' }
        } as XhrSettings;

        let json;

        try {
            json = await requestor.xhr<AuthorizationServiceConfigurationJson>(xhrSettings);
        } catch (error) {
            console.log('Could not fetch xhr request', error);
            json =   {
                authorization_endpoint: `${openIdIssuerUrl}` + '/connect/authorize',
                token_endpoint: `${openIdIssuerUrl}` + '/connect/token',
                revocation_endpoint: `${openIdIssuerUrl}` + '/connect/revocation',
                userinfo_endpoint: `${openIdIssuerUrl}` + '/connect/userinfo',
                end_session_endpoint: `${openIdIssuerUrl}` + '/connect/endsession'
                };
        }
        return new AuthorizationServiceConfiguration(json);
    }

    public static async fetchManually(openIdIssuerUrl): Promise<AuthorizationServiceConfiguration> {
        const json =   {
            authorization_endpoint: `${openIdIssuerUrl}` + '/connect/authorize',
            token_endpoint: `${openIdIssuerUrl}` + '/connect/token',
            revocation_endpoint: `${openIdIssuerUrl}` + '/connect/revocation',
            userinfo_endpoint: `${openIdIssuerUrl}` + '/connect/userinfo',
            end_session_endpoint: `${openIdIssuerUrl}` + '/connect/endsession'
            };
        return new AuthorizationServiceConfiguration(json);
    }

}
