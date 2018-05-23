import {
    workspace,
    window,
    ConfigurationChangeEvent,
    OutputChannel,
    WorkspaceConfiguration,
    ConfigurationTarget,
} from 'vscode';

export class JiraConfiguration {
    public jiraRoot: string | undefined;
    public authToken: string | undefined;
    public channel: OutputChannel;
    private _configuration: WorkspaceConfiguration | undefined;

    constructor() {
        this.channel = window.createOutputChannel("vsjira");
        this.update();
    }

    public update() {
        this._configuration = workspace.getConfiguration('vsjira');
        this.jiraRoot = this._configuration.get<string>('jiraRoot');
        this.authToken = this._configuration.get<string>('base46token');
    }

    public onDidChangeConfiguration(configurationChangedEvent: ConfigurationChangeEvent) {
        if (configurationChangedEvent.affectsConfiguration('vsjira')) {
            this.channel.appendLine("Configuration change detected.");
            this.update();
        }
    }

    public isConfigured(): boolean {
        return !!this.jiraRoot && !!this.authToken;
    }

    public async setupJiraConfig() {
        this.channel.appendLine("Started configuration.");

        if (!this._configuration) {
            return;
        }

        let jiraRoot = await window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'Set jira root url (ex.: https://jira.my-company.com)'
        })

        if (!jiraRoot)
            return;

        this._configuration.update('jiraRoot', jiraRoot, ConfigurationTarget.Global);

        let username = await window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'Set JIRA username'
        })

        if (!username) {
            return false;
        }

        let password = await window.showInputBox({
            ignoreFocusOut: true,
            password: true,
            placeHolder: 'Set JIRA password'
        });

        if (!password) {
            return false;
        }
        if (!this._configuration) {
            return false;
        }
        this._configuration.update('base46token', new Buffer(`${username}:${password}`).toString('base64'), ConfigurationTarget.Global);
        this.channel.appendLine("Configuration Complete.");
        this.update();
        return true;
    }
}