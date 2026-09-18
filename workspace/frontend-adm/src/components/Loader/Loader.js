import { PureComponent } from 'react';

class Loader extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: 1,
        };
        this.startLoading = this.startLoading.bind(this);
        this.stopLoading = this.stopLoading.bind(this);
    }

    componentDidMount() {
        this.setState((prev) => ({ isLoading: prev.isLoading - 1 }));
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    startLoading(number = 1) {
        if (!this.unmounted) this.setState((prev) => ({ isLoading: prev.isLoading + number }));
    }

    stopLoading(number = 1) {
        if (!this.unmounted) this.setState((prev) => ({ isLoading: prev.isLoading - number }));
    }
}

export default Loader;
