import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { lonescaleApiRequest } from '../utils/GenericFunctions';

type Persona = {
	name: string;
	job_titles: string[];
	exclude_job_titles?: string[];
};

const toList = (value: string): string[] =>
	(value || '')
		.split(',')
		.map((v) => v.trim())
		.filter((v) => v.length > 0);

export class LoneScale implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale',
		name: 'loneScale',
		icon: 'file:../utils/lonescale-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Enrich contacts and source contacts from companies with LoneScale',
		defaults: {
			name: 'LoneScale',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'loneScaleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Enrich a contact with email, phone and/or profile data',
						action: 'Enrich a contact',
					},
					{
						name: 'Search Company',
						value: 'companySearch',
						description: 'Look up a company by domain, LinkedIn or name',
						action: 'Search a company',
					},
					{
						name: 'Source Contacts',
						value: 'source',
						description: 'Source contacts from a company matching personas',
						action: 'Source contacts from a company',
					},
				],
				default: 'enrich',
			},

			/* -------------------------------------------------------------------------- */
			/*                                  enrich                                     */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Enrichment Type',
				name: 'enrichmentType',
				type: 'multiOptions',
				required: true,
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Profile', value: 'profile' },
				],
				default: ['email'],
				description: 'Types of enrichment to perform (select at least one)',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact first name',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact last name',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact company name, improves matching accuracy',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				placeholder: 'acme.com',
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact company domain, improves matching accuracy',
			},
			{
				displayName: 'Detect Job Change',
				name: 'detectJobChange',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: false,
				description:
					'Whether to flag if the contact changed company since the input data. Only effective when Enrichment Type includes "Profile".',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Known contact email to improve matching',
					},
					{
						displayName: 'Job Title',
						name: 'jobTitle',
						type: 'string',
						default: '',
					},
					{
						displayName: 'LinkedIn URL',
						name: 'linkedinUrl',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contactId',
						type: 'string',
						default: '',
						description: 'Your CRM record ID, echoed back in the response',
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                                  source                                     */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				placeholder: 'acme.com',
				displayOptions: {
					show: {
						operation: ['source'],
					},
				},
				default: '',
				description:
					'Company domain to source contacts from. Provide at least one of domain, name or LinkedIn URL.',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['source'],
					},
				},
				default: '',
				description: 'Company name to source contacts from',
			},
			{
				displayName: 'Company LinkedIn URL',
				name: 'companyLinkedinUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['source'],
					},
				},
				default: '',
				description: 'Company LinkedIn URL, increases coverage and accuracy by 25%',
			},
			{
				displayName: 'Personas',
				name: 'personas',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['source'],
					},
				},
				default: {},
				placeholder: 'Add Persona',
				options: [
					{
						name: 'persona',
						displayName: 'Persona',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'A label for this persona',
								required: true,
							},
							{
								displayName: 'Job Titles',
								name: 'jobTitles',
								type: 'string',
								default: '',
								placeholder: 'CEO, Head of Sales, VP Marketing',
								description: 'Comma-separated job titles to match',
								required: true,
							},
							{
								displayName: 'Exclude Job Titles',
								name: 'excludeJobTitles',
								type: 'string',
								default: '',
								placeholder: 'Assistant, Intern',
								description: 'Comma-separated job titles to exclude',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['source'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 10,
						description: 'Maximum number of contacts to retrieve (capped at 10)',
					},
					{
						displayName: 'Included Locations',
						name: 'includedLocations',
						type: 'string',
						default: '',
						placeholder: 'US, FR, GB',
						description: 'Comma-separated ISO 3166-1 alpha-2 country codes to include',
					},
					{
						displayName: 'Seniority Levels',
						name: 'seniorityLevels',
						type: 'multiOptions',
						options: [
							{
								name: 'C-Suite',
								value: 'c-suite',
							},
							{
								name: 'Director',
								value: 'director',
							},
							{
								name: 'Entry',
								value: 'entry',
							},
							{
								name: 'Founder',
								value: 'founder',
							},
							{
								name: 'Head',
								value: 'head',
							},
							{
								name: 'Intern',
								value: 'intern',
							},
							{
								name: 'Manager',
								value: 'manager',
							},
							{
								name: 'Owner',
								value: 'owner',
							},
							{
								name: 'Partner',
								value: 'partner',
							},
							{
								name: 'Senior',
								value: 'senior',
							},
							{
								name: 'VP',
								value: 'vp',
							},
						],
						default: [],
						description: 'Filter contacts by seniority level',
					},
					{
						displayName: 'Disable Company Info',
						name: 'disableCompanyInfo',
						type: 'boolean',
						default: false,
						description:
							'Whether to skip enrichment of company information (industry, size, etc.) for each contact',
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                              companySearch                                  */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Company Domain',
				name: 'domain',
				type: 'string',
				placeholder: 'stripe.com',
				displayOptions: {
					show: {
						operation: ['companySearch'],
					},
				},
				default: '',
				description:
					'Company domain to look up. Provide at least one of domain, LinkedIn ID, slug or name.',
			},
			{
				displayName: 'LinkedIn ID',
				name: 'linkedinId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['companySearch'],
					},
				},
				default: '',
				description: 'Numeric LinkedIn company ID (the digits in the linkedin.com/company/ URL)',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['companySearch'],
					},
				},
				default: '',
				description:
					'LinkedIn universal name / slug (the trailing segment in linkedin.com/company/{slug})',
			},
			{
				displayName: 'Company Name',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['companySearch'],
					},
				},
				default: '',
				description:
					'Company name. Best-effort match — prefer domain, LinkedIn ID or slug for a deterministic result.',
			},
			{
				displayName: 'Enrich',
				name: 'enrich',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['companySearch'],
					},
				},
				default: false,
				description:
					'Whether to fall back to on-demand enrichment when no cached match is found, and attach a headcount breakdown when possible',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'enrich') {
					const enrichmentType = this.getNodeParameter('enrichmentType', i) as string[];
					const firstname = this.getNodeParameter('firstname', i) as string;
					const lastname = this.getNodeParameter('lastname', i) as string;
					const companyName = this.getNodeParameter('companyName', i) as string;
					const companyDomain = this.getNodeParameter('companyDomain', i) as string;
					const detectJobChange = this.getNodeParameter('detectJobChange', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const contact: IDataObject = {
						firstname,
						lastname,
						...(companyName ? { company_name: companyName } : {}),
						...(companyDomain ? { domain: companyDomain } : {}),
						...(additionalFields.email ? { email: additionalFields.email } : {}),
						...(additionalFields.jobTitle ? { job_title: additionalFields.jobTitle } : {}),
						...(additionalFields.linkedinUrl ? { linkedin_url: additionalFields.linkedinUrl } : {}),
						...(additionalFields.contactId
							? { custom: { contact_id: additionalFields.contactId } }
							: {}),
					};

					const body: IDataObject = {
						enrichment_type: enrichmentType,
						contacts: [contact],
						...(detectJobChange ? { detect_job_change: true } : {}),
					};

					const response = (await lonescaleApiRequest.call(
						this,
						'POST',
						'/trigger/enrich/sync',
						body,
					)) as { contacts?: IDataObject[] };

					const contacts = response?.contacts ?? [];
					for (const enriched of contacts) {
						returnData.push({ json: enriched, pairedItem: { item: i } });
					}
				}

				if (operation === 'source') {
					const companyDomain = this.getNodeParameter('companyDomain', i) as string;
					const companyName = this.getNodeParameter('companyName', i) as string;
					const companyLinkedinUrl = this.getNodeParameter('companyLinkedinUrl', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const rawPersonas =
						((this.getNodeParameter('personas', i, {}) as IDataObject).persona as IDataObject[]) ??
						[];

					if (!rawPersonas.length) {
						throw new NodeOperationError(this.getNode(), 'At least one persona is required', {
							itemIndex: i,
						});
					}

					const personas: Persona[] = rawPersonas.map((p) => ({
						name: p.name as string,
						job_titles: toList(p.jobTitles as string),
						...(toList(p.excludeJobTitles as string).length
							? { exclude_job_titles: toList(p.excludeJobTitles as string) }
							: {}),
					}));

					const seniorityLevels = (additionalFields.seniorityLevels as string[]) ?? [];
					const includedLocations = toList(additionalFields.includedLocations as string);

					const body: IDataObject = {
						...(companyDomain ? { company_domain: companyDomain } : {}),
						...(companyName ? { company_name: companyName } : {}),
						...(companyLinkedinUrl ? { company_linkedin_url: companyLinkedinUrl } : {}),
						personas,
						...(additionalFields.maxResults ? { limit: additionalFields.maxResults } : {}),
						...(includedLocations.length ? { included_locations: includedLocations } : {}),
						...(seniorityLevels.length ? { seniority_levels: seniorityLevels } : {}),
						...(additionalFields.disableCompanyInfo ? { disable_company_info: true } : {}),
					};

					const response = (await lonescaleApiRequest.call(
						this,
						'POST',
						'/trigger/contact-sourcing/sync',
						body,
					)) as { contacts?: IDataObject[]; profiles_found?: number };

					const contacts = response?.contacts ?? [];
					for (const sourced of contacts) {
						returnData.push({
							json: { ...sourced, profiles_found: response?.profiles_found },
							pairedItem: { item: i },
						});
					}
				}

				if (operation === 'companySearch') {
					const domain = this.getNodeParameter('domain', i) as string;
					const linkedinId = this.getNodeParameter('linkedinId', i) as string;
					const slug = this.getNodeParameter('slug', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const enrich = this.getNodeParameter('enrich', i) as boolean;

					const qs: IDataObject = {
						...(domain ? { domain } : {}),
						...(linkedinId ? { linkedin_id: linkedinId } : {}),
						...(slug ? { slug } : {}),
						...(name ? { name } : {}),
						...(enrich ? { enrich: true } : {}),
					};

					const response = (await lonescaleApiRequest.call(
						this,
						'GET',
						'/companies/search',
						{},
						qs,
					)) as { results?: IDataObject[] };

					const results = response?.results ?? [];
					for (const company of results) {
						returnData.push({ json: company, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}