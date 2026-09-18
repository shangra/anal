import { PureComponent } from 'react';

interface IProps {}

interface IState {
    isLoading: number;
}

class Loader<P = {}, S = {}> extends PureComponent<IProps & P, IState & S> {
    private unmounted: boolean = true;

    constructor(props: IProps & P) {
        super(props);
        this.state = {
            isLoading: 1,
        } as IState & S;
        this.startLoading = this.startLoading.bind(this);
        this.stopLoading = this.stopLoading.bind(this);
    }

    componentDidMount() {
        this.unmounted = false;
        this.setState((prev) => ({ isLoading: prev.isLoading - 1 } as IState & S));
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    startLoading(number = 1) {
        if (!this.unmounted) this.setState((prev) => ({ isLoading: prev.isLoading + number } as IState & S));
    }

    stopLoading(number = 1) {
        if (!this.unmounted) this.setState((prev) => ({ isLoading: prev.isLoading - number } as IState & S));
    }
}

export default Loader;
