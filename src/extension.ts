// The module 'vscode' contains the VS Code extensibility API
// Import the necessary extensibility types to use in your code below
import {
    CancellationToken,
    languages,
    ExtensionContext,
    TextDocument,
    Range,
    workspace,
    commands,
    CodeActionProvider,
    CodeActionContext,
    Command,
    CodeAction,
    CodeActionKind,
    WorkspaceEdit
} from 'vscode';
import { JiraConfiguration } from './jira-configuration';
import { JiraHoverProvider } from './jira-hover-provider';
import { JiraDocumentLinkProvider } from './jira-document-link-provider';
import { JiraRequester } from './jira-requester';
import { DataCache } from './data-cache';
import { URL } from 'url';

// This method is called when your extension is activated. Activation is
// controlled by the activation events defined in package.json.
export function activate(context: ExtensionContext) {
    const jiraConfiguration = new JiraConfiguration();
    jiraConfiguration.channel.appendLine("VSJira activation.");

    workspace.onDidChangeConfiguration(jiraConfiguration.onDidChangeConfiguration, null, context.subscriptions)

    if (jiraConfiguration.isConfigured()) {
        registerProviders(context, jiraConfiguration);
    }

    commands.registerCommand('vsjira.configure', () => {
        jiraConfiguration.setupJiraConfig();

        if (jiraConfiguration.isConfigured()) {
            registerProviders(context, jiraConfiguration);
        }
    });
}

function registerProviders(context: ExtensionContext, jiraConfiguration: JiraConfiguration) {
    let requester = new JiraRequester(jiraConfiguration);
    let dataCache = new DataCache();

    let jiraDocumentLinkProviderDisposable = languages.registerDocumentLinkProvider({ language: 'markdown' }, new JiraDocumentLinkProvider(jiraConfiguration, dataCache));
    let jiraHoverProviderDisposable = languages.registerHoverProvider({ language: 'markdown' }, new JiraHoverProvider(jiraConfiguration, requester));
    let jiraCodeActionsProviderDisposable = languages.registerCodeActionsProvider({ language: 'markdown' }, new JiraCodeActionsProvider(jiraConfiguration, requester, dataCache));

    context.subscriptions.push(jiraCodeActionsProviderDisposable);
    context.subscriptions.push(jiraDocumentLinkProviderDisposable);
    context.subscriptions.push(jiraHoverProviderDisposable);
}

class JiraCodeActionsProvider implements CodeActionProvider {
    private _jiraConfiguration: JiraConfiguration;
    private _dataCache: DataCache;
    private _jiraRequester: JiraRequester;
    constructor(jiraConfiguration: JiraConfiguration, jiraRequester: JiraRequester, dataCache: DataCache) {
        this._jiraConfiguration = jiraConfiguration;
        this._dataCache = dataCache;
        this._jiraRequester = jiraRequester;
    }
    public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): Promise<(Command | CodeAction)[] | null | undefined> {
        if (this._dataCache.issueLocations.length === 0 || this._dataCache.uri !== document.uri) {
            return;
        }

        var issueId: string | undefined;
        var issueRange: Range | undefined;
        // consider bisecting
        for (let i = 0; i < this._dataCache.issueLocations.length; i++) {
            const issueLocation = this._dataCache.issueLocations[i];
            if (issueLocation.range.contains(range)) {
                issueId = issueLocation.issueId;
                issueRange = issueLocation.range;
                break;
            }
            if (issueLocation.range.start.isAfter(range.end)) {
                break;
            }
        }
        if (!issueId || !issueRange) {
            return;
        }

        var issue = await this._jiraRequester.getJiraIssue(issueId);
        if (!issue || !issue.fields) {
            return;
        }

        let url = new URL(`browse/${issueId}`, this._jiraConfiguration.jiraRoot).toString();
        let codeAction = new CodeAction("Expand to title and link", CodeActionKind.Refactor);
        codeAction.edit = new WorkspaceEdit();
        codeAction.edit.replace(document.uri, issueRange, `[${issue.fields["summary"]}](${url})`)

        return [codeAction];
    }

}





