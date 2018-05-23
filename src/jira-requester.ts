import { JiraConfiguration } from "./jira-configuration";
import * as Jira from './jira-issue';
import { URL } from 'url';
import * as Request from 'request';

export class JiraRequester {
    private _jiraConfiguration: JiraConfiguration;
    private _cache: { [id: string]: IssueWithTimeout; };
    constructor(jiraConfiguration: JiraConfiguration) {
        this._jiraConfiguration = jiraConfiguration
        this._cache = {};
    }
    public async getJiraIssue(issue: string): Promise<Jira.Issue | null> {
        if (this._cache[issue] && ((new Date().getTime() - this._cache[issue].time.getTime()) < 30 * 1000)) {
            return this._cache[issue].issue
        }

        let uri = new URL(`/rest/api/2/issue/${issue}`, this._jiraConfiguration.jiraRoot).toString();
        this._jiraConfiguration.channel.appendLine(`Requesting details from ${uri}.`)
        var auth = this._jiraConfiguration.authToken;

        return new Promise<Jira.Issue | null>((resolve) => Request.get(uri, {
            rejectUnauthorized: false,
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            }
        },
            (error, response, body) => {
                if (!error) {
                    if (response.statusCode < 400) {
                        let jiraIssue: Jira.Issue = JSON.parse(body);
                        this._cache[issue] = { time: new Date(), issue: jiraIssue };
                        return jiraIssue;

                    } else {
                        this._jiraConfiguration.channel.appendLine(`Request Error ${JSON.stringify(response)}.`);
                        return null;
                    }
                } else {
                    this._jiraConfiguration.channel.appendLine(`Request Error ${JSON.stringify(error)}.`);
                    return null;
                }
            })).catch((e) => {
                this._jiraConfiguration.channel.appendLine(`Request Error ${JSON.stringify(e)}.`);
                return null;
            })
    }
}

interface IssueWithTimeout {
    time: Date;
    issue: Jira.Issue
}