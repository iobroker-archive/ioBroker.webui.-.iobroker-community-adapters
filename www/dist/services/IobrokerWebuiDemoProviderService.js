import { DomHelper } from "@node-projects/base-custom-webcomponent";
import { ScreenViewer } from "../runtime/ScreenViewer.js";
export class IobrokerWebuiDemoProviderService {
    provideDemo(container, serviceContainer, instanceServiceContainer, code) {
        return new Promise(resolve => {
            const screenViewer = new ScreenViewer();
            screenViewer.style.width = '100%';
            screenViewer.style.height = '100%';
            screenViewer.style.border = 'none';
            screenViewer.style.display = 'none';
            screenViewer.style.overflow = 'auto';
            screenViewer.style.position = 'absolute';
            container.style.position = 'relative';
            DomHelper.removeAllChildnodes(container);
            container.appendChild(screenViewer);
            let documnet = instanceServiceContainer.designer;
            screenViewer.loadScreenData(code, documnet.additionalData.model.getValue());
            screenViewer.style.display = '';
            resolve();
        });
    }
}