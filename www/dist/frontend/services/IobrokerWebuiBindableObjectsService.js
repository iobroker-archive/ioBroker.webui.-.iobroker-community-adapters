import { BindableObjectType } from "@node-projects/web-component-designer";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
export class IobrokerWebuiBindableObjectsService {
    name = 'iobroker';
    hasObjectsForInstanceServiceContainer(instanceServiceContainer) {
        return true;
    }
    _states;
    async getBindableObject(fullName) {
        let objs = await this.getBindableObjects();
        let parts = fullName.split('.');
        let result = null;
        for (let p of parts) {
            result = objs.find(x => x.name == p);
            objs = result.children;
        }
        return result;
    }
    clearCache() {
        this._states = null;
    }
    async getBindableObjects(parent) {
        if (!this._states) {
            await iobrokerHandler.connection.waitForFirstConnection();
            this._states = await iobrokerHandler.connection.getObjects(true);
        }
        let start = "";
        if (parent)
            start = parent.fullName;
        let set = new Set();
        let retVal = [];
        let folder;
        for (let k of Object.keys(this._states).sort()) {
            if (k.startsWith(start)) {
                const withoutParentName = k.substring(start ? start.length + 1 : 0);
                const splits = withoutParentName.split('.');
                const fldName = splits[0];
                if (splits.length > 1 && !set.has(fldName)) {
                    set.add(fldName);
                    folder = { bindabletype: 'signal', name: fldName, fullName: parent ? parent.fullName + '.' + fldName : fldName, type: BindableObjectType.folder };
                    retVal.push(folder);
                }
                if (splits.length === 1 && splits[0] && (this._states[k].type != 'channel' && this._states[k].type != 'device')) {
                    const signal = { bindabletype: 'signal', name: splits[0], fullName: k, type: BindableObjectType.undefined, originalObject: this._states[k], children: false };
                    retVal.push(signal);
                }
            }
        }
        return retVal;
    }
}
