import { Component } from 'react';

export default class Video extends Component {
    state = {
        html: '',
    };

    componentDidMount() {
        const { src } = this.props;
        const html = `
        <video autoPlay muted loop width="${this.props.width}" height="${this.props.height}">
            <source src=${src} />
        </video>
      `;
        this.setState({ html });
    }

    render() {
        return <div dangerouslySetInnerHTML={{ __html: this.state.html }} />;
    }
}
