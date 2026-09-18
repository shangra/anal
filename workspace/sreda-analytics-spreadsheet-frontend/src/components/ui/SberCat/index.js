import React, { Component } from 'react';

import cubeStyle from './cubeLoader.module.css';
import Video from './Video';

export class SberCat extends Component {
    VIDEOS = [
        '01_thinking.webm',
        '02_selfie.webm',
        '03_cool.webm',
        '04_heart.webm',
        '05_moonwalk.webm',
        '06_laughing.webm',
        '07_sleeping.webm',
        '08_shrek_eyes.webm',
        '09_kissing.webm',
        '10_gift.webm',
        '11_ok.webm',
        '12_HappyJump.webm',
        '13_high_five.webm',
        '14_applause.webm',
        '15_cryman.webm',
        '16_busy.webm',
        '17_facepalm.webm',
        '18_nervous.webm',
        '19_screaming.webm',
        '20_offended.webm',
        '21_popcorn.webm',
        '22_piggi_bank.webm',
    ];

    constructor(props) {
        super(props);

        this.state = {
            videoName: this.getRandomVideo(),
        };
    }

    getRandomVideo() {
        const rnd = Math.floor(Math.random() * 22) + 1;
        return this.VIDEOS[rnd];
    }

    render() {
        const { videoName } = this.state;
        return (
            <div className={cubeStyle['cube-body']}>
                <div className={cubeStyle['cube-container']}>
                    <Video src={`/static/${videoName}`} width="600" height="300" />
                </div>
            </div>
        );
    }
}
