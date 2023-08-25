import { Connection } from "@iobroker/socket-client";
import { TypedEvent } from "@node-projects/base-custom-webcomponent";
import { IScreen } from "../interfaces/IScreen.js";
import { IWebUiConfig } from "../interfaces/IWebUiConfig.js";
declare global {
    interface Window {
        iobrokerHost: string;
        iobrokerPort: number;
        iobrokerWebRootUrl: string;
        iobrokerWebuiRootUrl: string;
    }
}
declare class IobrokerHandler {
    static instance: IobrokerHandler;
    host: ioBroker.HostObject;
    connection: Connection;
    adapterName: string;
    configPath: string;
    namespace: string;
    namespaceFiles: string;
    namespaceWidgets: string;
    imagePrefix: string;
    config: IWebUiConfig;
    screensChanged: TypedEvent<void>;
    imagesChanged: TypedEvent<void>;
    configChanged: TypedEvent<void>;
    _readyPromises: (() => void)[];
    constructor();
    waitForReady(): Promise<void>;
    init(): Promise<void>;
    private _screenNames;
    private _screens;
    loadAllScreens(): Promise<void>;
    getScreenNames(): Promise<string[]>;
    getScreen(name: string): Promise<IScreen>;
    saveScreen(name: string, screen: IScreen): Promise<void>;
    removeScreen(name: string): Promise<void>;
    getImageNames(): Promise<string[]>;
    saveImage(name: string, imageData: Blob): Promise<void>;
    removeImage(name: string): Promise<void>;
    private _getConfig;
    saveConfig(): Promise<void>;
    private _getObjectFromFile;
    private _saveObjectToFile;
    private _saveBinaryToFile;
    sendCommand(command: 'addNpm' | 'removeNpm' | 'updateNpm', data: string, clientId?: string): Promise<void>;
}
export declare const iobrokerHandler: IobrokerHandler;
export {};
