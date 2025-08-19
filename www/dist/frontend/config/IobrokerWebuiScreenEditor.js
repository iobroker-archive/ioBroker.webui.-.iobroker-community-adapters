import { BaseCustomWebComponentConstructorAppend, css, html } from "@node-projects/base-custom-webcomponent";
import { DocumentContainer, PropertiesHelper, } from "@node-projects/web-component-designer";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
export const defaultNewStyle = `:host {
}

* {
    box-sizing: border-box;
}`;
export class IobrokerWebuiScreenEditor extends BaseCustomWebComponentConstructorAppend {
    _name;
    get name() { return this._name; }
    _type;
    properties;
    _settings;
    scriptModel;
    _configChangedListener;
    documentContainer;
    static template = html ``;
    static style = css ``;
    _webuiBindings;
    _styleBindings;
    _settingsChanged;
    async initialize(name, type, html, style, script, settings, properties, serviceContainer) {
        if (name[0] == '/')
            name = name.substring(1);
        this.title = type + ' - ' + name;
        this._name = name;
        this._type = type;
        this._settings = settings ?? {};
        this.scriptModel = await window.appShell.javascriptEditor.createModel(script ?? '');
        this.properties = properties ? { ...properties } : {};
        this.documentContainer = new DocumentContainer(serviceContainer);
        this.documentContainer.additionalStylesheets = [
            {
                name: "stylesheet.css",
                content: style ?? ''
            }
        ];
        this.documentContainer.instanceServiceContainer.designer = this;
        this.documentContainer.instanceServiceContainer.stylesheetService.stylesheetChanged.on(async (ss) => {
            if (ss.changeSource == 'undo') {
                if (this.bindingsEnabled) {
                    try {
                        const ret = await window.appShell.bindingsHelper.parseCssBindings(model.getValue(), this.documentContainer.designerView.designerCanvas.rootDesignItem.element, this.relativeBindingsPrefix, this.documentContainer.designerView.designerCanvas.rootDesignItem.element);
                        this._styleBindings = ret[1];
                        const sr = this.documentContainer.designerView.designerCanvas.rootDesignItem.element.shadowRoot;
                        sr.adoptedStyleSheets = [...sr.adoptedStyleSheets, ret[0]];
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
            }
        });
        const model = await window.appShell.styleEditor.createModel(this.documentContainer.additionalStylesheets[0].content);
        this.documentContainer.additionalData = { model: model };
        let timer;
        let disableTextChangedEvent = false;
        model.onDidChangeContent((e) => {
            if (!disableTextChangedEvent) {
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(() => {
                    this.documentContainer.additionalStylesheets = [
                        {
                            name: "stylesheet.css",
                            content: model.getValue()
                        }
                    ];
                    timer = null;
                }, 250);
            }
        });
        this.documentContainer.additionalStylesheetChanged.on(() => {
            disableTextChangedEvent = true;
            if (model.getValue() !== this.documentContainer.additionalStylesheets[0].content)
                model.applyEdits([{ range: model.getFullModelRange(), text: this.documentContainer.additionalStylesheets[0].content, forceMoveMarkers: true }]);
            disableTextChangedEvent = false;
        });
        this.documentContainer.additionalStyleString = iobrokerHandler.config?.globalStyle ?? '';
        if (style) {
            try {
                const ret = await window.appShell.bindingsHelper.parseCssBindings(style, this.documentContainer.designerView.designerCanvas.rootDesignItem.element, this.relativeBindingsPrefix, this.documentContainer.designerView.designerCanvas.rootDesignItem.element);
                this._styleBindings = ret[1];
                const sr = this.documentContainer.designerView.designerCanvas.rootDesignItem.element.shadowRoot;
                sr.adoptedStyleSheets = [...sr.adoptedStyleSheets, ret[0]];
            }
            catch (err) {
                console.error(err);
            }
        }
        if (html) {
            this.documentContainer.content = html;
            this.handlePropertyChanges();
        }
        this._configChangedListener = iobrokerHandler.configChanged.on(() => {
            this.documentContainer.additionalStyleString = iobrokerHandler.config?.globalStyle ?? '';
        });
        this.shadowRoot.appendChild(this.documentContainer);
        setTimeout(() => {
            this.applyBindings();
            this.setWidth(this._settings.width);
            this.setHeight(this._settings.height);
            this.documentContainer.designerView.zoomToFit();
            this.documentContainer.designerView.designerCanvas.onContentChanged.on(() => {
                this.applyBindings();
            });
        }, 50);
    }
    //TODO: maybe reload designer, when bindings are disabled???
    #bindingsEnabled = true;
    get bindingsEnabled() {
        return this.#bindingsEnabled;
    }
    set bindingsEnabled(value) {
        if (this.#bindingsEnabled != value) {
            this.#bindingsEnabled == value;
            if (value) {
                this.applyBindings();
            }
            else {
                this.removeBindings();
            }
        }
    }
    relativeBindingsPrefix = '';
    applyBindings() {
        this.removeBindings();
        if (this.bindingsEnabled) {
            try {
                for (let p in this.properties) {
                    Object.defineProperty(this.documentContainer.designerView.designerCanvas.rootDesignItem.element, p, {
                        get() {
                            return this['_' + p];
                        },
                        set(newValue) {
                            if (this['_' + p] !== newValue) {
                                this['_' + p] = newValue;
                                this._bindingsRefresh(p);
                                this.documentContainer.designerView.designerCanvas.rootDesignItem.element.dispatchEvent(new CustomEvent(PropertiesHelper.camelToDashCase(p) + '-changed', { detail: { newValue } }));
                            }
                        },
                        enumerable: true,
                        configurable: true,
                    });
                    if (this.properties[p].default) {
                        this.documentContainer.designerView.designerCanvas.rootDesignItem.element['_' + p] = this.properties[p].default;
                    }
                }
            }
            catch (err) {
                console.warn("applyBindings()", err);
            }
            this._webuiBindings = window.appShell.bindingsHelper.applyAllBindings(this.documentContainer.designerView.designerCanvas.rootDesignItem.element.shadowRoot, this.relativeBindingsPrefix, this.documentContainer.designerView.designerCanvas.rootDesignItem.element);
        }
    }
    removeBindings() {
        this._webuiBindings?.forEach(x => x());
        this._webuiBindings = null;
        this._styleBindings?.forEach(x => x());
        this._styleBindings = null;
    }
    async executeCommand(command) {
        if (command.type == 'save') {
            let html = this.documentContainer.content;
            let style = this.documentContainer.additionalData.model.getValue();
            let script = this.scriptModel.getValue();
            let prp = this.properties;
            if (Object.keys(this.properties).length === 0)
                prp = null;
            if (this._type == 'screen') {
                let screen = { html, style, script, settings: this._settings, properties: prp };
                await iobrokerHandler.saveObject(this._type, this._name, screen);
            }
            else {
                let control = { html, style, script, settings: this._settings, properties: prp };
                await iobrokerHandler.saveObject(this._type, this._name, control);
            }
        }
        else
            this.documentContainer.executeCommand(command);
    }
    canExecuteCommand(command) {
        if (command.type == 'save')
            return true;
        return this.documentContainer.canExecuteCommand(command);
    }
    deactivated() {
        window.appShell.controlpropertiesEditor.setProperties(null);
        window.appShell.settingsEditor.selectedObject = null;
        window.appShell.styleEditor.model = null;
        window.appShell.javascriptEditor.model = null;
        this._settingsChanged?.dispose();
    }
    activated() {
        window.appShell.styleEditor.model = this.documentContainer.additionalData.model;
        window.appShell.javascriptEditor.model = this.scriptModel;
        window.appShell.propertyGrid.instanceServiceContainer = this.documentContainer.instanceServiceContainer;
        window.appShell.treeViewExtended.instanceServiceContainer = this.documentContainer.instanceServiceContainer;
        window.appShell.eventsAssignment.instanceServiceContainer = this.documentContainer.instanceServiceContainer;
        window.appShell.refactorView.instanceServiceContainer = this.documentContainer.instanceServiceContainer;
        window.appShell.controlpropertiesEditor.setProperties(this.properties);
        window.appShell.controlpropertiesEditor.defaultInternal = this._type !== 'control';
        window.appShell.settingsEditor.typeName = this._type == 'control' ? 'IControlSettings' : 'IScreenSettings';
        window.appShell.settingsEditor.selectedObject = this._settings;
        this._settingsChanged = window.appShell.settingsEditor.propertyChanged.on(() => {
            this.handlePropertyChanges();
        });
    }
    setWidth(w) {
        this.documentContainer.designerView.designerWidth = w ?? '100%';
    }
    setHeight(h) {
        this.documentContainer.designerView.designerHeight = h ?? '100%';
    }
    handlePropertyChanges() {
        this.documentContainer.designerView.designerWidth = this._settings.width ?? '';
        this.documentContainer.designerView.designerHeight = this._settings.height ?? '';
    }
    dispose() {
        this.removeBindings();
        this.documentContainer.dispose();
        this._configChangedListener?.dispose();
        this._settingsChanged?.dispose();
        window.appShell.controlpropertiesEditor.setProperties(null);
        window.appShell.settingsEditor.selectedObject = null;
        window.appShell.styleEditor.model = null;
        window.appShell.javascriptEditor.model = null;
    }
}
customElements.define("iobroker-webui-screen-editor", IobrokerWebuiScreenEditor);
