import { TypedEvent } from "@node-projects/base-custom-webcomponent";
import { IIobrokerWebuiBinding } from "../interfaces/IIobrokerWebuiBinding.js";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
import { PropertiesHelper } from "@node-projects/web-component-designer/dist/elements/services/propertiesService/services/PropertiesHelper.js";
import { BindingTarget } from "@node-projects/web-component-designer/dist/elements/item/BindingTarget.js";

//;,[ are not allowed in bindings, so they could be used for a short form...

export const bindingPrefixProperty = 'bind-prop:';
export const bindingPrefixAttribute = 'bind-attr:';
export const bindingPrefixClass = 'bind-class:';
export const bindingPrefixCss = 'bind-css:';
export const bindingPrefixCssVar = 'bind-cssvar:';
export const bindingPrefixContent = 'bind-content:';

export type namedBinding = [name: string, binding: IIobrokerWebuiBinding];

export class IndirectSignal {
    private parts: string[];
    private signals: string[];
    private values: string[];
    private unsubscribeList: ((id: string, value: any) => void)[] = [];
    private unsubscribeTargetValue: ((id: string, value: any) => void);
    private combinedName: string;
    private disposed: boolean;
    private valueChangedCb: (value: any) => void

    constructor(id: string, valueChangedCb: (value: any) => void) {
        this.valueChangedCb = valueChangedCb;
        this.parseIndirectBinding(id);
        this.values = new Array(this.signals.length);
        for (let i = 0; i < this.signals.length; i++) {
            let cb = (id: string, value: any) => this.handleValueChanged(value.val, i);
            this.unsubscribeList.push(cb);
            iobrokerHandler.connection.subscribeState(this.signals[i], cb);
        }
    }

    private parseIndirectBinding(id: string) {
        let parts: string[] = [];
        let signals: string[] = [];
        let tx = '';
        for (let n = 0; n < id.length; n++) {
            if (id[n] == '{') {
                parts.push(tx);
                tx = '';
            } else if (id[n] == '}') {
                signals.push(tx);
                tx = '';
            } else {
                tx += id[n];
            }
        }
        parts.push(tx);
        this.parts = parts;
        this.signals = signals;
    }

    handleValueChanged(value: any, index: number) {
        this.values[index] = value;
        let nm = this.parts[0];
        for (let i = 0; i < this.parts.length - 1; i++) {
            let v = this.values[i];
            if (v == null)
                return;
            nm += v + this.parts[i + 1];
        }
        if (this.combinedName != nm) {
            if (this.unsubscribeTargetValue) {
                iobrokerHandler.connection.unsubscribeState(this.combinedName, this.unsubscribeTargetValue);
            }
            if (!this.disposed) {
                this.combinedName = nm;
                let cb = (id: string, value: any) => this.valueChangedCb(value);
                this.unsubscribeTargetValue = cb;
                iobrokerHandler.connection.subscribeState(nm, cb);
            }
        }
    }

    dispose() {
        this.disposed = true;
        if (this.unsubscribeTargetValue) {
            iobrokerHandler.connection.unsubscribeState(this.combinedName, this.unsubscribeTargetValue);
            this.unsubscribeTargetValue = null;
        }
        for (let i = 0; i < this.signals.length; i++) {
            iobrokerHandler.connection.unsubscribeState(this.signals[i], this.unsubscribeList[i]);
        }
    }

    setState(value) {
        if (!this.disposed) {
            iobrokerHandler.connection.setState(this.combinedName, value);
        }
    }
}

