import { decode, encode } from 'base64-arraybuffer';

export const pcmToBase64 = (buffer: ArrayBuffer): string => {
    return encode(buffer);
};

export const base64ToPcm = (data: string): ArrayBuffer => {
    return decode(data);
};

export const calculateRMS = (pcmData: ArrayBuffer | Int16Array): number => {
    let sumSquares = 0;
    const samples = pcmData instanceof Int16Array ? pcmData : new Int16Array(pcmData);

    for (let i = 0; i < samples.length; i++) {
        sumSquares += samples[i] * samples[i];
    }

    const meanSquare = sumSquares / samples.length;
    return Math.sqrt(meanSquare);
};
