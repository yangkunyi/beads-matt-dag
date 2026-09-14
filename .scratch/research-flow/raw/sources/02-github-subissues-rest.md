SOURCE-URL: https://docs.github.com/en/rest/issues/sub-issues
FETCHED: 2026-09-14T17:12:00.105900+08:00
HTTP: 200
NOTE: HTML converted to text by 02 ft.sh (tags stripped); structure approximated.

 Skip to main content
 GitHub Docs Version: Free, Pro, & Team
 Search or ask Copilot Search or ask Copilot

 Select language: current language is English

 Search or ask Copilot Search or ask Copilot

 Open menu

 Collapse sidebar Expand sidebar
 Scroll breadcrumbs left Home
 REST API
 Issues
 Sub-issues

 Scroll breadcrumbs right

 REST API
 API Version: 2026-03-10 (latest)

 Quickstart

 About the REST API
 About the REST API

 Comparing GitHub's APIs

 API Versions

 Breaking changes

 OpenAPI description

 Using the REST API
 Getting started

 Rate limits

 Pagination

 Libraries

 Best practices

 Troubleshooting

 Timezones

 CORS and JSONP

 Issue event types

 GitHub event types

 Authentication
 Authenticating

 Keeping API credentials secure

 Endpoints for GitHub App installation tokens

 Endpoints for GitHub App user tokens

 Endpoints for fine-grained PATs

 Permissions for GitHub Apps

 Permissions for fine-grained PATs

 Guides
 Script with JavaScript

 Script with Ruby

 Discover resources for a user

 Delivering deployments

 Rendering data as graphs

 Working with comments

 Building a CI server

 Get started - Git database

 Get started - Checks

 Encrypt secrets

 Actions
 Artifacts

 Cache

 Actions concurrency groups

 GitHub-hosted runners

 OIDC

 Permissions

 Secrets

 Self-hosted runner groups

 Self-hosted runners

 Variables

 Workflow jobs

 Workflow runs

 Workflows

 Activity
 Events

 Feeds

 Notifications

 Starring

 Watching

 Agent tasks
 Agent tasks

 Agents
 Secrets

 Variables

 Apps
 GitHub Apps

 Installations

 Marketplace

 OAuth authorizations

 Webhooks

 Billing
 Budgets

 Billing usage

 Branches
 Branches

 Protected branches

 Campaigns
 Security campaigns

 Checks
 Check runs

 Check suites

 Classroom
 Classroom

 Code quality
 Code quality

 Code scanning
 Code scanning

 Code security settings
 Configurations

 Codes of conduct
 Codes of conduct

 Codespaces
 Codespaces

 Organizations

 Organization secrets

 Machines

 Repository secrets

 User secrets

 Collaborators
 Collaborators

 Invitations

 Commits
 Commits

 Commit comments

 Commit statuses

 Copilot
 Cloud agent repository management

 Copilot cloud agent management

 Copilot content exclusion management

 Copilot usage metrics

 Copilot user management

 Copilot Spaces
 Collaborators

 Copilot Spaces

 Resources

 Credentials
 Revocation

 Dependabot
 Alerts

 Repository access

 Secrets

 Dependency graph
 Dependency review

 Dependency submission

 Software bill of materials (SBOM)

 Deploy keys
 Deploy keys

 Deployments
 Deployment branch policies

 Deployments

 Environments

 Protection rules

 Deployment statuses

 Emojis
 Emojis

 Enterprise teams
 Enterprise team members

 Enterprise team organizations

 Enterprise teams

 Gists
 Gists

 Comments

 Git database
 Blobs

 Commits

 References

 Tags

 Trees

 Gitignore
 Gitignore

 Interactions
 Organization

 Repository

 User

 Issues
 Assignees

 Comments

 Events

 Issue dependencies

 Issue field values

 Issues

 Labels

 Milestones

 Sub-issues
 Get parent issue

 Remove sub-issue

 List sub-issues

 Add sub-issue

 Reprioritize sub-issue

 Timeline

 Licenses
 Licenses

 Markdown
 Markdown

 Meta
 Meta

 Metrics
 Community

 Statistics

 Traffic

 Migrations
 Organizations

 Source endpoints

 Users

 Organizations
 API Insights

 Artifact metadata

 Artifact attestations

 Blocking users

 Custom properties

 Issue fields

 Issue types

 Members

 Network configurations

 Organization roles

 Organizations

 Outside collaborators

 Personal access tokens

 Rule suites

 Rules

 Security managers

 Webhooks

 Packages
 Packages

 Pages
 Pages

 Private registries
 Organization configurations

 Projects
 Draft Project items

 Project fields

 Project items

 Projects

 Project views

 Pull requests
 Review comments

 Pull requests

 Review requests

 Reviews

 Stacked pull requests

 Rate limit
 Rate limit

 Reactions
 Reactions

 Releases
 Releases

 Release assets

 Repositories
 Attestations

 Autolinks

 Contents

 Custom properties

 Forks

 Issue types

 Repositories

 Rule suites

 Rules

 Webhooks

 Search
 Search

 Secret scanning
 Custom patterns

 Push protection

 Secret scanning

 Security advisories
 Global security advisories

 Repository security advisories

 Teams
 Members

 Teams

 Users
 Attestations

 Blocking users

 Emails

 Followers

 GPG keys

 Git SSH keys

 Social accounts

 SSH signing keys

 Users

 The REST API is now versioned. For more information, see " About API versioning ."

 REST API endpoints for sub-issues
 Use the REST API to view, add, remove, and reprioritize sub-issues.

 Get parent issue
 You can use the REST API to get the parent issue of a sub-issue.

 This endpoint supports the following custom media types. For more information, see Media types .

 application/vnd.github.raw+json : Returns the raw markdown body. Response will include body . This is the default if you do not pass any specific media type.

 application/vnd.github.text+json : Returns a text only representation of the markdown body. Response will include body_text .

 application/vnd.github.html+json : Returns HTML rendered from the body's markdown. Response will include body_html .

 application/vnd.github.full+json : Returns raw, text, and HTML representations. Response will include body , body_text , and body_html .

 Fine-grained access tokens for "Get parent issue"
 This endpoint works with the following fine-grained token types :
 GitHub App user access tokens
 GitHub App installation access tokens
 Fine-grained personal access tokens
 The fine-grained token must have the following permission set:
 "Issues" repository permissions (read)
 This endpoint can be used without authentication or the aforementioned permissions if only public resources are requested.
 Parameters for "Get parent issue"
 Headers Name, Type, Description
 accept string
 Setting to application/vnd.github+json is recommended.

 Path parameters Name, Type, Description
 owner string Required
 The account owner of the repository. The name is not case sensitive.

 repo string Required
 The name of the repository without the .git extension. The name is not case sensitive.

 issue_number integer Required
 The number that identifies the issue.

 HTTP response status codes for "Get parent issue"
 Status code Description
 200 OK

 301 Moved permanently

 404 Resource not found

 410 Gone

 Code samples for "Get parent issue"
 Request example
 get /repos /{owner} /{repo} /issues /{issue_ number} /parent

 cURL

 JavaScript

 GitHub CLI

 Copy to clipboard curl request example

 curl -L \
 -H "Accept: application/vnd.github+json" \
 -H "Authorization: Bearer <YOUR-TOKEN>" \
 -H "X-GitHub-Api-Version: 2026-03-10" \
 https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/parent

 Response

 Example response

 Response schema

 Status: 200
 {
 "id": 1,
 "node_id": "MDU6SXNzdWUx",
 "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
 "repository_url": "https://api.github.com/repos/octocat/Hello-World",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}",
 "comments_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/comments",
 "events_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/events",
 "html_url": "https://github.com/octocat/Hello-World/issues/1347",
 "number": 1347,
 "state": "open",
 "title": "Found a bug",
 "body": "I'm having a problem with this.",
 "user": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "pinned_comment": null,
 "labels": [
 {
 "id": 208045946,
 "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
 "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
 "name": "bug",
 "description": "Something isn't working",
 "color": "f29513",
 "default": true
 }
 ],
 "assignees": [
 {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 }
 ],
 "milestone": {
 "url": "https://api.github.com/repos/octocat/Hello-World/milestones/1",
 "html_url": "https://github.com/octocat/Hello-World/milestones/v1.0",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/milestones/1/labels",
 "id": 1002604,
 "node_id": "MDk6TWlsZXN0b25lMTAwMjYwNA==",
 "number": 1,
 "state": "open",
 "title": "v1.0",
 "description": "Tracking milestone for version 1.0",
 "creator": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "open_issues": 4,
 "closed_issues": 8,
 "created_at": "2011-04-10T20:09:31Z",
 "updated_at": "2014-03-03T18:58:10Z",
 "closed_at": "2013-02-12T13:22:01Z",
 "due_on": "2012-10-09T23:39:01Z"
 },
 "locked": true,
 "active_lock_reason": "too heated",
 "comments": 0,
 "pull_request": {
 "url": "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
 "html_url": "https://github.com/octocat/Hello-World/pull/1347",
 "diff_url": "https://github.com/octocat/Hello-World/pull/1347.diff",
 "patch_url": "https://github.com/octocat/Hello-World/pull/1347.patch"
 },
 "closed_at": null,
 "created_at": "2011-04-22T13:33:48Z",
 "updated_at": "2011-04-22T13:33:48Z",
 "closed_by": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "author_association": "COLLABORATOR",
 "state_reason": "completed"
}

 Remove sub-issue
 You can use the REST API to remove a sub-issue from an issue.
