import { Component, MouseEventHandler } from 'react'
import StateManager from 'lite-react-statemanager';
import { IconButton } from '../../UIKit/IconButton'
import { FavoriteState, FavoriteProps } from './types'
import { StarOutlineIcon } from '../../UiKitIcons/StarOutlineIcon'
import { withRouter } from '../../HOC/withRouter';
import { StarFillIcon } from '../../UiKitIcons/StarFillIcon';
import { FAVORITES_API } from './utils';
import { FAVORITE_IS_FAVORITE, FAVORITE_IS_NOT_FAVORITE } from './constants';
import { Tooltip } from '../../UIKit/Tooltip';

export class FavoriteClass extends Component<FavoriteProps, FavoriteState> {
    constructor(props: FavoriteProps) {
        super(props);

        const {location} = props;

        this.state = {
            loading: false,
            favorite: props.value ?? false,
            href: props.href ?? location.pathname,
        };
    }

    componentDidMount() {
        if (StateManager.state.user && StateManager.state.user.id) {
            this.getIsFavorite()
        }
    }

    componentDidUpdate(prevProps: FavoriteProps) {
        if ( JSON.stringify(prevProps) !== JSON.stringify(this.props) ) {
            const href = this.props.href ?? this.props.location.pathname;
            const favorite = this.props.value ?? false;

            this.setState({ href, favorite }, () => {
                this.getIsFavorite()
            });
        }
    }

    async getIsFavorite() {
        this.setState({ loading: true });
        const favorite = await FAVORITES_API.getIsFavorite(this.state.href)
        this.setState({ loading: false, favorite: favorite ?? false });
    }

    handleClick: MouseEventHandler<HTMLButtonElement> = async event => {
        this.props.onClick?.(event)

        this.setState({ loading: true });
        const newState = !this.state.favorite;
        await FAVORITES_API.toggleIsFavorite(newState, { link: this.state.href, icon: this.props.iconForFavorite || "", title: this.props.titleForFavorite || "" });
        this.setState({ loading: false, favorite: newState });
    }

    render() {
        return (
        <Tooltip
            content={this.state.favorite ? FAVORITE_IS_FAVORITE :FAVORITE_IS_NOT_FAVORITE}
        >
            <IconButton
                {...this.props}
                loading={this.state.loading}
                onClick={this.handleClick}
                icon={
                    this.state.favorite? StarFillIcon : StarOutlineIcon
                }
                rounded
                variant="outlined"
            />
        </Tooltip>
    )}
}

export const Favorite = withRouter(FavoriteClass);
