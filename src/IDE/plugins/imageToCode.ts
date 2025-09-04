
import type { Plugin, IDEApi } from '../types';

export const imageToCodePlugin: Plugin = {
    id: 'image-to-code',
    name: 'Image to Code',
    description: 'Generates UI code from an image or sketch.',
    
    activate: (api: IDEApi) => {
        // Command is registered in App.tsx to control modal state
        console.log("Image-to-Code plugin activated (command in App.tsx).");
    },

    deactivate: (api: IDEApi) => {
        // Command unregistering can be added if needed
    },
};
