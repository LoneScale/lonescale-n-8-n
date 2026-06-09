![Banner](lonescale-banner.jpeg)
# @lonescale/n8n-nodes-trigger

This is an n8n community node. It lets you use LoneScale in your n8n workflows.

The LoneScale node lets you enrich contacts and source contacts from companies directly from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials) 
[Compatibility](#compatibility)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The **LoneScale** node supports the following operations:

* **Enrich** — enrich a contact (first/last name) with email, phone and/or profile data via `POST /trigger/enrich/sync`. Optionally pass known fields (email, job title, LinkedIn URL, company domain/name, contact ID) and detect job changes.
* **Source Contacts** — source contacts from a company (domain, name or LinkedIn URL) matching one or more personas (job titles, exclusions) via `POST /trigger/contact-sourcing/sync`. Filter by seniority level and country, and cap the number of contacts.
* **Search Company** — look up a company by domain, LinkedIn ID, slug or name via `GET /companies/search`. Optionally enable on-demand enrichment with a headcount breakdown.

Each incoming item triggers one synchronous request, and each returned contact is emitted as its own output item. Both endpoints are rate-limited to 5 requests per minute.

## Credentials

Add ApiKey from your LoneScale [account](https://app.lonescale.com/app/user)

## Compatibility

Tested on v0.208.0

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [loneScale help center](https://help-center.lonescale.com/en/)



