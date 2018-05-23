import { Range, Uri } from "vscode";

export class DataCache {
    public issueLocations: { isInUrl: boolean, range: Range, issueId: string }[] = [];
    public uri: Uri | undefined;
}