Removing content too quickly using this endpoint may result in secondary rate limiting.
For more information, see " Rate limits for the API "
and " Best practices for using the REST API ."
This endpoint supports the following custom media types. For more information, see " Media types ."

 application/vnd.github.raw+json : Returns the raw markdown body. Response will include body . This is the default if you do not pass a specific media type.

 application/vnd.github.text+json : Returns a text only representation of the markdown body. Response will include body_text .

 application/vnd.github.html+json : Returns HTML rendered from the body's markdown. Response will include body_html .

 application/vnd.github.full+json : Returns raw, text, and HTML representations. Response will include body , body_text , and body_html .

 Fine-grained access tokens for "Remove sub-issue"
 This endpoint works with the following fine-grained token types :
 GitHub App user access tokens
 GitHub App installation access tokens
 Fine-grained personal access tokens
 The fine-grained token must have the following permission set:
 "Issues" repository permissions (write)
 Parameters for "Remove sub-issue"
 Headers Name, Type, Description
 accept string
 Setting to application/vnd.github+json is recommended.

 Path parameters Name, Type, Description
 owner string Required
 The account owner of the repository. The name is not case sensitive.

 repo string Required
 The name of the repository without the .git extension. The name is not case sensitive.

 issue_number integer Required
 The number that identifies the issue.

 Body parameters Name, Type, Description
 sub_issue_id integer Required
 The id of the sub-issue to remove

 HTTP response status codes for "Remove sub-issue"
 Status code Description
 200 OK

 400 Bad Request

 403 Forbidden

 404 Resource not found

 Code samples for "Remove sub-issue"
 Request example
 delete /repos /{owner} /{repo} /issues /{issue_ number} /sub_ issue

 cURL

 JavaScript

 GitHub CLI

 Copy to clipboard curl request example

 curl -L \
 -X DELETE \
 -H "Accept: application/vnd.github+json" \
 -H "Authorization: Bearer <YOUR-TOKEN>" \
 -H "X-GitHub-Api-Version: 2026-03-10" \
 https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/sub_issue \
 -d '{"sub_issue_id":6}'

 Response

 Example response

 Response schema

 Status: 200
 {
 "id": 1,
 "node_id": "MDU6SXNzdWUx",
 "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
 "repository_url": "https://api.github.com/repos/octocat/Hello-World",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}",
 "comments_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/comments",
 "events_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/events",
 "html_url": "https://github.com/octocat/Hello-World/issues/1347",
 "number": 1347,
 "state": "open",
 "title": "Found a bug",
 "body": "I'm having a problem with this.",
 "user": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "pinned_comment": null,
 "labels": [
 {
 "id": 208045946,
 "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
 "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
 "name": "bug",
 "description": "Something isn't working",
 "color": "f29513",
 "default": true
 }
 ],
 "assignees": [
 {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 }
 ],
 "milestone": {
 "url": "https://api.github.com/repos/octocat/Hello-World/milestones/1",
 "html_url": "https://github.com/octocat/Hello-World/milestones/v1.0",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/milestones/1/labels",
 "id": 1002604,
 "node_id": "MDk6TWlsZXN0b25lMTAwMjYwNA==",
 "number": 1,
 "state": "open",
 "title": "v1.0",
 "description": "Tracking milestone for version 1.0",
 "creator": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "open_issues": 4,
 "closed_issues": 8,
 "created_at": "2011-04-10T20:09:31Z",
 "updated_at": "2014-03-03T18:58:10Z",
 "closed_at": "2013-02-12T13:22:01Z",
 "due_on": "2012-10-09T23:39:01Z"
 },
 "locked": true,
 "active_lock_reason": "too heated",
 "comments": 0,
 "pull_request": {
 "url": "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
 "html_url": "https://github.com/octocat/Hello-World/pull/1347",
 "diff_url": "https://github.com/octocat/Hello-World/pull/1347.diff",
 "patch_url": "https://github.com/octocat/Hello-World/pull/1347.patch"
 },
 "closed_at": null,
 "created_at": "2011-04-22T13:33:48Z",
 "updated_at": "2011-04-22T13:33:48Z",
 "closed_by": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "author_association": "COLLABORATOR",
 "state_reason": "completed"
}

 List sub-issues
 You can use the REST API to list the sub-issues on an issue.

 This endpoint supports the following custom media types. For more information, see Media types .

 application/vnd.github.raw+json : Returns the raw Markdown body. Response will include body . This is the default if you do not pass any specific media type.

 application/vnd.github.text+json : Returns a text only representation of the Markdown body. Response will include body_text .

 application/vnd.github.html+json : Returns HTML rendered from the body's Markdown. Response will include body_html .

 application/vnd.github.full+json : Returns raw, text, and HTML representations. Response will include body , body_text , and body_html .

 Fine-grained access tokens for "List sub-issues"
 This endpoint works with the following fine-grained token types :
 GitHub App user access tokens
 GitHub App installation access tokens
 Fine-grained personal access tokens
 The fine-grained token must have the following permission set:
 "Issues" repository permissions (read)
 This endpoint can be used without authentication or the aforementioned permissions if only public resources are requested.
 Parameters for "List sub-issues"
 Headers Name, Type, Description
 accept string
 Setting to application/vnd.github+json is recommended.

 Path parameters Name, Type, Description
 owner string Required
 The account owner of the repository. The name is not case sensitive.

 repo string Required
 The name of the repository without the .git extension. The name is not case sensitive.

 issue_number integer Required
 The number that identifies the issue.

 Query parameters Name, Type, Description
 per_page integer
 The number of results per page (max 100). For more information, see " Using pagination in the REST API ."

 Default : 30

 page integer
 The page number of the results to fetch. For more information, see " Using pagination in the REST API ."

 Default : 1

 HTTP response status codes for "List sub-issues"
 Status code Description
 200 OK

 404 Resource not found

 410 Gone

 Code samples for "List sub-issues"
 Request example
 get /repos /{owner} /{repo} /issues /{issue_ number} /sub_ issues

 cURL

 JavaScript

 GitHub CLI

 Copy to clipboard curl request example

 curl -L \
 -H "Accept: application/vnd.github+json" \
 -H "Authorization: Bearer <YOUR-TOKEN>" \
 -H "X-GitHub-Api-Version: 2026-03-10" \
 https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/sub_issues

 Response

 Example response

 Response schema

 Status: 200
 [
 {
 "id": 1,
 "node_id": "MDU6SXNzdWUx",
 "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
 "repository_url": "https://api.github.com/repos/octocat/Hello-World",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}",
 "comments_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/comments",
 "events_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/events",
 "html_url": "https://github.com/octocat/Hello-World/issues/1347",
 "number": 1347,
 "state": "open",
 "title": "Found a bug",
 "body": "I'm having a problem with this.",
 "user": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "pinned_comment": null,
 "labels": [
 {
 "id": 208045946,
 "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
 "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
 "name": "bug",
 "description": "Something isn't working",
 "color": "f29513",
 "default": true
 }
 ],
 "assignee": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "assignees": [
 {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 }
 ],
 "milestone": {
 "url": "https://api.github.com/repos/octocat/Hello-World/milestones/1",
 "html_url": "https://github.com/octocat/Hello-World/milestones/v1.0",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/milestones/1/labels",
 "id": 1002604,
 "node_id": "MDk6TWlsZXN0b25lMTAwMjYwNA==",
 "number": 1,
 "state": "open",
 "title": "v1.0",
 "description": "Tracking milestone for version 1.0",
 "creator": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "open_issues": 4,
 "closed_issues": 8,
 "created_at": "2011-04-10T20:09:31Z",
 "updated_at": "2014-03-03T18:58:10Z",
 "closed_at": "2013-02-12T13:22:01Z",
 "due_on": "2012-10-09T23:39:01Z"
 },
 "locked": true,
 "active_lock_reason": "too heated",
 "comments": 0,
 "pull_request": {
 "url": "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
 "html_url": "https://github.com/octocat/Hello-World/pull/1347",
 "diff_url": "https://github.com/octocat/Hello-World/pull/1347.diff",
 "patch_url": "https://github.com/octocat/Hello-World/pull/1347.patch"
 },
 "closed_at": null,
 "created_at": "2011-04-22T13:33:48Z",
 "updated_at": "2011-04-22T13:33:48Z",
 "closed_by": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "author_association": "COLLABORATOR",
 "state_reason": "completed"
 }
]

 Add sub-issue
 You can use the REST API to add sub-issues to issues.

 Creating content too quickly using this endpoint may result in secondary rate limiting.
