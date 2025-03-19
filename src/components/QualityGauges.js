import React from 'react';
import GaugeComponent from 'react-gauge-component';
import brigtnessIcon from '../assets/icons/brightness.png';
import sharpnessIcon from '../assets/icons/focus.png';
import motionIcon from '../assets/icons/motion-sensor.png';

export function QualityGauges({ qualityScores = {} }) {
    return (
        <div className="-mt-7 flex flex-nowrap justify-center items-center w-full">
            <div className="flex flex-col items-center">
                <GaugeComponent
                    type="semicircle"
                    style={{width: 140}}
                    arc={{
                        width: 0.2,
                        padding: 0,
                        cornerRadius: 1,
                        // gradient: true,
                        subArcs: [
                        {
                            limit: 20,
                            color: '#626262',
                            showTick: false,
                        },
                        {
                            limit: 35,
                            color: '#9C9C9C',
                            showTick: false,
                        },
                        {
                            color: '#D9D9D9',
                        }
                        ]
                    }}
                    pointer={{
                        color: '#343434',
                        length: 0.80,
                        width: 15,
                        // elastic: true,
                    }}
                    labels={{
                        valueLabel: { hide: true },
                        tickLabels: { 
                            hide: true,
                            hideMinMax: true,
                        }
                    }}
                    value={qualityScores.sharpness}
                    minValue={0}
                    maxValue={70}
                />
                <img 
                    src={sharpnessIcon}
                    alt="brightness"
                    className="w-4 h-4 opacity-80 -mt-3"
                />
            </div>
            <div className="flex flex-col items-center">
                <GaugeComponent
                    type="semicircle"
                    style={{width: 140}}
                    arc={{
                        width: 0.2,
                        padding: 0,
                        cornerRadius: 1,
                        // gradient: true,
                        subArcs: [
                        {
                            limit: 25,
                            color: '#626262',
                            showTick: false,
                        },
                        {
                            limit: 35,
                            color: '#9C9C9C',
                            showTick: false,
                        },
                        {
                            limit: 65,
                            color: '#D9D9D9',
                            showTick: false,
                        },
                        {
                            limit: 75, color: '#9C9C9C', 
                            showTick: false,
                        },
                        {
                            color: '#626262',
                        }
                        ]
                    }}
                    pointer={{
                        color: '#343434',
                        length: 0.80,
                        width: 15,
                        // elastic: true,
                    }}
                    labels={{
                        valueLabel: { hide: true },
                        tickLabels: { 
                            hide: true,
                            hideMinMax: true,
                        }
                    }}
                    value={qualityScores.brightnessScore * 100}
                    minValue={0}
                    maxValue={100}
                />
                <img 
                    src={brigtnessIcon}
                    alt="brightness"
                    className="w-5 h-5 opacity-80 -mt-3"
                />
            </div>
            <div className="flex flex-col items-center">
                <GaugeComponent
                    type="semicircle"
                    style={{width: 140}}
                    arc={{
                        width: 0.2,
                        padding: 0,
                        cornerRadius: 1,
                        // gradient: true,
                        subArcs: [
                        {
                            limit: 8,
                            color: '#D9D9D9',
                            showTick: false,
                        },
                        {
                            limit: 15,
                            color: '#9C9C9C',
                            showTick: false,
                        },
                        {
                            color: '#626262',
                        }
                        ]
                    }}
                    pointer={{
                        color: '#343434',
                        length: 0.80,
                        width: 15,
                        // elastic: true,
                    }}
                    labels={{
                        valueLabel: { hide: true },
                        tickLabels: { 
                            hide: true,
                            hideMinMax: true,
                        }
                    }}
                    value={qualityScores.blurScore}
                    minValue={0}
                    maxValue={40}
                />
                <img 
                    src={motionIcon}
                    alt="brightness"
                    className="w-4 h-4 opacity-80 -mt-3"
                />
            </div>
        </div>
    );   
}


export default QualityGauges;