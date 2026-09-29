import React, { Component } from 'react';
// import FileIcon from './FileIcon/FileIcon';
import $message from './message.helper';

export class ui extends Component {
    constructor(props) {
        super(props);
    }

    message = (content) => {
        $message.show(content);
    };

    render() {
        switch (this.props.object) {
            // case 'MyIcon':
            //     return <MyIcon {...this.props} />;
            // case 'FileIcon':
            //     return <FileIcon {...this.props} />;
        }
        return <div>WRONG UI object</div>;
    }
}
