import React, { Component } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

// Используется в CMP компонентах для доступа к апи V6 router
// для сохранения доступа к методам класса ComponentCMP
class Getter extends Component {
    componentDidMount() {
        this.buildNavigation();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.setRouter !== this.props.setRouter) {
            this.buildNavigation();
        }
    }

    buildNavigation = () => {
        if (this.props.setRouter) {
            this.props.setRouter({
                location: this.props.location,
                params: this.props.params,
                navigate: this.props.navigate,
                searchParams: this.props.searchParams,
            });
        }
    };

    render() {
        return '';
    }
}

export const withRouter = (Component) => {
    const Wrapper = React.forwardRef((props, ref) => {
        const navigate = useNavigate();
        const location = useLocation();
        const searchParams = useSearchParams();
        const params = useParams();
        return (
            <Component
                ref={ref}
                navigate={navigate}
                location={location}
                searchParams={searchParams}
                params={params}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
            />
        );
    });

    Wrapper.displayName = 'withRouter';
    return Wrapper;
};

export const WithRouterGetter = withRouter(Getter);
