import { Component } from 'react';
import { HandySvg } from 'handy-svg';

/**
 * Вызов в шаблоне
 *
 <Components.Icon className={"svg_basic_accelerator"} style={ {fontSize:"68px", color:"blue" } }/>
 <Components.Icon className={"svg_six"} style={ {fontSize:"68px", fill:"red" } }/>
 <Components.Icon className={"svg_basic_alarm"} style={ {fontSize:"68px", color:"white" } }/>
 <Components.Icon className={"svg_basic_accelerator"} style={ {fontSize:"68px", color:"white" } }/>
 <Components.Icon className={"svg_basic_accelerator"} style={ {fontSize:"34px", color:"white" } }/>
 <Components.Icon className={"svg_basic_accelerator"} style={ {fontSize:"24px", color:"white" } }/>
 <Components.Icon className={"svg_basic_accelerator"} style={ {fontSize:"16px", color:"white" } }/>
 <Components.Icon className={"bi bi-4-circle-fill"} }/>
 <i className="bi bi-4-circle-fill"></i>
 *
 */
class BootstrapIcon extends Component {
    render() {
        return <i {...this.props} className={this.props.className} style={this.props.style} />;
    }
}

export class Icon extends Component {
    getStyleRuleValue(style, selector, sheet) {
        const sheets = typeof sheet !== 'undefined' ? [sheet] : document.styleSheets;
        for (let i = 0, l = sheets.length; i < l; i++) {
            const sheet = sheets[i];
            if (!sheet.cssRules) {
                continue;
            }
            for (let j = 0, k = sheet.cssRules.length; j < k; j++) {
                const rule = sheet.cssRules[j];
                if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) {
                    return rule.style[style];
                }
            }
        }
        return null;
    }

    onFF = (tt) => {
        // console.log('tt', tt);
    };

    render() {
        if (this.props.className.includes('bi ')) {
            return <BootstrapIcon {...this.props} className={this.props.className} style={this.props.style} />;
        }

        let size = 0;
        const fontSize = this.props.style?.fontSize;
        if (fontSize) {
            switch (fontSize) {
                case 'xx-small':
                    size = 9;
                    break;
                case 'x-small':
                    size = 10;
                    break;
                case 'small':
                    size = 13;
                    break;
                case 'medium':
                    size = 16;
                    break;
                case 'large':
                    size = 18;
                    break;
                case 'x-large':
                    size = 24;
                    break;
                case 'xx-large':
                    size = 32;
                    break;
                case 'xxx-large':
                    size = 60;
                    break;
                case 'smaller':
                    size = 12.5;
                    break;
                case 'larger':
                    size = 18;
                    break;
            }
        }

        let width = `16px`;
        let height = `16px`;
        if (size > 0) {
            width = `${size}px`;
            height = `${size}px`;
        } else if (fontSize) {
            width = `${fontSize}`;
            height = `${fontSize}`;
        }

        const style = { ...this.props.style } ?? {};
        delete style.fontSize;
        style.width = width;
        style.height = height;

        let urlFromSelector;
        const attribute = this.getStyleRuleValue('background-image', `.${this.props.className}`);
        if (attribute) {
            const urlRE = /url\("(?<url>.*)"\)/gm;
            const result = [...attribute.matchAll(urlRE)];
            urlFromSelector = result[0].groups.url;
        }

        // {urlFromSelector &&
        // <SVG
        //     cacheRequests={true}
        //     src={urlFromSelector}
        //     width={width}
        //     height={height}
        //     style={style}
        // />}

        return <>{urlFromSelector && <HandySvg src={urlFromSelector} width={width} height={height} style={style} />}</>;
    }
}
