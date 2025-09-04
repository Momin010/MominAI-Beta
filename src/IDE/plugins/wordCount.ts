
import React from 'react';
import type { Plugin, IDEApi } from '../types';

const STATUS_BAR_ITEM_ID = 'word-count-status-bar-item';

const WordCountDisplay: React.FC<{api: IDEApi}> = ({ api }) => {
    const [count, setCount] = React.useState(0);

    const updateCount = React.useCallback(() => {
        const content = api.getOpenFileContent();
        const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
        setCount(wordCount);
    }, [api]);
    
    React.useEffect(() => {
       updateCount(); // Initial count
       const activeFileUnsub = api.onActiveFileChanged(updateCount);
       const fileSavedUnsub = api.onFileSaved(updateCount);
       
       return () => {
           activeFileUnsub();
           fileSavedUnsub();
       }
    }, [api, updateCount]);

    return React.createElement('span', null, `Words: ${count}`);
}

export const wordCountPlugin: Plugin = {
    id: 'word-count',
    name: 'Word Count',
    description: 'Displays the word count of the active file in the status bar.',
    
    activate: (api: IDEApi) => {
        const component = React.createElement(WordCountDisplay, { api });
        api.addStatusBarItem({
            id: STATUS_BAR_ITEM_ID,
            component: component,
            priority: 20,
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeStatusBarItem(STATUS_BAR_ITEM_ID);
    },
};