export class IobrokerWebuiBindingsHelper {
    static parseBinding(element: Element, name: string, value: string, bindingTarget: BindingTarget, prefix: string): namedBinding {
        let propname = name.substring(prefix.length);
        if (bindingTarget === BindingTarget.cssvar)
            propname = '--' + propname;
        if (!value.startsWith('{')) {
            let binding: IIobrokerWebuiBinding = {
                signal: value,
                target: bindingTarget
            }

            if (value.startsWith('=')) {
                value = value.substring(1);
                binding.signal = value;
                binding.twoWay = true;
                if (element instanceof HTMLInputElement)
                    binding.events = ['change'];
                else if (element instanceof HTMLSelectElement)
                    binding.events = ['change'];
                else
                    binding.events = [propname + '-changed'];
            }

            if (value.startsWith('!')) {
                binding.signal = value.substring(1);
                binding.inverted = true;
            }
            if (bindingTarget === BindingTarget.cssvar || bindingTarget === BindingTarget.class)
                return [IobrokerWebuiBindingsHelper.dotToCamelCase(propname), binding];
            return [PropertiesHelper.dashToCamelCase(propname), binding];
        }

        let binding: IIobrokerWebuiBinding = JSON.parse(value);
        binding.target = bindingTarget;

        if (binding.twoWay && (binding.events == null || binding.events.length == 0)) {
            if (element instanceof HTMLInputElement)
                binding.events = ['change'];
            else if (element instanceof HTMLSelectElement)
                binding.events = ['change'];
            else
                binding.events = [propname + '-changed'];
        }
        return [PropertiesHelper.dashToCamelCase(propname), binding];
    }

