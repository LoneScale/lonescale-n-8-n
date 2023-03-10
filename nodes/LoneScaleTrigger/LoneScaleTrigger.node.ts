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
import { BASE_URL } from '../utils/constants';
import { lonescaleApiRequest } from '../utils/GenericFunctions';

export class LoneScaleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale Trigger',
		name: 'loneScaleTrigger',
		icon: 'file:../utils/lonescale-logo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Trigger LoneScale Workflow',
		defaults: {
			name: 'LoneScale Trigger',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Workflow Name',
				name: 'workflow',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkflows',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period, n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Select one workflow. Choose from the list',
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
					baseURL: BASE_URL,
					url: '/workflows',
					json: true,
					headers: {
						'X-API-KEY': credentials,
					},
				});
				return (data as Array<{ title: string; id: string }>)?.map((d) => ({
					name: d.title,
					value: d.id,
				}));
			},
		},
	};
}
