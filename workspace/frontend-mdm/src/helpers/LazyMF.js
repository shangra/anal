import React, { Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const RemoteComponent = React.lazy(() => import('../components/Comment'));
// async (remoteComponentName) => {
//     return React.lazy(() => import(remoteComponentName));
// }
console.log('RemoteComponent:', RemoteComponent);

export class LazyMF extends React.Component {
    render() {
        // {this.props.children}
        // React.createElement(remoteComponent(this.props.remoteComponent))
        return (
            <ErrorBoundary>
                <Suspense fallback={<div>Loading...</div>}>
                    <RemoteComponent />
                </Suspense>
            </ErrorBoundary>
        );
    }
}
