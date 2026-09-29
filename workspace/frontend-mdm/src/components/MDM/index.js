import React from 'react';
import 'ui-kit/style.css';
import * as Components from '../index.js';

import { PageHeader } from '../PageHeader';

import $windows from '../ui/windows.helper';

import { MetadataGuideList } from '../MetadataGuideList';
import { FormMetadata } from '../FormMetadata';
import $api from '../../helpers/axios.jsx';
import { getSelectedEntity } from '../../helpers/selected-entity.helper';

class MDM extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentTabIndex: 0,
            tabs: [],
            data: [],
        };
    }

    componentDidMount() {
        this.getArea();
    }

    getArea() {
        const url = `/metadata/interface/${this.props.interfaceId}`;
        $api.get(url).then((res) => {
            const tabs = res.data.map((element) => {
                return {
                    label: element.description,
                    id: element.id,
                    children: <></>,
                };
            });
            this.setState({ tabs: tabs }, () => {
                this.setActiveTabIndex(0);
            });
        });
    }

    getGroups(groupsId) {
        const url = `/metadata/interface/${groupsId}`;
        $api.get(url).then((res) => {
            const data = res.data.map((element) => {
                return { description: element.description, id: element.id };
            });
            this.setState({ data: data });
        });
    }

    comparator = (a, b) => {
        if (a > b) {
            return 1;
        }
        if (a < b) {
            return -1;
        }
        return 0;
    };

    openFormInSeparateWindow = (formTitle, url, id) => {
        if (url) {
            open(url, '_blank');
        } else {
            const selectedEntity = getSelectedEntity();
            $windows.open(formTitle, <FormMetadata id={id} type='list' selectedEntityTitle={selectedEntity.title} />, {
                uuid: id,
            });
        }
    };

    renderDataList = () => {
        return this.state.data.map((entity) => (
            <MetadataGuideList
                title={entity.description}
                groupsId={entity.id}
                onClick={this.openFormInSeparateWindow}
            />
        ));
    };

    setActiveTabIndex = (index) => {
        this.setState({ currentTabIndex: index }, () => {
            const item = this.state.tabs[index];
            this.getGroups(item.id);
        });
    };

    render() {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: '100%' }}>
                    <PageHeader
                        title={
                            this.props.title ?? 'MDM. Редактирование сущностей'
                        }
                        rootPageId={
                            this.props.rootPageId ??
                            '188e922f-8753-4dcf-811f-8b7faeaf7a79'
                        }
                        tabs={this.state.tabs}
                        currentTab={this.state.currentTabIndex}
                        onSetTab={this.setActiveTabIndex}
                    />
                </div>

                <main
                    style={{
                        width: '67.5%',
                        marginTop: '32px',
                        columnCount: 3,
                        columnWidth: 'auto',
                        gap: '24px',
                    }}
                >
                    {this.renderDataList()}
                </main>
            </div>
        );
    }
}

export default MDM;
