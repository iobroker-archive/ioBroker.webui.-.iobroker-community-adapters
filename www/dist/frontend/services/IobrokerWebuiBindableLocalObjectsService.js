import { BindableObjectType } from "@node-projects/web-component-designer";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
export class IobrokerWebuiBindableLocalObjectsService {
    name = 'locals';
    hasObjectsForInstanceServiceContainer(instanceServiceContainer) {
        return true;
    }
    async getBindableObject(fullName) {
        let objs = (await this.getBindableObjects()).sort();
        let parts = fullName.split('.');
        let result = null;
        for (let p of parts) {
            result = objs.find(x => x.name == p);
            objs = result.children;
        }
        return result;
    }
    clearCache() {
    }
    async getBindableObjects(parent) {
        let names = iobrokerHandler.getLocalStateNames();
        let start = "";
        if (parent)
            start = parent.fullName;
        let set = new Set();
        let retVal = [];
        let folder;
        for (let k of names) {
            if (k.startsWith(start)) {
                const withoutParentName = k.substring(start ? start.length + 1 : 0);
                const splits = withoutParentName.split('.');
                const fldName = splits[0];
                if (splits.length > 1 && !set.has(fldName)) {
                    set.add(fldName);
                    folder = { bindabletype: 'signal', name: fldName, fullName: parent ? parent.fullName + '.' + fldName : fldName, type: BindableObjectType.folder };
                    retVal.push(folder);
                }
                if (splits.length === 1 && splits[0]) {
                    const signal = { bindabletype: 'signal', name: splits[0], fullName: k, type: BindableObjectType.undefined, originalObject: null, children: false };
                    retVal.push(signal);
                }
            }
        }
        return retVal;
    }
}
