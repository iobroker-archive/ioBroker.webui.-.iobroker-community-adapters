import { DomHelper } from "@node-projects/base-custom-webcomponent";
import { IEvent } from "@node-projects/web-component-designer";
import { EventAssignment } from "@node-projects/web-component-designer-visualization-addons";
import { IobrokerWebuiScreenEditor } from "./IobrokerWebuiScreenEditor.js";
import { findExportFunctionDeclarations } from "../helper/EsprimaHelper.js";
import type { FunctionDeclaration } from "esprima-next";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
import scriptCommandsTypeInfo from "../generated/ScriptCommands.json" assert { type: 'json' };
import propertiesTypeInfo from "../generated/Properties.json" assert {type: 'json'};

export class IobrokerWebuiEventAssignment extends EventAssignment {
    constructor() {
        super();
        this.initialize(iobrokerHandler, window.appShell, scriptCommandsTypeInfo, propertiesTypeInfo);
    }

    protected async _editJavascript(e: MouseEvent, eventItem: IEvent) {
        let screenEditor = DomHelper.findParentNodeOfType(this.selectedItems[0].instanceServiceContainer.designerCanvas, IobrokerWebuiScreenEditor);
        let sc = screenEditor.scriptModel.getValue();

        let decl = await findExportFunctionDeclarations(sc);
        if (decl) {
            let jsName = this.selectedItems[0].getAttribute('@' + eventItem.name);
            if (jsName[0] === '{') {
                const parsed = JSON.parse(jsName);
                jsName = parsed.name;
            }
            let funcDecl = decl.find(x => (<FunctionDeclaration>x.declaration).id.name == jsName)
            if (!funcDecl) {
                let templateScript = `/**
           * ${jsName} - '${eventItem.name}' event of ${this.selectedItems[0].id ? '#' + this.selectedItems[0].id + ' (<' + this.selectedItems[0].name + '>)' : '<' + this.selectedItems[0].name + '>'}
           * @param {${eventItem.eventObjectName ?? 'Event'}} event
           * @param {Element} eventRaisingElement
           * @param {ShadowRoot} shadowRoot
           * @param {BaseScreenViewerAndControl} instance
           * @param {Object.<string, *>} parameters
           */
           export function ${jsName}(event, eventRaisingElement, shadowRoot, instance, parameters) {
               
           }
           `;
                if (!sc)
                    screenEditor.scriptModel.setValue(templateScript);
                else {
                    sc += "\n" + templateScript;
                    screenEditor.scriptModel.setValue(sc);
                }
            } else {
                //@ts-ignore
                window.appShell.javascriptEditor.setSelection(funcDecl.loc.start.line, funcDecl.loc.start.column, funcDecl.loc.end.line, funcDecl.loc.end.column + 1);
            }
        }
        window.appShell.activateDockById('javascriptDock');
    }
}

customElements.define("iobroker-webui-event-assignment", IobrokerWebuiEventAssignment);