    static serializeBinding(element: Element, targetName: string, binding: IIobrokerWebuiBinding): [name: string, value: string] {
        if (binding.target == BindingTarget.property &&
            !binding.expression && !binding.expressionTwoWay &&
            binding.converter == null &&
            !binding.type &&
            !binding.historic &&
            (binding.events == null || binding.events.length == 0)) {
            if (targetName == 'textContent')
                return [bindingPrefixContent + 'text', (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
            if (targetName == 'innerHTML')
                return [bindingPrefixContent + 'html', (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
            return [bindingPrefixProperty + PropertiesHelper.camelToDashCase(targetName), (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
        }

        if (binding.target == BindingTarget.attribute &&
            !binding.expression && !binding.expressionTwoWay &&
            binding.converter == null &&
            !binding.type &&
            !binding.historic &&
            (binding.events == null || binding.events.length == 0)) {
            return [bindingPrefixAttribute + PropertiesHelper.camelToDashCase(targetName), (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
        }

        if (binding.target == BindingTarget.class &&
            !binding.expression && !binding.expressionTwoWay &&
            binding.converter == null &&
            !binding.type &&
            !binding.historic &&
            (binding.events == null || binding.events.length == 0)) {
            return [bindingPrefixClass + PropertiesHelper.camelToDashCase(targetName), (binding.inverted ? '!' : '') + binding.signal];
        }

        if (binding.target == BindingTarget.css &&
            !binding.expression && !binding.expressionTwoWay &&
            binding.converter == null &&
            !binding.type &&
            !binding.historic &&
            (binding.events == null || binding.events.length == 0)) {
            return [bindingPrefixCss + PropertiesHelper.camelToDashCase(targetName), (binding.inverted ? '!' : '') + binding.signal];
        }

        if (binding.target == BindingTarget.cssvar &&
            !binding.expression && !binding.expressionTwoWay &&
            binding.converter == null &&
            !binding.type &&
            !binding.historic &&
            (binding.events == null || binding.events.length == 0)) {
            return [bindingPrefixCssVar + IobrokerWebuiBindingsHelper.camelToDotCase(targetName.substring(2)), (binding.inverted ? '!' : '') + binding.signal];
        }

        let bindingCopy = { ...binding };
        if (!binding.twoWay) {
            delete bindingCopy.events;
            delete bindingCopy.expressionTwoWay;
        } else if ((binding.events != null && binding.events.length == 1)) {
            if (element instanceof HTMLInputElement && binding.events?.[0] == "change")
                delete bindingCopy.events;
            else if (element instanceof HTMLSelectElement && binding.events?.[0] == "change")
                delete bindingCopy.events;
            else if (binding.events?.[0] == targetName + '-changed')
                delete bindingCopy.events;
        }
        if (binding.inverted === null || binding.inverted === false) {
            delete bindingCopy.inverted;
        }
        if (binding.expression === null || binding.expression === '') {
            delete bindingCopy.expression;
        }
        if (binding.expressionTwoWay === null || binding.expressionTwoWay === '') {
            delete bindingCopy.expressionTwoWay;
        }
        if (binding.twoWay === null || binding.twoWay === false) {
            delete bindingCopy.twoWay;
        }
        if (binding.type === null || binding.type === '') {
            delete bindingCopy.type;
        }
        delete bindingCopy.target;

        if (binding.target == BindingTarget.content)
            return [bindingPrefixContent + 'html', JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.attribute)
            return [bindingPrefixAttribute + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.class)
            return [bindingPrefixClass + IobrokerWebuiBindingsHelper.camelToDotCase(targetName), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.css)
            return [bindingPrefixCss + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.cssvar)
            return [bindingPrefixCssVar + IobrokerWebuiBindingsHelper.camelToDotCase(targetName.substring(2)), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.property && targetName == 'innerHTML')
            return [bindingPrefixContent + 'html', JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.property && targetName == 'textContent')
            return [bindingPrefixContent + 'text', JSON.stringify(bindingCopy)];
        return [bindingPrefixProperty + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
    }

    static getBindingAttributeName(element: Element, propertyName: string, propertyTarget: BindingTarget) {
        if (propertyTarget == BindingTarget.attribute) {
            return bindingPrefixAttribute + PropertiesHelper.camelToDashCase(propertyName);
        }
        if (propertyTarget == BindingTarget.class) {
            return bindingPrefixClass + IobrokerWebuiBindingsHelper.camelToDotCase(propertyName);
        }
        if (propertyTarget == BindingTarget.css) {
            return bindingPrefixCss + PropertiesHelper.camelToDashCase(propertyName);
        }
        if (propertyTarget == BindingTarget.cssvar) {
            return bindingPrefixCssVar + IobrokerWebuiBindingsHelper.camelToDotCase(propertyName);
        }
        if (propertyTarget == BindingTarget.property && propertyName == 'innerHTML') {
            return bindingPrefixContent + 'html';
        }
        if (propertyTarget == BindingTarget.property && propertyName == 'textContent') {
            return bindingPrefixContent + 'text';
        }
        return bindingPrefixProperty + PropertiesHelper.camelToDashCase(propertyName);
    }

    static * getBindings(element: Element) {
        if (element.attributes) {
            for (let a of element.attributes) {
                if (a.name.startsWith(bindingPrefixProperty)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.property, bindingPrefixProperty);
                }
                else if (a.name.startsWith(bindingPrefixContent)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name === 'bind-content:html' ? 'bind-prop:inner-h-t-m-l' : 'bind-prop:text-content', a.value, BindingTarget.property, bindingPrefixProperty);
                }
                else if (a.name.startsWith(bindingPrefixAttribute)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.attribute, bindingPrefixAttribute);
                }
                else if (a.name.startsWith(bindingPrefixClass)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.class, bindingPrefixClass);
                }
                else if (a.name.startsWith(bindingPrefixCss)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.css, bindingPrefixCss);
                }
                else if (a.name.startsWith(bindingPrefixCssVar)) {
                    yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.cssvar, bindingPrefixCssVar);
                }
            }
        }
    }

    static applyAllBindings(rootElement: ParentNode, relativeSignalPath: string, root: HTMLElement): (() => void)[] {
        let retVal: (() => void)[] = [];
        const tw = document.createTreeWalker(rootElement, NodeFilter.SHOW_ELEMENT);
        let e: Element;
        while (e = <Element>tw.nextNode()) {
            const bindings = this.getBindings(e);
            for (let b of bindings) {
                try {
                    retVal.push(this.applyBinding(e, b, relativeSignalPath, root));
                } catch (err) {
                    console.error("error applying binding", e, b, err)
                }
            }
        }
        return retVal;
    }

    static applyBinding(element: Element, binding: namedBinding, relativeSignalPath: string, root: HTMLElement): () => void {
        const signals = binding[1].signal.split(';');
        for (let i = 0; i < signals.length; i++) {
            if (signals[i][0] === '?') { //access object path in property in custom control, todo: bind direct to property value in local property
                if (root) { //root is null when opened in designer, then do not apply property bindings
                    let s = signals[i].substring(1);
                    if (s[0] == '?') {
                        signals[i] = s;
                    } else {
                        signals[i] = root[s];
                    }
                }
            }
            if (signals[i][0] === '.') {
                signals[i] = relativeSignalPath + signals[i];
            }
        }
        let unsubscribeList: [id: string, ((id: string, value: any) => void)][] = [];
        let cleanupCalls: (() => void)[];

        let valuesObject = new Array(signals.length);
        for (let i = 0; i < signals.length; i++) {
            const s = signals[i];
            if (s[0] == '?') {
                if (root) {
                    const nm = s.substring(1);
                    let evtCallback = () => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, root[nm], valuesObject, i);
                    root.addEventListener(PropertiesHelper.camelToDashCase(nm) + '-changed', evtCallback);
                    if (!cleanupCalls)
                        cleanupCalls = [];
                    cleanupCalls.push(() => root.removeEventListener(PropertiesHelper.camelToDashCase(nm) + '-changed', evtCallback));
                    IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, root[nm], valuesObject, i);
                }
            } else {
                if (s.includes('{')) {
                    let indirectSignal = new IndirectSignal(s, (value) => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, value.val, valuesObject, i));
                    if (!cleanupCalls)
                        cleanupCalls = [];
                    cleanupCalls.push(() => indirectSignal.dispose());
                    if (binding[1].twoWay) {
                        for (let e of binding[1].events) {
                            const evt = element[e];
                            if (binding[1].expressionTwoWay) {
                                if (!binding[1].compiledExpressionTwoWay) {
                                    if (binding[1].expressionTwoWay.includes('return '))
                                        binding[1].compiledExpressionTwoWay = new Function(<any>['value'], binding[1].expressionTwoWay);
                                    else
                                        binding[1].compiledExpressionTwoWay = new Function(<any>['value'], 'return ' + binding[1].expressionTwoWay);
                                }
                            }

                            if (evt instanceof TypedEvent) {
                                evt.on(() => {
                                    let v = element[binding[0]];
                                    if (binding[1].compiledExpressionTwoWay)
                                        v = binding[1].compiledExpressionTwoWay(v);
                                    if (binding[1].target == BindingTarget.property)
                                        indirectSignal.setState(v);
                                })
                            } else {
                                element.addEventListener(e, () => {
                                    let v = element[binding[0]];
                                    if (binding[1].compiledExpressionTwoWay)
                                        v = binding[1].compiledExpressionTwoWay(v);
                                    if (binding[1].target == BindingTarget.property)
                                        indirectSignal.setState(v);
                                });
                            }
                        }
                    }
                } else {
                    if (binding[1].historic) {
                        if (binding[1].historic.reloadInterval) {
                            let myTimer = { timerId: <any>-1 };
                            async function loadHistoric() {
                                const res = await iobrokerHandler.connection.getHistoryEx(s, binding[1].historic);
                                IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, res?.values, valuesObject, i);
                                if (myTimer.timerId !== null)
                                    myTimer.timerId = setTimeout(loadHistoric, binding[1].historic.reloadInterval);
                            }
                            loadHistoric();
                            if (!cleanupCalls)
                                cleanupCalls = [];
                            cleanupCalls.push(() => {
                                if (myTimer.timerId > 0)
                                    clearTimeout(myTimer.timerId);
                                myTimer.timerId = null;
                            });
                        } else
                            iobrokerHandler.connection.getHistoryEx(s, binding[1].historic).then(x => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, x?.values, valuesObject, i))
                    } else {
                        const cb = (id: string, value: any) => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, value.val, valuesObject, i);
                        unsubscribeList.push([s, cb]);
                        iobrokerHandler.connection.subscribeState(s, cb);
                        iobrokerHandler.connection.getState(s).then(x => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, x?.val, valuesObject, i));
                        if (binding[1].twoWay) {
                            if (binding[1].expressionTwoWay) {
                                if (!binding[1].compiledExpressionTwoWay) {
                                    if (binding[1].expressionTwoWay.includes('return '))
                                        binding[1].compiledExpressionTwoWay = new Function(<any>['value'], binding[1].expressionTwoWay);
                                    else
                                        binding[1].compiledExpressionTwoWay = new Function(<any>['value'], 'return ' + binding[1].expressionTwoWay);
                                }
                            }

                            for (let e of binding[1].events) {
                                const evt = element[e];
                                if (evt instanceof TypedEvent) {
                                    evt.on(() => {
                                        let v = element[binding[0]];
                                        if (binding[1].compiledExpressionTwoWay)
                                            v = binding[1].compiledExpressionTwoWay(v);
                                        if (binding[1].target == BindingTarget.property)
                                            iobrokerHandler.connection.setState(s, v);
                                    })
                                } else {
                                    element.addEventListener(e, () => {
                                        let v = element[binding[0]];
                                        if (binding[1].compiledExpressionTwoWay)
                                            v = binding[1].compiledExpressionTwoWay(v);
                                        if (binding[1].target == BindingTarget.property)
                                            iobrokerHandler.connection.setState(s, v);
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        return () => {
            for (const u of unsubscribeList) {
                iobrokerHandler.connection.unsubscribeState(u[0], u[1]);
            }
            if (cleanupCalls) {
                for (let e of cleanupCalls) {
                    e();
                }
            }
        }
    }

    static handleValueChanged(element: Element, binding: namedBinding, value: any, valuesObject: any[], index: number) {
        let v: (number | boolean | string) = value;

        if (binding[1].type) {
            switch (binding[1].type) {
                case 'number':
                    v = parseFloat(<any>v);
                    break;
                case 'boolean':
                    v = v === true || v === 'true' || !!parseInt(<any>v);
                    break;
                case 'string':
                    v = v.toString();
                    break;
            }
        }
        if (binding[1].expression) {
            valuesObject[index] = value;
            if (!binding[1].compiledExpression) {
                let names: string[] = new Array(valuesObject.length);
                for (let i = 0; i < valuesObject.length; i++) {
                    names[i] = '__' + i;
                }
                if (binding[1].expression.includes('return '))
                    binding[1].compiledExpression = new Function(<any>names, binding[1].expression);
                else
                    binding[1].compiledExpression = new Function(<any>names, 'return ' + binding[1].expression);
            }
            v = binding[1].compiledExpression(...valuesObject);
        }
        if (binding[1].converter) {
            const stringValue = <string>(v != null ? v.toString() : v);
            if (stringValue in binding[1].converter) {
                v = binding[1].converter[stringValue];
            } else {
                for (let c in binding[1].converter) {
                    if (c.length > 2 && c[0] === '>' && c[1] === '=') {
                        const wr = c.substring(2);
                        if (v >= wr) {
                            v = binding[1].converter[c];
                            break;
                        }
                    } else if (c.length > 2 && c[0] === '<' && c[1] === '=') {
                        const wr = c.substring(2);
                        if (v <= wr) {
                            v = binding[1].converter[c];
                            break;
                        }
                    } else if (c.length > 1 && c[0] === '>') {
                        const wr = c.substring(1);
                        if (v > wr) {
                            v = binding[1].converter[c];
                            break;
                        }
                    } else if (c.length > 1 && c[0] === '<') {
                        const wr = c.substring(1);
                        if (v < wr) {
                            v = binding[1].converter[c];
                            break;
                        }
                    } else {
                        const sp = c.split('-');
                        if (sp.length > 1) {
                            if ((sp[0] === '' || v >= sp[0]) && (sp[1] === '' || sp[1] >= v)) {
                                v = binding[1].converter[c];
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (binding[1].inverted)
            v = !v;
        if (binding[1].target == BindingTarget.property)
            element[binding[0]] = v;
        else if (binding[1].target == BindingTarget.attribute)
            element.setAttribute(binding[0], <string>v);
        else if (binding[1].target == BindingTarget.css)
            (<HTMLElement>element).style[binding[0]] = v;
        else if (binding[1].target == BindingTarget.cssvar)
            (<HTMLElement>element).style.setProperty(binding[0], <string>v);
        else if (binding[1].target == BindingTarget.class) {
            if (v)
                (<HTMLElement>element).classList.add(binding[0]);
            else
                (<HTMLElement>element).classList.remove(binding[0]);
        }
    }

    public static camelToDotCase(text: string) {
        return text.replace(/([A-Z])/g, (g) => `.${g[0].toLowerCase()}`);
    }

    public static dotToCamelCase(text: string) {
        return text.replace(/\.([a-z])/g, (i) => i[1].toUpperCase());
    }
}

