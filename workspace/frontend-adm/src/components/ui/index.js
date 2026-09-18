import { Component } from 'react';
import MyIcon from './MyIcon/MyIcon';
// import FileIcon from './FileIcon/FileIcon';
import $message from 'components/ui/MyFlash/message.helper';

export class ui extends Component {
    constructor(props) {
        super(props);
    }

    message = (content) => {
        $message.show(content);
    };

    render() {
        switch (this.props.object) {
            case 'MyIcon':
                return <MyIcon {...this.props} />;
            // case 'FileIcon':
            //     return <FileIcon {...this.props} />;
            default:
                return <div>WRONG UI object</div>;
        }
    }
}
