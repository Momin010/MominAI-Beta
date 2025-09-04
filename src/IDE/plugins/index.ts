
import { wordCountPlugin } from './wordCount';
import { markdownPreviewPlugin } from './markdownPreview';
import { aiDocCommentsPlugin } from './aiDocComments';
import { aiDiagnosticsPlugin } from './aiDiagnostics';
import { codeVisualizerPlugin } from './codeVisualizer';
import { testGeneratorPlugin } from './testGenerator';
import { cssOptimizerPlugin } from './cssOptimizer';
import { regexHelperPlugin } from './regexHelper';
import { codeToDocsPlugin } from './codeToDocs';
import { themeGeneratorPlugin } from './themeGenerator';
import type { Plugin } from '../types';

// New plugins
import { aiCodeMigratorPlugin } from './aiCodeMigrator';
import { collaborationPlugin } from './collaboration';
import { imageToCodePlugin } from './imageToCode';
import { storyboardPlugin } from './storyboard';
import { voiceCommandsPlugin } from './voiceCommands';
import { aiProjectScaffolderPlugin } from './aiProjectScaffolder';
import { dependencyCheckerPlugin } from './dependencyChecker';
import { zenModePlugin } from './zenMode';
import { figmaImporterPlugin } from './figmaImporter';
import { aiCodeReviewPlugin } from './aiCodeReview';
import { liveDeployPlugin } from './liveDeploy';

export const allPlugins: Plugin[] = [
    // Original plugins
    wordCountPlugin,
    markdownPreviewPlugin,
    aiDocCommentsPlugin,
    aiDiagnosticsPlugin,
    codeVisualizerPlugin,
    testGeneratorPlugin,
    cssOptimizerPlugin,
    regexHelperPlugin,
    codeToDocsPlugin,
    themeGeneratorPlugin,

    // 10 new crazy plugins
    aiCodeMigratorPlugin,
    collaborationPlugin,
    imageToCodePlugin,
    storyboardPlugin,
    voiceCommandsPlugin,
    aiProjectScaffolderPlugin,
    dependencyCheckerPlugin,
    zenModePlugin,
    figmaImporterPlugin,
    aiCodeReviewPlugin,
    liveDeployPlugin,
];