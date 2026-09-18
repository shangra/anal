import StateManager from 'lite-react-statemanager';
import React from 'react';

import Drawer from '../../Drawer';
import PivotMenu from '../index';
import ServerContext from '../ServerContext';

class MenuIcon extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isMenuOpen: false,
        };

        this.subMenuIconOnOffMenu = this.subMenuIconOnOffMenu.bind(this);
    }

    componentDidMount() {
        StateManager.subscribeState({
            [`MenuIcon`]: {
                [`subMenuIconOnOffMenu`]: this.subMenuIconOnOffMenu,
            },
        });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({
            [`MenuIcon`]: [`subMenuIconOnOffMenu`],
        });
    }

    subMenuIconOnOffMenu(state) {
        const isMenuOpen = state.MenuIcon;
        this.setState({
            isMenuOpen,
        });
    }

    onCloseOffCanvas = () => {
        this.setState({
            isMenuOpen: false,
        });
    };

    render() {
        return (
            <ServerContext.Provider value={this.props.server}>
                <Drawer
                    title="Настройки схемы"
                    open={this.state.isMenuOpen}
                    onOpenChange={this.onCloseOffCanvas}
                    position="right"
                >
                    <PivotMenu
                        onFetchStart={this.props.onFetchStart}
                        onFetchEnd={this.props.onFetchEnd}
                        masterInstance={this.props.masterInstance}
                        isFetching={this.props.isFetching}
                        onChange={this.props.onChange}
                        tableId={this.props.infoserviceId}
                        handleClickGetData={this.props.handleClickGetData}
                        features={this.props.features}
                        pivotParams={this.props.pivotParams}
                        handleSchemaInfo={this.props.handleSchemaInfo}
                    />
                </Drawer>
            </ServerContext.Provider>
        );
    }
}

export { MenuIcon };
