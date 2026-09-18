import { Component } from 'react';

import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';
import { findNearestLazyAncestor } from 'components/MetadataHier/lib/service';
import { buildTitleLabels } from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/buildTitle.helper';
import { LocalRef } from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/LocalRef';
import { TreeRef } from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/TreeRef';
import {
    FormGRefData,
    FormGRefMetadataLink,
    FormGRefProps,
    FormGRefState,
    ROOT_ID,
    ObjectMeta,
} from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/types';

/**
 * Общая часть FormGRef: состояние, загрузка ссылок (loadLinks) и диспетчеризация рендера:
 *  - глобальные рефы (data.link.type === 'global') → TreeRef (TreeSelect);
 *  - локальные ссылки → LocalRef (FormGroupList).
 */
export class FormGRef extends Component<FormGRefProps, FormGRefState> {
    private lastLoadTriggerKey: string | null = null;

    constructor(props: FormGRefProps) {
        super(props);

        this.state = {
            metalink: typeof props.value === 'object' ? props.value?.link : props.value ?? ROOT_ID,
            dataInfo: {},
            ...(typeof props.data.link === 'string' && {
                metalink: props.data.link,
            }),
            isGlobal: typeof props.data.link === 'object' && props.data.link.type === 'global',
            uuid: '',
            refLoading: false,
            server: this.props.server ?? '',
        };
    }

    // Для защиты от циклов - componentDidUpdate вызывается только, если изменились пропсы (за исключением data.name, куда записываются результат обработки)
    private getLoadTriggerKey(): string {
        const parentInfoForKey: Record<string, unknown> = { ...(this.props.parentInfo ?? {}) };
        if (this.props.data?.name) {
            delete parentInfoForKey[this.props.data.name];
        }
        return JSON.stringify({
            link: this.props.data?.link,
            parent: this.props.data?.parent,
            useParent: this.props.data?.useParent,
            parentInfo: parentInfoForKey,
        });
    }

    componentDidUpdate(prevProps: FormGRefProps) {
        const triggerKey = this.getLoadTriggerKey();
        if (triggerKey === this.lastLoadTriggerKey) {
            return;
        }
        this.lastLoadTriggerKey = triggerKey;

        if (typeof this.props.data?.link === 'object' && this.props.data?.link?.field && this.props.data.parent) {
            this.loadLinks(this.props.data?.link).finally(() => this.setState({ refLoading: false }));
        } else if (prevProps.data?.link !== this.props.data?.link) {
            this.loadLinks(this.props.data?.link).finally(() => this.setState({ refLoading: false }));
        } else if (prevProps.data?.parent && this.props.data?.parent) {
            const parent = (this.props.data?.parent ?? '').split('.').shift();
            const prevParent = (prevProps.data?.parent ?? '').split('.').shift();
            if (!!prevParent && !!parent && prevProps.formValues[prevParent] !== this.props.formValues[parent]) {
                this.loadLinks(this.props.data?.link).finally(() => this.setState({ refLoading: false }));
            } else if (JSON.stringify(prevProps.parentInfo) !== JSON.stringify(this.props.parentInfo)) {
                this.loadLinks(this.props.data?.link).finally(() => this.setState({ refLoading: false }));
            }
        }
    }

    componentDidMount() {
        if (!this.state.isGlobal) {
            this.setState({ refLoading: true });
        }
        this.loadLinks(this.props.data?.link);
    }

