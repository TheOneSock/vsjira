
import {
    CancellationToken,
    Hover,
    HoverProvider,
    Position,
    TextDocument,
} from 'vscode';
import { JiraConfiguration } from './jira-configuration';
import { JiraRequester } from './jira-requester';


export class JiraHoverProvider implements HoverProvider {
    private _jiraConfiguration: JiraConfiguration;
    private _jiraRequester: JiraRequester;
    constructor(jiraConfiguration: JiraConfiguration, jiraRequester: JiraRequester) {
        this._jiraConfiguration = jiraConfiguration;
        this._jiraRequester = jiraRequester;
    }
    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> {
        if (!this._jiraConfiguration.isConfigured()) {
            return;
        }

        let range = document.getWordRangeAtPosition(position, /(:?[A-Z]){3,}-\d+/g);
        if (!range)
            return;
        let issue = document.getText(range);

        let jiraIssue = await this._jiraRequester.getJiraIssue(issue);

        if (!jiraIssue || !jiraIssue.fields) {
            return null;
        }

        return new Hover(jiraIssue.fields["summary"].toString(), range)
    }
}
