import { BaseCustomWebComponentConstructorAppend, css, html } from "@node-projects/base-custom-webcomponent";
import { IUiCommand, IUiCommandHandler, sleep } from "@node-projects/web-component-designer";
import type * as monaco from 'monaco-editor';
import { iobrokerHandler } from "../IobrokerHandler.js";

export class IobrokerWebuiStyleEditor extends BaseCustomWebComponentConstructorAppend implements IUiCommandHandler {

    static readonly style = css`
        :host {
            display: block;
            height: 100%;
            width: 100%;
        }

        .errorDecoration {
            background-color: red !important;
        }
    `;

    static readonly template = html`
        <div id="container" style="width: 100%; height: 100%; position: absolute;"></div>
    `;

    public async createModel(text: string) {
        await IobrokerWebuiStyleEditor.initMonacoEditor();
        //@ts-ignore
        return monaco.editor.createModel(text, 'css');
    }
    private _model: monaco.editor.ITextModel;
    public get model() {
        return this._model;
    }
    public set model(value: monaco.editor.ITextModel) {
        this._model = value;
        if (this._editor)
            this._editor.setModel(value);
    }

    private _errorLine: number;
    public get errorLine() {
        return this._errorLine;
    }
    public set errorLine(value: number) {
        if (this._editor && value >= 0) {
            this._editor.deltaDecorations([], [
                //@ts-ignore
                { range: new monaco.Range(value, 1, value, 1), options: { isWholeLine: true, inlineClassName: 'errorDecoration' } },
            ]);
        }
        this._errorLine = value;
    }

    private _container: HTMLDivElement;
    private _editor: monaco.editor.IStandaloneCodeEditor;
    private static _initalized: boolean;

    constructor() {
        super();
        this._parseAttributesToProperties();
    }

    static initMonacoEditor() {
        return new Promise(async resolve => {
            if (!IobrokerWebuiStyleEditor._initalized) {
                await sleep(500);
                //@ts-ignore
                require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs', 'vs/css': { disabled: true } } });

                //@ts-ignore
                require(['vs/editor/editor.main'], () => {
                    resolve(undefined);
                    IobrokerWebuiStyleEditor._initalized = true;
                });
            } else {
                resolve(undefined);
            }
        });
    }

    async ready() {
        //@ts-ignore
        const style = await import("monaco-editor/min/vs/editor/editor.main.css", { assert: { type: 'css' } });
        //@ts-ignore
        this.shadowRoot.adoptedStyleSheets = [style.default, this.constructor.style];

        this._container = this._getDomElement<HTMLDivElement>('container')

        await IobrokerWebuiStyleEditor.initMonacoEditor();

        //@ts-ignore
        this._editor = monaco.editor.create(this._container, {
            automaticLayout: true,
            language: 'css',
            minimap: {
                size: 'fill'
            },
            fixedOverflowWidgets: true
        });
        if (this._model)
            this._editor.setModel(this._model);
    }

    undo() {
        this._editor.trigger('', 'undo', null)
    }

    redo() {
        this._editor.trigger('', 'redo', null)
    }

    copy() {
        this._editor.trigger('', 'editor.action.clipboardCopyAction', null)
    }

    paste() {
        this._editor.trigger('', 'editor.action.clipboardPasteAction', null)
    }

    cut() {
        this._editor.trigger('', 'editor.action.clipboardCutAction', null)
    }

    delete() {
        this._editor.trigger('', 'editor.action.clipboardDeleteAction', null)
    }

    async executeCommand(command: Omit<IUiCommand, 'type'> & { type: string }) {
        if (command.type == 'save') {
            iobrokerHandler.config.globalStyle = this.model.getValue();
            await iobrokerHandler.saveConfig();
        }
    }

    canExecuteCommand(command: Omit<IUiCommand, 'type'> & { type: string }): boolean {
        if (command.type == 'save')
            return true;
        return false;
    }
}

customElements.define('iobroker-webui-style-editor', IobrokerWebuiStyleEditor);