    loadLinks = async (link: FormGRefData['link']) => {
        const { server, data, parentInfo, value, formValues, node, onLoadData } = this.props;
        if (!link) {
            return;
        }
        if (typeof link === 'object' && link?.field && data?.parent) {
            const { field } = link;

            const parentKeys = data.parent.split('.');

            const dataLinks: Record<string, Record<string, string> | string> = {
                0: 'Не выбрано',
            };

            const dataInfo: Record<string, Record<string, FormGRefMetadataLink>> = {
                [data.name]: {},
            };

            let info: Record<string, string | Record<string, string>> = parentInfo as Record<
                string,
                string | Record<string, string>
            >;

            let uuid: string = '';
            for (const key of parentKeys) {
                const value = info?.[key];

                if (value === undefined) {
                    uuid = '';
                    break;
                }

                if (typeof value === 'string') {
                    uuid = value;
                    break;
                }

                info = value;
            }

            if (!uuid && uuid !== this.state.uuid) {
                this.setState({
                    options: dataLinks,
                    dataInfo,
                    uuid,
                    refLoading: false,
                });
                return;
            }

            if (!uuid || uuid === this.state.uuid) {
                return;
            }

            const url = buildUrl(server, `metadata/object/${uuid}/`);
            const metaData: { data: ObjectMeta } = await $api.get(url);
            const thee = (metaData.data.treeObject?.[field?.[0]] as Record<string, { id: string; name: string }>) || {};

            Object.values(thee).forEach((item) => {
                if (!dataLinks?.[uuid]) dataLinks[uuid] = {};
                // @ts-ignore
                dataLinks[uuid][item.id] = item.description || item.name;
                // @ts-ignore
                dataInfo[data.name][item.id] = item;
            });

            this.setState(
                {
                    options: dataLinks,
                    dataInfo,
                    uuid,
                    refLoading: false,
                },
                () => {
                    this.props.onLoadData?.({
                        [data.name]: this.state.dataInfo[data.name][typeof value === 'object' ? value?.value : value],
                    });
                },
            );
        } else {
            const linkRef = typeof link === 'object' ? link.metalink ?? this.state.metalink ?? ROOT_ID : link;

            if (!linkRef) {
                return;
            }

            let parent: string | { value: string } = '';
            const useParent = data?.useParent ?? true;
            if (useParent) {
                const parentLink = data?.parent ?? undefined; // сюда должны сходить что бы пол table info

                if (parentLink) {
                    const routeParent = parentLink.split('.');
                    const parentName = routeParent.shift();
                    if (routeParent.length > 0) {
                        const info = parentInfo[parentName as string] as Record<string, any>;
                        if (info) {
                            let computerdInfo: Record<string, any> = info;
                            for (const rp of routeParent) {
                                const currentInfo = computerdInfo[rp];

                                if (typeof currentInfo === 'string') {
                                    parent = currentInfo;
                                    break;
                                }
                                computerdInfo = currentInfo;
                            }
                        }
                    } else {
                        parent = formValues[parentLink] ?? '';
                    }
                    parent = typeof parent === 'object' ? parent.value : parent;
                    parent = parent === '0' ? '' : parent;
                }
                if (!parent) {
                    parent = findNearestLazyAncestor(this.state.server, node?.nodeKey ?? '')?.id ?? '';
                }
            }

            if ((useParent && parent !== '') || !useParent) {
                const url = buildUrl(server, `metadata/link/${linkRef}/${parent}`);
                $api.get<FormGRefMetadataLink[]>(url).then(async (res) => {
                    const sortedData = res.data.sort((a, b) => {
                        if (a.name < b.name) return -1;
                        if (a.name > b.name) return 1;
                        return 0;
                    });
                    const dataInfo: Record<string, Record<string, FormGRefMetadataLink>> = {
                        [data.name]: {},
                    };
                    const dataLinks: Record<string | number, string | Record<string, string>> = {
                        0: 'Не выбрано',
                    };

                    sortedData.forEach((item: FormGRefMetadataLink) => {
                        if (!dataLinks[item.class_id]) dataLinks[item.class_id] = {};
                        const dataLink = dataLinks[item.class_id] as Record<string, string>;
                        dataLink[item.id] = item.name;
                        dataInfo[data.name][item.id] = { ...item, manifest: JSON.parse(item.manifest) };
                    });

                    const titleLabels = await buildTitleLabels(sortedData, parent, server!);

                    this.setState(
                        {
                            options: dataLinks,
                            dataInfo,
                            refLoading: false,
                            titleLabels,
                        },
                        () => {
                            onLoadData?.({
                                [data.name]: this.state.dataInfo[data.name][typeof value === 'object' ? value?.value : value],
                            });
                        },
                    );
                });
            }
        }
    };

    render() {
        if (this.state.isGlobal) {
            return (
                <TreeRef
                    server={this.props.server}
                    dataName={this.props.data.name}
                    value={this.props.value}
                    disabled={this.props.disabled}
                    description={this.props.data.description}
                    onChange={this.props.onChange}
                />
            );
        }

        return (
            <LocalRef
                data={this.props.data}
                value={this.props.value}
                disabled={this.props.disabled}
                onChange={this.props.onChange}
                options={this.state.options}
                dataInfo={this.state.dataInfo}
                loading={this.state.refLoading}
                titleLabels={this.state.titleLabels}
            />
        );
    }
}
