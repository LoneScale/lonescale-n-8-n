import { IWebhookFunctions } from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class LoneScaleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale Trigger',
		name: 'loneScaleTrigger',
		icon: 'file:lonescale-logo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Trigger LoneScaleWorkflow',
		defaults: {
			name: 'LoneScaleTrigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'loneScaleApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],

		properties: [
			{
				displayName: 'Lonescale Workflow Name or ID',
				name: 'workflow',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkflows',
				},
				default: '',
				description:
					'Select one workflow. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				required: true,
			},
		],
	};
	// The execute method will go here
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return {
			workflowData: [],
		};
	}

	methods = {
		loadOptions: {
			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('loneScaleApi'))?.apiKey;
				const data = await this.helpers.httpRequest({
					method: 'GET',
					baseURL: 'http://localhost:85',
					url: '/workflows',
					json: true,
					headers: {
						'X-API-KEY': credentials,
					},
				});
				return (data as { title: string; id: string }[])?.map((d) => ({
					name: d.title,
					value: d.id,
				}));
			},
		},
	};
}
