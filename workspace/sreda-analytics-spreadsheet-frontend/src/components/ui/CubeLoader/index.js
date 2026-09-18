import { Component } from 'react';

import cubeStyle from './cubeLoader.module.css';

export class CubeLoader extends Component {
    render() {
        return (
            <div className={cubeStyle['cube-body']}>
                <div className={cubeStyle['cube-container']}>
                    <div className={cubeStyle.scene}>
                        <div className={cubeStyle['webpack-cube']}>
                            <div className={cubeStyle['outer-cube']}>
                                <div className={`${cubeStyle.face} ${cubeStyle['face-top']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-bottom']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-left']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-right']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-front']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-back']}`} />
                            </div>
                            <div className={cubeStyle['inner-cube']}>
                                <div className={`${cubeStyle.face} ${cubeStyle['face-top']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-bottom']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-left']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-right']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-front']}`} />
                                <div className={`${cubeStyle.face} ${cubeStyle['face-back']}`} />
                            </div>
                        </div>
                        <div className={cubeStyle['shadows-outer-container']}>
                            <div className={cubeStyle['shadow-outer']} />
                        </div>
                        <div className={cubeStyle['shadows-inner-container']}>
                            <div className={cubeStyle['shadow-inner']} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
