export interface IControl {
    html: string;
    style: string;
    script: string;
    properties: Record<string, { type: string, values?: string[], default?: any, internal?: boolean }>;
    settings: IControlSettings;

    //neededpackages??
}

export interface IControlSettings {
    width?: string;
    height?: string;
    /**
     * CustomControl does include Global Style in it's shadowroot
     */
    useGlobalStyle?: boolean;
    addoptedStyles?: string[];
    bindToSize?: boolean;
}