For more information, see " Rate limits for the API "
and " Best practices for using the REST API ."

 This endpoint supports the following custom media types. For more information, see " Media types ."

 application/vnd.github.raw+json : Returns the raw markdown body. Response will include body . This is the default if you do not pass any specific media type.

 application/vnd.github.text+json : Returns a text only representation of the markdown body. Response will include body_text .

 application/vnd.github.html+json : Returns HTML rendered from the body's markdown. Response will include body_html .

 application/vnd.github.full+json : Returns raw, text, and HTML representations. Response will include body , body_text , and body_html .

 Fine-grained access tokens for "Add sub-issue"
 This endpoint works with the following fine-grained token types :
 GitHub App user access tokens
 GitHub App installation access tokens
 Fine-grained personal access tokens
 The fine-grained token must have the following permission set:
 "Issues" repository permissions (write)
 Parameters for "Add sub-issue"
 Headers Name, Type, Description
 accept string
 Setting to application/vnd.github+json is recommended.

 Path parameters Name, Type, Description
 owner string Required
 The account owner of the repository. The name is not case sensitive.

 repo string Required
 The name of the repository without the .git extension. The name is not case sensitive.

 issue_number integer Required
 The number that identifies the issue.

 Body parameters Name, Type, Description
 sub_issue_id integer Required
 The id of the sub-issue to add. The sub-issue must belong to the same repository owner as the parent issue

 replace_parent boolean
 Option that, when true, instructs the operation to replace the sub-issues current parent issue

 HTTP response status codes for "Add sub-issue"
 Status code Description
 201 Created

 403 Forbidden

 404 Resource not found

 410 Gone

 422 Validation failed, or the endpoint has been spammed.

 Code samples for "Add sub-issue"
 Request example
 post /repos /{owner} /{repo} /issues /{issue_ number} /sub_ issues

 cURL

 JavaScript

 GitHub CLI

 Copy to clipboard curl request example

 curl -L \
 -X POST \
 -H "Accept: application/vnd.github+json" \
 -H "Authorization: Bearer <YOUR-TOKEN>" \
 -H "X-GitHub-Api-Version: 2026-03-10" \
 https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/sub_issues \
 -d '{"sub_issue_id":1}'

 Response

 Example response

 Response schema

 Status: 201
 {
 "id": 1,
 "node_id": "MDU6SXNzdWUx",
 "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
 "repository_url": "https://api.github.com/repos/octocat/Hello-World",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}",
 "comments_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/comments",
 "events_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/events",
 "html_url": "https://github.com/octocat/Hello-World/issues/1347",
 "number": 1347,
 "state": "open",
 "title": "Found a bug",
 "body": "I'm having a problem with this.",
 "user": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "pinned_comment": null,
 "labels": [
 {
 "id": 208045946,
 "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
 "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
 "name": "bug",
 "description": "Something isn't working",
 "color": "f29513",
 "default": true
 }
 ],
 "assignees": [
 {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 }
 ],
 "milestone": {
 "url": "https://api.github.com/repos/octocat/Hello-World/milestones/1",
 "html_url": "https://github.com/octocat/Hello-World/milestones/v1.0",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/milestones/1/labels",
 "id": 1002604,
 "node_id": "MDk6TWlsZXN0b25lMTAwMjYwNA==",
 "number": 1,
 "state": "open",
 "title": "v1.0",
 "description": "Tracking milestone for version 1.0",
 "creator": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "open_issues": 4,
 "closed_issues": 8,
 "created_at": "2011-04-10T20:09:31Z",
 "updated_at": "2014-03-03T18:58:10Z",
 "closed_at": "2013-02-12T13:22:01Z",
 "due_on": "2012-10-09T23:39:01Z"
 },
 "locked": true,
 "active_lock_reason": "too heated",
 "comments": 0,
 "pull_request": {
 "url": "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
 "html_url": "https://github.com/octocat/Hello-World/pull/1347",
 "diff_url": "https://github.com/octocat/Hello-World/pull/1347.diff",
 "patch_url": "https://github.com/octocat/Hello-World/pull/1347.patch"
 },
 "closed_at": null,
 "created_at": "2011-04-22T13:33:48Z",
 "updated_at": "2011-04-22T13:33:48Z",
 "closed_by": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "author_association": "COLLABORATOR",
 "state_reason": "completed"
}

 Reprioritize sub-issue
 You can use the REST API to reprioritize a sub-issue to a different position in the parent list.

 Fine-grained access tokens for "Reprioritize sub-issue"
 This endpoint works with the following fine-grained token types :
 GitHub App user access tokens
 GitHub App installation access tokens
 Fine-grained personal access tokens
 The fine-grained token must have the following permission set:
 "Issues" repository permissions (write)
 Parameters for "Reprioritize sub-issue"
 Headers Name, Type, Description
 accept string
 Setting to application/vnd.github+json is recommended.

 Path parameters Name, Type, Description
 owner string Required
 The account owner of the repository. The name is not case sensitive.

 repo string Required
 The name of the repository without the .git extension. The name is not case sensitive.

 issue_number integer Required
 The number that identifies the issue.

 Body parameters Name, Type, Description
 sub_issue_id integer Required
 The id of the sub-issue to reprioritize

 after_id integer
 The id of the sub-issue to be prioritized after (either positional argument after OR before should be specified).

 before_id integer
 The id of the sub-issue to be prioritized before (either positional argument after OR before should be specified).

 HTTP response status codes for "Reprioritize sub-issue"
 Status code Description
 200 OK

 403 Forbidden

 404 Resource not found

 422 Validation failed, or the endpoint has been spammed.

 503 Service unavailable

 Code samples for "Reprioritize sub-issue"
 Request example
 patch /repos /{owner} /{repo} /issues /{issue_ number} /sub_ issues /priority

 cURL

 JavaScript

 GitHub CLI

 Copy to clipboard curl request example

 curl -L \
 -X PATCH \
 -H "Accept: application/vnd.github+json" \
 -H "Authorization: Bearer <YOUR-TOKEN>" \
 -H "X-GitHub-Api-Version: 2026-03-10" \
 https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/sub_issues/priority \
 -d '{"sub_issue_id":6,"after_id":5}'

 Response

 Example response

 Response schema

 Status: 200
 {
 "id": 1,
 "node_id": "MDU6SXNzdWUx",
 "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
 "repository_url": "https://api.github.com/repos/octocat/Hello-World",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}",
 "comments_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/comments",
 "events_url": "https://api.github.com/repos/octocat/Hello-World/issues/1347/events",
 "html_url": "https://github.com/octocat/Hello-World/issues/1347",
 "number": 1347,
 "state": "open",
 "title": "Found a bug",
 "body": "I'm having a problem with this.",
 "user": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "pinned_comment": null,
 "labels": [
 {
 "id": 208045946,
 "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
 "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
 "name": "bug",
 "description": "Something isn't working",
 "color": "f29513",
 "default": true
 }
 ],
 "assignees": [
 {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 }
 ],
 "milestone": {
 "url": "https://api.github.com/repos/octocat/Hello-World/milestones/1",
 "html_url": "https://github.com/octocat/Hello-World/milestones/v1.0",
 "labels_url": "https://api.github.com/repos/octocat/Hello-World/milestones/1/labels",
 "id": 1002604,
 "node_id": "MDk6TWlsZXN0b25lMTAwMjYwNA==",
 "number": 1,
 "state": "open",
 "title": "v1.0",
 "description": "Tracking milestone for version 1.0",
 "creator": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "open_issues": 4,
 "closed_issues": 8,
 "created_at": "2011-04-10T20:09:31Z",
 "updated_at": "2014-03-03T18:58:10Z",
 "closed_at": "2013-02-12T13:22:01Z",
 "due_on": "2012-10-09T23:39:01Z"
 },
 "locked": true,
 "active_lock_reason": "too heated",
 "comments": 0,
 "pull_request": {
 "url": "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
 "html_url": "https://github.com/octocat/Hello-World/pull/1347",
 "diff_url": "https://github.com/octocat/Hello-World/pull/1347.diff",
 "patch_url": "https://github.com/octocat/Hello-World/pull/1347.patch"
 },
 "closed_at": null,
 "created_at": "2011-04-22T13:33:48Z",
 "updated_at": "2011-04-22T13:33:48Z",
 "closed_by": {
 "login": "octocat",
 "id": 1,
 "node_id": "MDQ6VXNlcjE=",
 "avatar_url": "https://github.com/images/error/octocat_happy.gif",
 "gravatar_id": "",
 "url": "https://api.github.com/users/octocat",
 "html_url": "https://github.com/octocat",
 "followers_url": "https://api.github.com/users/octocat/followers",
 "following_url": "https://api.github.com/users/octocat/following{/other_user}",
 "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
 "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
 "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
 "organizations_url": "https://api.github.com/users/octocat/orgs",
 "repos_url": "https://api.github.com/users/octocat/repos",
 "events_url": "https://api.github.com/users/octocat/events{/privacy}",
 "received_events_url": "https://api.github.com/users/octocat/received_events",
 "type": "User",
 "site_admin": false
 },
 "author_association": "COLLABORATOR",
 "state_reason": "completed"
}

 Back to top

 Help and support
 Was this Doc helpful?
 Yes No

 Help us make GitHub Docs great!
 All Docs are open source. See something that's wrong or unclear? Submit a pull request.
 Make a contribution

 Still need help?
 Ask the GitHub community Contact support Expert services Blog

 GitHub Inc. © 2026 Terms Privacy Status Pricing

