import { BaseCustomWebComponentPropertiesService, PropertyType } from "@node-projects/web-component-designer";
import { BaseCustomControl } from "../runtime/CustomControls.js";
export class IobrokerWebuiPropertiesService extends BaseCustomWebComponentPropertiesService {
    isHandledElement(designItem) {
        return designItem.element instanceof BaseCustomControl;
    }
    getProperties(designItem) {
        if (!this.isHandledElement(designItem))
            return null;
        return this.parseProperties(designItem.element.constructor._control);
    }
    parseProperties(control) {
        let properties = [];
        for (const name in control.properties) {
            let prp = control.properties[name];
            if (prp.type === 'string') {
                let property = { name: name, type: "string", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type === 'color') {
                let property = { name: name, type: "color", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type === 'number') {
                let property = { name: name, type: "number", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type === 'date') {
                let property = { name: name, type: "date", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type === 'color') {
                let property = { name: name, type: "color", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type === 'boolean') {
                let property = { name: name, type: "boolean", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else if (prp.type == 'enum') {
                let property = { name: name, type: "list", values: prp.values, service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
            else {
                let property = { name: name, type: "string", service: this, propertyType: PropertyType.propertyAndAttribute };
                properties.push(property);
            }
        }
        return properties;
    }
}