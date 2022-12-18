import { IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { lonescaleApiRequest } from './GenericFunctions';

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

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();

		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const workflowId = this.getNodeParameter('workflow') as string;
				const webhook = await lonescaleApiRequest.call(this, 'GET', `/${workflowId}/hook?type=n8n`);
				if (webhook.target_url === webhookUrl) {
					webhookData.webhookId = webhook.webhook_id;
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const workflowId = this.getNodeParameter('workflow') as string;
				const body: IDataObject = {
					type: 'n8n',
					target_url: webhookUrl,
				};
				const webhook = await lonescaleApiRequest.call(this, 'POST', `/${workflowId}/hook`, body);
				webhookData.webhookId = webhook.webhook_id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await lonescaleApiRequest.call(this, 'DELETE', `/${webhookData.webhookId}/hook?type=n8n`);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

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
