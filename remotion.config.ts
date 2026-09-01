import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setEntryPoint('./src/remotion/index.ts');

// three.js needs a real GL backend in headless Chrome; angle is the supported one.
Config.setChromiumOpenGlRenderer('angle');
