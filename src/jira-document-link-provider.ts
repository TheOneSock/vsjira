import {
    CancellationToken,
    DocumentLinkProvider,
    DocumentLink,
    TextDocument,
    Range,
    Uri,
} from 'vscode';
import { URL } from 'url';
import { JiraConfiguration } from './jira-configuration';
import { DataCache } from './data-cache';

export class JiraDocumentLinkProvider implements DocumentLinkProvider {
    private _jiraConfiguration: JiraConfiguration;
    private _dataCache: DataCache;
    constructor(jiraConfiguration: JiraConfiguration, dataCache: DataCache) {
        this._jiraConfiguration = jiraConfiguration
        this._dataCache = dataCache
    }
    public async provideDocumentLinks(document: TextDocument, token: CancellationToken): Promise<DocumentLink[] | null | undefined> {
        if (!this._jiraConfiguration.isConfigured()) {
            return;
        }
        this._dataCache.uri = document.uri;
        this._dataCache.issueLocations = [];

        let result: DocumentLink[] = [];
        const regex = /(:?[A-Z]){3,}-\d+/g;
        for (let i = 0; i < document.lineCount; i++) {
            let text = document.lineAt(i).text;
            let match;
            while ((match = regex.exec(text)) !== null) {
                // skip urls
                let isInUrl = match.index > 0 && text[match.index - 1] === '/';
                let range = new Range(i, match.index, i, match.index + match[0].length);
                let issueId =  match[0];
                this._dataCache.issueLocations.push({isInUrl,range,issueId})

                if (isInUrl) {
                    continue;
                }

                let target = Uri.parse(new URL(`browse/${issueId}`, this._jiraConfiguration.jiraRoot).toString());
                result.push(new DocumentLink(range, target))
            }
        }
        return result;
    }
}