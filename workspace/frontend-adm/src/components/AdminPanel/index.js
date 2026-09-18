import React from 'react';
import * as Components from 'components/index';
// Инициализация компонент, если убрать может падать фронт
class AdminPanel extends React.Component {
    render() {
        return (
            <div style={{ marginTop: '-60px' }}>
                <div style={{ display: 'flex' }}>
                    <div style={{ width: '20%', minWidth: '300px' }}>
                        <Components.MetadataWindow>
                            <Components.MetadataHier />
                        </Components.MetadataWindow>
                    </div>

                    <Components.InspectorWindow />
                    <Components.FlowdemoWindow />
                    <Components.AccessMatrixDrawer />
                </div>
            </div>
        );
    }
}

export default AdminPanel;
