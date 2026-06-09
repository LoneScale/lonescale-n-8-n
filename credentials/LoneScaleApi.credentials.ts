import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LoneScaleApi implements ICredentialType {
	name = 'loneScaleApi';
	displayName = 'LoneScale API';
	documentationUrl = 'https://docs.lonescale.com';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://public-api.lonescale.com',
			url: '/companies/search',
			qs: { domain: 'stripe.com' },
		},
	};
}
