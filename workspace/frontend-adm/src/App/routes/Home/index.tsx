import React from 'react';
import { Link } from 'react-router-dom';

class Home extends React.Component<any> {
    render() {
        return (
            <div className="position-absolute top-50 start-50 translate-middle d-flex flex-column">
                <Link to="/adminpanel">AdminPanel</Link>
            </div>
        );
    }
}

export default Home;
